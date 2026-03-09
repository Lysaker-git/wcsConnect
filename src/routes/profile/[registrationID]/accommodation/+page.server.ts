import { supabase } from '$lib/server/supabaseServiceClient';
import { error as svelteError, fail, redirect } from '@sveltejs/kit';
import { NETS_WEBHOOK_SECRET, NETS_LOCAL_TUNNEL_URL } from '$env/static/private';
import { createNetsPayment } from '$lib/server/netsEasyClient';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const db = locals.supabase;
  const { user } = await locals.safeGetSession();
  const { registrationID } = params;

  if (!user) throw redirect(303, '/signin');

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

  const { data: rooms } = await supabase
    .from('products')
    .select('*')
    .eq('event_id', participant.event_id)
    .eq('product_type', 'accommodation')
    .eq('is_active', true)
    .order('price', { ascending: true });

  // Prefer the active booking; fall back to the most recent cancelled one for history display
  const { data: allBookings } = await supabase
    .from('hotel_bookings')
    .select('*')
    .eq('participant_id', registrationID)
    .order('created_at', { ascending: false });

  const existingBooking =
    (allBookings ?? []).find(b => !b.cancelled_at) ??
    (allBookings ?? [])[0] ??
    null;

  return {
    participant,
    event,
    rooms: rooms ?? [],
    existingBooking: existingBooking ?? null
  };
};

