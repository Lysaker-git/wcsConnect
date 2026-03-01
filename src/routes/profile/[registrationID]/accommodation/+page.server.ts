import { supabase } from '$lib/server/supabaseServiceClient';
import { error as svelteError, fail, redirect } from '@sveltejs/kit';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';
import type { PageServerLoad, Actions } from './$types';

const stripe = new Stripe(STRIPE_SECRET_KEY);

export const load: PageServerLoad = async ({ params, cookies, url, locals }) => {
  const db = locals.supabase;
  const { user } = await locals.safeGetSession();
  const { registrationID } = params;

  if (!user) throw redirect(303, '/signin');

  // Fetch participant — must belong to this user and be approved
  const { data: participant, error: pError } = await db
    .from('event_participants')
    .select(`
      id, event_id, user_id, status,
      events (
        id, title, stripe_fee_model, platform_fee_percent,
        accommodation_deposit_percent, accommodation_final_payment_deadline
      )
    `)
    .eq('id', registrationID)
    .eq('user_id', user.id)
    .single();

  if (pError || !participant) throw svelteError(404, 'Registration not found');
  if (participant.status !== 'approved') throw redirect(303, `/profile/${registrationID}`);

  const event = participant.events;

  // Fetch accommodation products for this event
  const { data: rooms } = await supabase
    .from('products')
    .select('*')
    .eq('event_id', participant.event_id)
    .eq('product_type', 'accommodation')
    .eq('is_active', true)
    .order('price', { ascending: true });

  // Fetch existing booking for this registration if any
  const { data: existingBooking } = await supabase
    .from('hotel_bookings')
    .select('*')
    .eq('participant_id', registrationID)
    .maybeSingle();

  return {
    participant,
    event,
    rooms: rooms ?? [],
    existingBooking: existingBooking ?? null
  };
};

