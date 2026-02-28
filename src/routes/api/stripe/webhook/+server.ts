import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { sendPaymentConfirmedEmail } from '$lib/server/email';
import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-01-28.clover' });

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Use one supabase client throughout
  const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded') {
  const session = event.data.object as Stripe.Checkout.Session;
  const { participant_id, type } = session.metadata ?? {};

  if (!participant_id) {
    console.error('Webhook missing participant_id in metadata');
    return json({ error: 'Missing metadata' }, { status: 400 });
  }

  const isAccommodationPayment = type?.startsWith('accommodation_');

  // Only mark participant_products as paid for ticket/product payments
  // Accommodation payments are tracked separately in hotel_bookings
  if (!isAccommodationPayment) {
    const { error } = await supabase
      .from('participant_products')
      .update({
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('participant_id', participant_id)
      .eq('payment_status', 'pending');

    if (error) {
      console.error('Failed to update payment_status:', error);
      return json({ error: 'DB update failed' }, { status: 500 });
    }
  }

  // Send confirmation email for non-accommodation payments only
  if (!isAccommodationPayment) {
    try {
      const { data: participant } = await supabase
        .from('event_participants')
        .select(`
          id,
          user_id,
          profiles ( username ),
          events ( title, start_date )
        `)
        .eq('id', participant_id)
        .single();

      const { data: authUser } = await supabase.auth.admin.getUserById(
        participant?.user_id ?? ''
      );

      const { data: products } = await supabase
        .from('participant_products')
        .select('subtotal, currency_type')
        .eq('participant_id', participant_id)
        .eq('payment_status', 'paid');

      const total = (products ?? []).reduce((sum, p) => sum + parseFloat(p.subtotal), 0);
      const currency = products?.[0]?.currency_type ?? 'EUR';
      const email = authUser?.user?.email ?? session.customer_details?.email;

      if (email && participant) {
        await sendPaymentConfirmedEmail({
          to: email,
          username: (participant.profiles as any)?.username ?? 'Dancer',
          eventTitle: (participant.events as any)?.title ?? 'the event',
          eventStartDate: (participant.events as any)?.start_date ?? '',
          amount: total,
          currency,
          participantId: participant_id
        });
      }
    } catch (emailErr) {
      console.error('Failed to send payment confirmation email:', emailErr);
    }
  }

  // Accommodation payment handling
  if (type === 'accommodation_full') {
    await supabase
      .from('hotel_bookings')
      .update({
        deposit_paid: true,
        remaining_paid: true,
        remaining_amount: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.metadata?.hotel_booking_id);
  }

  if (type === 'accommodation_deposit') {
    await supabase
      .from('hotel_bookings')
      .update({
        deposit_paid: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.metadata?.hotel_booking_id);
  }

  if (type === 'accommodation_remaining') {
    await supabase
      .from('hotel_bookings')
      .update({
        remaining_paid: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.metadata?.hotel_booking_id);
  }
}

if (event.type === 'checkout.session.async_payment_failed') {
  const session = event.data.object as Stripe.Checkout.Session;
  const { participant_id, type } = session.metadata ?? {};

  // Only cancel participant_products for non-accommodation failures
  if (participant_id && !type?.startsWith('accommodation_')) {
    await supabase
      .from('participant_products')
      .update({
        payment_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('participant_id', participant_id)
      .eq('payment_status', 'pending');
  }
}

  return json({ received: true });
};