export const actions: Actions = {
  book: async ({ request, params, url, locals }) => {
    const db = locals.supabase;
    const { registrationID } = params;

    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Not authenticated' });

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

    // Only block if there's an active (non-cancelled) booking
    const { data: activeBooking } = await db
      .from('hotel_bookings')
      .select('id')
      .eq('participant_id', registrationID)
      .is('cancelled_at', null)
      .maybeSingle();

    if (activeBooking) return fail(400, { message: 'You already have a room booking' });

    const form = await request.formData();
    const product_id = form.get('product_id')?.toString();
    const payment_type = form.get('payment_type')?.toString();

    if (!product_id || !payment_type) return fail(400, { message: 'Missing required fields' });

    const hotel_membership_id = form.get('hotel_membership_id')?.toString().trim() || null;
    const check_in = form.get('check_in')?.toString() || null;
    const check_out = form.get('check_out')?.toString() || null;
    const nights = check_in && check_out
      ? Math.max(0, Math.round((new Date(check_out).getTime() - new Date(check_in).getTime()) / (1000 * 60 * 60 * 24)))
      : 1;

    if (!check_in || !check_out || nights <= 0) {
      return fail(400, { message: 'Please select valid check-in and check-out dates' });
    }

    const { data: room } = await db
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('event_id', participant.event_id)
      .single();

    if (!room) return fail(404, { message: 'Room not found' });

    if (room.quantity_total && (room.quantity_sold ?? 0) >= room.quantity_total) {
      return fail(400, { message: 'This room type is fully booked' });
    }

    const event = participant.events as any;
    const totalAmount = parseFloat(room.price) * nights;
    const depositPercent = event.accommodation_deposit_percent ?? 10;
    const depositAmount = parseFloat((totalAmount * depositPercent / 100).toFixed(2));
    const remainingAmount = parseFloat((totalAmount - depositAmount).toFixed(2));
    const roommate_names = form.getAll('roommate_names')
      .map(v => v.toString().trim())
      .filter(v => v.length > 0);

    const chargeAmount = payment_type === 'full' ? totalAmount : depositAmount;
    const feeModel = event.stripe_fee_model ?? 'on_top';
    const platformFeePercent = event.platform_fee_percent ?? 1;

    // Generate a session ID upfront so it can be embedded in the NETS reference
    const sessionId = crypto.randomUUID();
    const netsReference = `accommodation_book:${registrationID}:${sessionId}`;

    const chargeOre = Math.round(chargeAmount * 100);
    const handlingFeeOre = feeModel === 'on_top' ? Math.round(chargeAmount * 0.035 * 100) : 0;
    const serviceFeeOre = Math.round(chargeAmount * (platformFeePercent / 100) * 100);
    const totalOre = chargeOre + handlingFeeOre + serviceFeeOre;

    const lineItemName = payment_type === 'full'
      ? `${room.name} — Full Payment`
      : `${room.name} — Deposit (${depositPercent}%)`;

    const netsItems: any[] = [{
      reference: sessionId,
      name: nights > 1 ? `${lineItemName} (${nights} nights)` : lineItemName,
      quantity: 1,
      unit: 'pcs',
      unitPrice: chargeOre,
      taxRate: 0,
      taxAmount: 0,
      grossTotalAmount: chargeOre,
      netTotalAmount: chargeOre
    }];

    if (feeModel === 'on_top') {
      netsItems.push({ reference: 'handling-fee', name: 'Payment handling fee (3.5%)', quantity: 1, unit: 'pcs', unitPrice: handlingFeeOre, taxRate: 0, taxAmount: 0, grossTotalAmount: handlingFeeOre, netTotalAmount: handlingFeeOre });
    }
    netsItems.push({ reference: 'service-fee', name: `Platform service fee (${platformFeePercent}%)`, quantity: 1, unit: 'pcs', unitPrice: serviceFeeOre, taxRate: 0, taxAmount: 0, grossTotalAmount: serviceFeeOre, netTotalAmount: serviceFeeOre });

    const returnOrigin = url.origin;
    const webhookOrigin = url.origin.includes('localhost') ? (NETS_LOCAL_TUNNEL_URL || 'https://dancepoint.no') : url.origin;
    const webhookUrl = `${webhookOrigin}/api/nets/webhook`;

    const { paymentId, hostedPaymentPageUrl } = await createNetsPayment({
      order: { items: netsItems, amount: totalOre, currency: (room.currency_type ?? 'NOK').toUpperCase(), reference: netsReference },
      checkout: {
        integrationType: 'HostedPaymentPage',
        returnUrl: `${returnOrigin}/profile/${registrationID}/accommodation?success=true`,
        cancelUrl: `${returnOrigin}/profile/${registrationID}/accommodation?cancelled=true`,
        termsUrl: `${returnOrigin}/terms`,
        charge: true
      },
      notifications: {
        webHooks: [
          { eventName: 'payment.checkout.completed', url: webhookUrl, authorization: NETS_WEBHOOK_SECRET },
          { eventName: 'payment.charge.failed', url: webhookUrl, authorization: NETS_WEBHOOK_SECRET },
          { eventName: 'payment.cancel.created', url: webhookUrl, authorization: NETS_WEBHOOK_SECRET }
        ]
      }
    });

    // Store all booking data in a session — the webhook will create hotel_bookings after payment succeeds
    await supabase.from('accommodation_payment_sessions').insert({
      id: sessionId,
      nets_payment_id: paymentId,
      participant_id: registrationID,
      event_id: participant.event_id,
      product_id: room.id,
      payment_type,
      total_amount: totalAmount,
      deposit_amount: depositAmount,
      remaining_amount: payment_type === 'full' ? 0 : remainingAmount,
      currency: room.currency_type ?? 'EUR',
      room_name: room.name,
      room_capacity: room.room_capacity ?? 1,
      check_in,
      check_out,
      nights,
      roommate_names,
      hotel_membership_id,
      deposit_percent: depositPercent,
      fee_model: feeModel,
      platform_fee_percent: platformFeePercent,
      final_payment_deadline: event.accommodation_final_payment_deadline ?? null
    });

    throw redirect(303, hostedPaymentPageUrl);
  },

  payDeposit: async ({ params, url, locals }) => {
    const db = locals.supabase;
    const { registrationID } = params;

    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Not authenticated' });

    const { data: booking } = await db
      .from('hotel_bookings')
      .select('*, events(stripe_fee_model, platform_fee_percent, title)')
      .eq('participant_id', registrationID)
      .eq('deposit_paid', false)
      .is('cancelled_at', null)
      .single();

    if (!booking) return fail(404, { message: 'No unpaid deposit found' });

    const { data: participant } = await db
      .from('event_participants')
      .select('event_id, user_id')
      .eq('id', registrationID)
      .single();

    if (!participant || participant.user_id !== user.id) return fail(403, { message: 'Access denied' });

    const event = booking.events as any;
    const chargeAmount = parseFloat(booking.deposit_amount);
    const feeModel = event?.stripe_fee_model ?? 'on_top';
    const platformFeePercent = event?.platform_fee_percent ?? 1;

    const chargeOre = Math.round(chargeAmount * 100);
    const handlingFeeOre = feeModel === 'on_top' ? Math.round(chargeAmount * 0.035 * 100) : 0;
    const serviceFeeOre = Math.round(chargeAmount * (platformFeePercent / 100) * 100);
    const totalOre = chargeOre + handlingFeeOre + serviceFeeOre;

    const netsReference = `accommodation_deposit:${registrationID}:${booking.id}`;
    const netsItems: any[] = [{ reference: booking.id, name: `${booking.room_name} — Deposit`, quantity: 1, unit: 'pcs', unitPrice: chargeOre, taxRate: 0, taxAmount: 0, grossTotalAmount: chargeOre, netTotalAmount: chargeOre }];
    if (feeModel === 'on_top') {
      netsItems.push({ reference: 'handling-fee', name: 'Payment handling fee (3.5%)', quantity: 1, unit: 'pcs', unitPrice: handlingFeeOre, taxRate: 0, taxAmount: 0, grossTotalAmount: handlingFeeOre, netTotalAmount: handlingFeeOre });
    }
    netsItems.push({ reference: 'service-fee', name: `Platform service fee (${platformFeePercent}%)`, quantity: 1, unit: 'pcs', unitPrice: serviceFeeOre, taxRate: 0, taxAmount: 0, grossTotalAmount: serviceFeeOre, netTotalAmount: serviceFeeOre });

    const returnOrigin = url.origin;
    const webhookOrigin = url.origin.includes('localhost') ? (NETS_LOCAL_TUNNEL_URL || 'https://dancepoint.no') : url.origin;
    const webhookUrl = `${webhookOrigin}/api/nets/webhook`;

    const { hostedPaymentPageUrl } = await createNetsPayment({
      order: { items: netsItems, amount: totalOre, currency: (booking.currency ?? 'NOK').toUpperCase(), reference: netsReference },
      checkout: { integrationType: 'HostedPaymentPage', returnUrl: `${returnOrigin}/profile/${registrationID}/accommodation?success=true`, cancelUrl: `${returnOrigin}/profile/${registrationID}/accommodation?cancelled=true`, termsUrl: `${returnOrigin}/terms`, charge: true },
      notifications: { webHooks: [
        { eventName: 'payment.checkout.completed', url: webhookUrl, authorization: NETS_WEBHOOK_SECRET },
        { eventName: 'payment.charge.failed', url: webhookUrl, authorization: NETS_WEBHOOK_SECRET },
        { eventName: 'payment.cancel.created', url: webhookUrl, authorization: NETS_WEBHOOK_SECRET }
      ]}
    });

    throw redirect(303, hostedPaymentPageUrl);
  },

  payRemaining: async ({ params, url, locals }) => {
    const db = locals.supabase;
    const { registrationID } = params;

    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Not authenticated' });

    const { data: booking } = await db
      .from('hotel_bookings')
      .select('*, events(stripe_fee_model, platform_fee_percent, title)')
      .eq('participant_id', registrationID)
      .is('cancelled_at', null)
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

    const event = booking.events as any;
    const remainingAmount = parseFloat(booking.remaining_amount);
    const feeModel = event?.stripe_fee_model ?? 'on_top';
    const platformFeePercent = event?.platform_fee_percent ?? 1;

    const chargeOre = Math.round(remainingAmount * 100);
    const handlingFeeOre = feeModel === 'on_top' ? Math.round(remainingAmount * 0.035 * 100) : 0;
    const serviceFeeOre = Math.round(remainingAmount * (platformFeePercent / 100) * 100);
    const totalOre = chargeOre + handlingFeeOre + serviceFeeOre;

    const netsReference = `accommodation_remaining:${registrationID}:${booking.id}`;
    const netsItems: any[] = [{
      reference: booking.id,
      name: `${booking.room_name} — Remaining Balance`,
      quantity: 1,
      unit: 'pcs',
      unitPrice: chargeOre,
      taxRate: 0,
      taxAmount: 0,
      grossTotalAmount: chargeOre,
      netTotalAmount: chargeOre
    }];
    if (feeModel === 'on_top') {
      netsItems.push({ reference: 'handling-fee', name: 'Payment handling fee (3.5%)', quantity: 1, unit: 'pcs', unitPrice: handlingFeeOre, taxRate: 0, taxAmount: 0, grossTotalAmount: handlingFeeOre, netTotalAmount: handlingFeeOre });
    }
    netsItems.push({ reference: 'service-fee', name: `Platform service fee (${platformFeePercent}%)`, quantity: 1, unit: 'pcs', unitPrice: serviceFeeOre, taxRate: 0, taxAmount: 0, grossTotalAmount: serviceFeeOre, netTotalAmount: serviceFeeOre });

    const returnOrigin = url.origin;
    const webhookOrigin = url.origin.includes('localhost') ? (NETS_LOCAL_TUNNEL_URL || 'https://dancepoint.no') : url.origin;
    const webhookUrl = `${webhookOrigin}/api/nets/webhook`;

    const { hostedPaymentPageUrl } = await createNetsPayment({
      order: { items: netsItems, amount: totalOre, currency: (booking.currency ?? 'NOK').toUpperCase(), reference: netsReference },
      checkout: {
        integrationType: 'HostedPaymentPage',
        returnUrl: `${returnOrigin}/profile/${registrationID}/accommodation?success=true`,
        cancelUrl: `${returnOrigin}/profile/${registrationID}/accommodation?cancelled=true`,
        termsUrl: `${returnOrigin}/terms`,
        charge: true
      },
      notifications: {
        webHooks: [
          { eventName: 'payment.checkout.completed', url: webhookUrl, authorization: NETS_WEBHOOK_SECRET },
          { eventName: 'payment.charge.failed', url: webhookUrl, authorization: NETS_WEBHOOK_SECRET },
          { eventName: 'payment.cancel.created', url: webhookUrl, authorization: NETS_WEBHOOK_SECRET }
        ]
      }
    });

    throw redirect(303, hostedPaymentPageUrl);
  },

  cancelBooking: async ({ params, locals }) => {
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

    const { data: booking } = await supabase
      .from('hotel_bookings')
      .select('id, product_id')
      .eq('participant_id', registrationID)
      .is('cancelled_at', null)
      .single();

    if (!booking) return fail(404, { message: 'No active booking found' });

    const { error } = await supabase
      .from('hotel_bookings')
      .update({ cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', booking.id);

    if (error) return fail(500, { message: error.message });

    // Release the room slot
    const { data: product } = await supabase
      .from('products')
      .select('quantity_sold')
      .eq('id', booking.product_id)
      .single();

    if (product) {
      await supabase
        .from('products')
        .update({ quantity_sold: Math.max((product.quantity_sold ?? 0) - 1, 0) })
        .eq('id', booking.product_id);
    }

    throw redirect(303, `/profile/${registrationID}/accommodation`);
  },

  updateRoommates: async ({ request, params, locals }) => {
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