export const actions: Actions = {
  book: async ({ request, params, cookies, url, locals }) => {
    const db = locals.supabase;
    const { registrationID } = params;

    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Not authenticated' });

    // Verify participant
    const { data: participant } = await db
      .from('event_participants')
      .select(`
        id, event_id, user_id, status,
        events (
          id, title, stripe_fee_model, platform_fee_percent,
          accommodation_deposit_percent, accommodation_final_payment_deadline
        )
      `)
      .eq('id', registrationID)
      .eq('user_id', user.id)
      .single();

    if (!participant) return fail(404, { message: 'Registration not found' });
    if (participant.status !== 'approved') return fail(400, { message: 'Registration must be approved' });

    // Check no existing booking
    const { data: existingBooking } = await db
      .from('hotel_bookings')
      .select('id')
      .eq('participant_id', registrationID)
      .maybeSingle();

    if (existingBooking) return fail(400, { message: 'You already have a room booking' });

    const form = await request.formData();
    const product_id = form.get('product_id')?.toString();
    const payment_type = form.get('payment_type')?.toString(); // 'full' or 'deposit'

    if (!product_id || !payment_type) return fail(400, { message: 'Missing required fields' });

    const check_in = form.get('check_in')?.toString() || null;
    const check_out = form.get('check_out')?.toString() || null;
    const nights = check_in && check_out
      ? Math.max(0, Math.round((new Date(check_out).getTime() - new Date(check_in).getTime()) / (1000 * 60 * 60 * 24)))
      : 1;

    if (!check_in || !check_out || nights <= 0) {
      return fail(400, { message: 'Please select valid check-in and check-out dates' });
    }

    // Fetch room product
    const { data: room } = await db
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('event_id', participant.event_id)
      .single();

    if (!room) return fail(404, { message: 'Room not found' });

    // Check availability
    if (room.quantity_total && (room.quantity_sold ?? 0) >= room.quantity_total) {
      return fail(400, { message: 'This room type is fully booked' });
    }

    const event = participant.events as any;
    const totalAmount = parseFloat(room.price) * nights;
    const depositPercent = event.accommodation_deposit_percent ?? 10;
    const depositAmount = parseFloat((totalAmount * depositPercent / 100).toFixed(2));
    const remainingAmount = parseFloat((totalAmount - depositAmount).toFixed(2));
    const currency = room.currency_type?.toLowerCase() ?? 'eur';
    const roommate_names = form.getAll('roommate_names')
      .map(v => v.toString().trim())
      .filter(v => v.length > 0);

    const chargeAmount = payment_type === 'full' ? totalAmount : depositAmount;
    const stripeFeeModel = event.stripe_fee_model ?? 'on_top';
    const platformFeePercent = event.platform_fee_percent ?? 1;

    // Find ED with Stripe connected
    const { data: edParticipants } = await db
      .from('event_participants')
      .select('user_id')
      .eq('event_id', participant.event_id)
      .eq('event_role', 'Event Director');

    const edUserIds = (edParticipants ?? []).map(ep => ep.user_id);
    const { data: organizers } = await db
      .from('profiles')
      .select('id, stripe_account_id, stripe_onboarding_complete')
      .in('id', edUserIds)
      .eq('stripe_onboarding_complete', true)
      .not('stripe_account_id', 'is', null)
      .limit(1);

    const organizer = organizers?.[0];
    if (!organizer?.stripe_account_id) {
      return fail(400, { message: 'Event organiser has not connected Stripe' });
    }

    // Build line items
    const lineItems: any[] = [
      {
        price_data: {
          currency,
          product_data: {
            name: payment_type === 'full'
              ? `${room.name} — Full Payment`
              : `${room.name} — Deposit (${depositPercent}%)`
          },
          unit_amount: Math.round(chargeAmount * 100)
        },
        quantity: 1
      }
    ];

    const serviceFeeAmount = Math.round(chargeAmount * (platformFeePercent / 100) * 100);
    const stripeFeeAmount = Math.round(chargeAmount * 0.035 * 100);

    if (stripeFeeModel === 'on_top') {
      lineItems.push({
        price_data: {
          currency,
          product_data: { name: 'Payment handling fee (3.5%)' },
          unit_amount: stripeFeeAmount
        },
        quantity: 1
      });
    }

    lineItems.push({
      price_data: {
        currency,
        product_data: { name: `Platform service fee (${platformFeePercent}%)` },
        unit_amount: serviceFeeAmount
      },
      quantity: 1
    });

    // on_top: capture both the Stripe recovery fee and platform fee
    // included: organizer absorbs Stripe's cost, platform only takes platform fee
    const applicationFee = stripeFeeModel === 'on_top'
      ? serviceFeeAmount + stripeFeeAmount
      : serviceFeeAmount;

    const origin = url.origin.includes('localhost') ? 'https://dancepoint.no' : url.origin;

    // Create hotel_booking record first (pending)
    const { data: booking, error: bookingError } = await db
      .from('hotel_bookings')
      .insert({
        participant_id: registrationID,
        event_id: participant.event_id,
        product_id: room.id,
        room_name: room.name,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        remaining_amount: payment_type === 'full' ? 0 : remainingAmount,
        deposit_paid: false,
        remaining_paid: payment_type === 'full',
        currency: room.currency_type ?? 'EUR',
        final_payment_deadline: event.accommodation_final_payment_deadline ?? null,
        roommate_names: roommate_names,
        room_capacity: room.room_capacity ?? 1,
        check_in,
        check_out,
        nights
      })
      .select()
      .single();

    if (bookingError) return fail(500, { message: bookingError.message });

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: { destination: organizer.stripe_account_id }
      },
      metadata: {
        type: payment_type === 'full' ? 'accommodation_full' : 'accommodation_deposit',
        hotel_booking_id: booking.id,
        participant_id: registrationID,
        user_id: user.id
      },
      success_url: `${origin}/profile/${registrationID}/accommodation?success=true`,
      cancel_url: `${origin}/profile/${registrationID}/accommodation?cancelled=true`
    });

    // Update booking with session id
    await db
      .from('hotel_bookings')
      .update({ deposit_stripe_session_id: session.id })
      .eq('id', booking.id);

    // Increment quantity_sold
    await db
      .from('products')
      .update({ quantity_sold: (room.quantity_sold ?? 0) + 1 })
      .eq('id', room.id);

    throw redirect(303, session.url!);
  },

  payRemaining: async ({ params, cookies, url, locals }) => {
    const db = locals.supabase;
    const { registrationID } = params;

    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Not authenticated' });

    // Fetch booking
    const { data: booking } = await db
      .from('hotel_bookings')
      .select('*, events(stripe_fee_model, platform_fee_percent, title)')
      .eq('participant_id', registrationID)
      .single();

    if (!booking) return fail(404, { message: 'Booking not found' });
    if (!booking.deposit_paid) return fail(400, { message: 'Deposit must be paid first' });
    if (booking.remaining_paid) return fail(400, { message: 'Remaining balance already paid' });

    const { data: participant } = await db
      .from('event_participants')
      .select('event_id, user_id')
      .eq('id', registrationID)
      .single();

    if (!participant || participant.user_id !== user.id) return fail(403, { message: 'Access denied' });

    // Find ED with Stripe
    const { data: edParticipants } = await db
      .from('event_participants')
      .select('user_id')
      .eq('event_id', participant.event_id)
      .eq('event_role', 'Event Director');

    const edUserIds = (edParticipants ?? []).map(ep => ep.user_id);
    const { data: organizers } = await db
      .from('profiles')
      .select('id, stripe_account_id, stripe_onboarding_complete')
      .in('id', edUserIds)
      .eq('stripe_onboarding_complete', true)
      .not('stripe_account_id', 'is', null)
      .limit(1);

    const organizer = organizers?.[0];
    if (!organizer?.stripe_account_id) return fail(400, { message: 'Organiser Stripe not connected' });

    const event = booking.events as any;
    const currency = booking.currency?.toLowerCase() ?? 'eur';
    const remainingAmount = parseFloat(booking.remaining_amount);
    const stripeFeeModel = event?.stripe_fee_model ?? 'on_top';
    const platformFeePercent = event?.platform_fee_percent ?? 1;
    const serviceFeeAmount = Math.round(remainingAmount * (platformFeePercent / 100) * 100);
    const stripeFeeAmount = Math.round(remainingAmount * 0.035 * 100);

    const lineItems: any[] = [
      {
        price_data: {
          currency,
          product_data: { name: `${booking.room_name} — Remaining Balance` },
          unit_amount: Math.round(remainingAmount * 100)
        },
        quantity: 1
      }
    ];

    if (stripeFeeModel === 'on_top') {
      lineItems.push({
        price_data: {
          currency,
          product_data: { name: 'Payment handling fee (3.5%)' },
          unit_amount: stripeFeeAmount
        },
        quantity: 1
      });
    }

    lineItems.push({
      price_data: {
        currency,
        product_data: { name: `Platform service fee (${platformFeePercent}%)` },
        unit_amount: serviceFeeAmount
      },
      quantity: 1
    });

    const applicationFee = stripeFeeModel === 'on_top'
      ? serviceFeeAmount + stripeFeeAmount
      : serviceFeeAmount;

    const origin = url.origin.includes('localhost') ? 'https://dancepoint.no' : url.origin;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: { destination: organizer.stripe_account_id }
      },
      metadata: {
        type: 'accommodation_remaining',
        hotel_booking_id: booking.id,
        participant_id: registrationID,
        user_id: user.id
      },
      success_url: `${origin}/profile/${registrationID}/accommodation?success=true`,
      cancel_url: `${origin}/profile/${registrationID}/accommodation?cancelled=true`
    });

    await db
      .from('hotel_bookings')
      .update({ remaining_stripe_session_id: session.id })
      .eq('id', booking.id);

    throw redirect(303, session.url!);
  },
  updateRoommates: async ({ request, params, cookies , locals }) => {
    const db = locals.supabase;
    const { registrationID } = params;

    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Not authenticated' });

    const { data: participant } = await db
      .from('event_participants')
      .select('user_id')
      .eq('id', registrationID)
      .single();

    if (!participant || participant.user_id !== user.id) return fail(403, { message: 'Access denied' });

    const { data: booking } = await db
      .from('hotel_bookings')
      .select('id')
      .eq('participant_id', registrationID)
      .single();

    if (!booking) return fail(404, { message: 'Booking not found' });

    const form = await request.formData();
    const roommate_names = form.getAll('roommate_names')
      .map(v => v.toString().trim())
      .filter(v => v.length > 0);

    const { error } = await db
      .from('hotel_bookings')
      .update({ roommate_names, updated_at: new Date().toISOString() })
      .eq('participant_id', registrationID);

    if (error) return fail(500, { message: error.message });
    return { success: true };
  }
};