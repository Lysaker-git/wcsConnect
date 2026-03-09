import { NETS_WEBHOOK_SECRET } from '$env/static/private';
import { sendReceiptEmail } from '$lib/server/email';
import { supabase } from '$lib/server/supabaseServiceClient';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  // Verify NETS Easy webhook authorization header
  const authHeader = request.headers.get('Authorization') ?? '';
  if (authHeader !== NETS_WEBHOOK_SECRET) {
    console.error('NETS Easy webhook: invalid authorization');
    return json({ error: 'Invalid authorization' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { event, data } = body ?? {};
  if (!event || !data) {
    return json({ error: 'Invalid payload' }, { status: 400 });
  }

  const paymentId: string = data.paymentId;
  const rawReference: string = data.order?.reference ?? '';

  // Parse reference — accommodation payments use format: "accommodation_TYPE:PARTICIPANT_ID:BOOKING_ID"
  const isAccommodation = rawReference.startsWith('accommodation_');
  const [refType, refParticipantId, refBookingId] = rawReference.split(':');
  const participantId: string = isAccommodation ? refParticipantId : rawReference;
  let hotelBookingId: string | null = isAccommodation ? refBookingId : null;
  const accommodationType: string | null = isAccommodation ? refType : null; // e.g. 'accommodation_deposit'

  // ── Accommodation payment succeeded ───────────────────────────────────────
  if ((event === 'payment.checkout.completed' || event === 'payment.charge.created') && isAccommodation) {
    if (!participantId || !hotelBookingId) {
      console.error('NETS webhook: malformed accommodation reference:', rawReference);
      return json({ error: 'Invalid reference' }, { status: 400 });
    }

    // New flow: booking data is stored in a session, create the actual hotel_booking now
    if (accommodationType === 'accommodation_book') {
      const sessionId = hotelBookingId;
      const { data: session, error: sessionErr } = await supabase
        .from('accommodation_payment_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionErr || !session) {
        console.error('NETS webhook: accommodation session not found:', sessionId);
        return json({ error: 'Session not found' }, { status: 400 });
      }

      const isFullPayment = session.payment_type === 'full';

      const { data: newBooking, error: bookingErr } = await supabase
        .from('hotel_bookings')
        .insert({
          participant_id: session.participant_id,
          event_id: session.event_id,
          product_id: session.product_id,
          room_name: session.room_name,
          total_amount: session.total_amount,
          deposit_amount: session.deposit_amount,
          remaining_amount: session.remaining_amount,
          deposit_paid: true,
          remaining_paid: isFullPayment,
          currency: session.currency,
          final_payment_deadline: session.final_payment_deadline,
          roommate_names: session.roommate_names,
          room_capacity: session.room_capacity,
          hotel_membership_id: session.hotel_membership_id,
          check_in: session.check_in,
          check_out: session.check_out,
          nights: session.nights,
          nets_payment_id: paymentId
        })
        .select()
        .single();

      if (bookingErr) {
        console.error('NETS webhook: failed to create hotel_booking:', bookingErr);
        return json({ error: 'Failed to create booking' }, { status: 500 });
      }

      // Increment room inventory
      const { data: roomProduct } = await supabase.from('products').select('quantity_sold').eq('id', session.product_id).single();
      if (roomProduct) {
        await supabase.from('products').update({ quantity_sold: (roomProduct.quantity_sold ?? 0) + 1 }).eq('id', session.product_id);
      }

      // Clean up the session
      await supabase.from('accommodation_payment_sessions').delete().eq('id', sessionId);

      // Reuse the invoice + receipt logic below with the new booking
      hotelBookingId = newBooking.id;
      // Fall through to invoice/receipt creation
    } else {
      // Legacy / payDeposit / payRemaining: update existing booking status
      if (accommodationType === 'accommodation_full') {
        await supabase.from('hotel_bookings').update({ deposit_paid: true, remaining_paid: true, remaining_amount: 0, updated_at: new Date().toISOString() }).eq('id', hotelBookingId);
      } else if (accommodationType === 'accommodation_deposit') {
        await supabase.from('hotel_bookings').update({ deposit_paid: true, updated_at: new Date().toISOString() }).eq('id', hotelBookingId);
      } else if (accommodationType === 'accommodation_remaining') {
        await supabase.from('hotel_bookings').update({ remaining_paid: true, updated_at: new Date().toISOString() }).eq('id', hotelBookingId);
      }
    }

    // Create invoice + send receipt for accommodation payment
    try {
      const { data: hotelBooking } = await supabase
        .from('hotel_bookings')
        .select('*, products ( mva_rate )')
        .eq('id', hotelBookingId)
        .single();

      if (hotelBooking) {
        let chargedAmount: number;
        let lineItemName: string;

        if (accommodationType === 'accommodation_full') {
          chargedAmount = parseFloat(hotelBooking.total_amount);
          lineItemName = `${hotelBooking.room_name} — Full Payment`;
        } else if (accommodationType === 'accommodation_deposit') {
          chargedAmount = parseFloat(hotelBooking.deposit_amount);
          lineItemName = `${hotelBooking.room_name} — Deposit`;
        } else {
          chargedAmount = parseFloat(hotelBooking.remaining_amount);
          lineItemName = `${hotelBooking.room_name} — Remaining Balance`;
        }
        if (hotelBooking.nights) {
          lineItemName += ` (${hotelBooking.nights} night${hotelBooking.nights === 1 ? '' : 's'})`;
        }

        const mvaRate = Number((hotelBooking.products as any)?.mva_rate ?? 0);
        const mvaAmount = Math.round(chargedAmount * mvaRate / (100 + mvaRate) * 100) / 100;
        const amountExclMva = Math.round((chargedAmount - mvaAmount) * 100) / 100;
        const currency = hotelBooking.currency ?? 'NOK';

        const { data: hotelInvoice } = await supabase
          .from('invoices')
          .insert({
            participant_id: participantId,
            hotel_booking_id: hotelBookingId,
            nets_payment_id: paymentId,
            total_excl_mva: amountExclMva,
            total_mva: mvaAmount,
            total_incl_mva: chargedAmount,
            currency
          })
          .select('id, invoice_number')
          .single();

        const { data: hotelParticipant } = await supabase
          .from('event_participants')
          .select('user_id, event_id, profiles ( username ), events ( title )')
          .eq('id', participantId)
          .single();

        const { data: hotelAuthUser } = await supabase.auth.admin.getUserById(hotelParticipant?.user_id ?? '');
        const hotelEmail = hotelAuthUser?.user?.email;

        let hotelSeller = { name: 'Event Organizer' as string, orgNumber: null as string | null, address: null as string | null, email: null as string | null };
        if (hotelParticipant?.event_id) {
          const { data: edRows } = await supabase.from('event_participants').select('user_id').eq('event_id', hotelParticipant.event_id).eq('event_role', 'Event Director');
          const edIds = (edRows ?? []).map(r => r.user_id);
          if (edIds.length > 0) {
            const { data: edProfiles } = await supabase.from('profiles').select('id, username, organizer_name, organizer_org_number, organizer_address, organizer_email').in('id', edIds).not('organizer_name', 'is', null).limit(1);
            const edProfile = edProfiles?.[0];
            if (edProfile) hotelSeller = { name: edProfile.organizer_name || edProfile.username || 'Event Organizer', orgNumber: edProfile.organizer_org_number ?? null, address: edProfile.organizer_address ?? null, email: edProfile.organizer_email ?? null };
          }
        }

        if (hotelEmail && hotelInvoice) {
          await sendReceiptEmail({
            to: hotelEmail,
            invoiceNumber: hotelInvoice.invoice_number,
            buyerName: (hotelParticipant?.profiles as any)?.username ?? 'Guest',
            eventTitle: (hotelParticipant?.events as any)?.title ?? 'Accommodation',
            seller: hotelSeller,
            products: [{ name: lineItemName, quantity: 1, unitPrice: chargedAmount, subtotal: chargedAmount, mvaRate, mvaAmount }],
            totalExclMva: amountExclMva,
            totalMva: mvaAmount,
            totalInclMva: chargedAmount,
            currency,
            paymentRef: paymentId,
            paymentProvider: 'NETS Easy',
            participantId
          });
        }
      }
    } catch (err) {
      console.error('NETS webhook: failed to create accommodation invoice/receipt:', err);
    }

    return json({ received: true });
  }

  // ── Regular product payment succeeded ─────────────────────────────────────
  if (event === 'payment.checkout.completed' || event === 'payment.charge.created') {
    if (!participantId) {
      console.error('NETS webhook: missing participant_id in order.reference');
      return json({ error: 'Missing reference' }, { status: 400 });
    }

    // Mark pending products as paid (idempotent — won't double-process)
    const { data: justPaidProducts, error: updateError } = await supabase
      .from('participant_products')
      .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
      .eq('participant_id', participantId)
      .eq('payment_status', 'pending')
      .select('id, product_name, unit_price, quantity_ordered, subtotal, mva_rate, mva_amount, currency_type');

    if (updateError) {
      console.error('NETS webhook: failed to update payment_status:', updateError);
      return json({ error: 'DB update failed' }, { status: 500 });
    }

    const products = justPaidProducts ?? [];

    // Nothing to process (already handled by a previous webhook delivery)
    if (products.length === 0) {
      return json({ received: true });
    }

    // Store NETS payment ID on the participant record
    await supabase
      .from('event_participants')
      .update({ nets_payment_id: paymentId })
      .eq('id', participantId);

    // Build invoice totals
    const totalInclMva = products.reduce((sum, p) => sum + Number(p.subtotal), 0);
    const totalMva = products.reduce((sum, p) => sum + Number(p.mva_amount ?? 0), 0);
    const totalExclMva = totalInclMva - totalMva;
    const currency = products[0]?.currency_type ?? 'NOK';

    // Create invoice record
    // NOTE: requires nets_payment_id column on invoices table.
    // Migration: ALTER TABLE invoices ADD COLUMN IF NOT EXISTS nets_payment_id text;
    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .insert({
        participant_id: participantId,
        nets_payment_id: paymentId,
        total_excl_mva: Math.round(totalExclMva * 100) / 100,
        total_mva: Math.round(totalMva * 100) / 100,
        total_incl_mva: Math.round(totalInclMva * 100) / 100,
        currency
      })
      .select('id, invoice_number')
      .single();

    if (invoiceErr) {
      console.error('NETS webhook: failed to create invoice:', invoiceErr);
    } else if (invoice) {
      // Link products to this invoice
      await supabase
        .from('participant_products')
        .update({ invoice_id: invoice.id })
        .in('id', products.map((p) => p.id));
    }

    // Send Norwegian-compliant receipt email
    try {
      const { data: participant } = await supabase
        .from('event_participants')
        .select('user_id, event_id, profiles ( username ), events ( title, start_date )')
        .eq('id', participantId)
        .single();

      const { data: authUser } = await supabase.auth.admin.getUserById(
        participant?.user_id ?? ''
      );
      const email = authUser?.user?.email;

      // Fetch event organizer info for seller block
      let seller = {
        name: 'Event Organizer' as string,
        orgNumber: null as string | null,
        address: null as string | null,
        email: null as string | null
      };

      if (participant?.event_id) {
        const { data: edRows } = await supabase
          .from('event_participants')
          .select('user_id')
          .eq('event_id', participant.event_id)
          .eq('event_role', 'Event Director');

        const edUserIds = (edRows ?? []).map((r) => r.user_id);

        if (edUserIds.length > 0) {
          const { data: edProfiles } = await supabase
            .from('profiles')
            .select('id, username, organizer_name, organizer_org_number, organizer_address, organizer_email')
            .in('id', edUserIds)
            .not('organizer_name', 'is', null)
            .limit(1);

          const edProfile = edProfiles?.[0];
          if (edProfile) {
            seller = {
              name: edProfile.organizer_name || edProfile.username || 'Event Organizer',
              orgNumber: edProfile.organizer_org_number ?? null,
              address: edProfile.organizer_address ?? null,
              email: edProfile.organizer_email ?? null
            };
          }
        }
      }

      if (email && invoice) {
        await sendReceiptEmail({
          to: email,
          invoiceNumber: invoice.invoice_number,
          buyerName: (participant?.profiles as any)?.username ?? 'Deltaker',
          eventTitle: (participant?.events as any)?.title ?? 'Arrangement',
          seller,
          products: products.map((p) => ({
            name: p.product_name,
            quantity: p.quantity_ordered,
            unitPrice: Number(p.unit_price),
            subtotal: Number(p.subtotal),
            mvaRate: Number(p.mva_rate ?? 0),
            mvaAmount: Number(p.mva_amount ?? 0)
          })),
          totalExclMva: Math.round(totalExclMva * 100) / 100,
          totalMva: Math.round(totalMva * 100) / 100,
          totalInclMva: Math.round(totalInclMva * 100) / 100,
          currency,
          paymentRef: paymentId,
          paymentProvider: 'NETS Easy',
          participantId
        });
      }
    } catch (emailErr) {
      console.error('NETS webhook: failed to send receipt email:', emailErr);
    }
  }

  // ── Payment failed / cancelled ─────────────────────────────────────────────
  if (event === 'payment.charge.failed' || event === 'payment.cancel.created') {
    if (isAccommodation && hotelBookingId) {
      if (accommodationType === 'accommodation_book') {
        // New flow: no hotel_booking was created yet, just clean up the session
        await supabase.from('accommodation_payment_sessions').delete().eq('id', hotelBookingId);
      } else {
        // Legacy flow: booking was pre-created, remove it so user can retry
        await supabase.from('hotel_bookings').delete().eq('id', hotelBookingId);
      }
    } else if (participantId) {
      await supabase
        .from('participant_products')
        .update({ payment_status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('participant_id', participantId)
        .eq('payment_status', 'pending');
    }
  }

  return json({ received: true });
};
