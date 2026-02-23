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
    const { participant_id } = session.metadata ?? {};

    if (!participant_id) {
      console.error('Webhook missing participant_id in metadata');
      return json({ error: 'Missing metadata' }, { status: 400 });
    }

    // Flip pending products to paid
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

    console.log(`✅ Payment confirmed for participant ${participant_id}`);

    // Send payment confirmed email — inside the success block
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
          username: participant.profiles?.username ?? 'Dancer',
          eventTitle: participant.events?.title ?? 'the event',
          eventStartDate: participant.events?.start_date ?? '',
          amount: total,
          currency,
          participantId: participant_id
        });
        console.log(`📧 Payment confirmation email sent to ${email}`);
      }
      } catch (emailErr) {
        console.error('Failed to send payment confirmation email:', emailErr);
      }

      // Accommodation payments
      if (session.metadata?.type === 'accommodation_full') {
        await supabase
          .from('hotel_bookings')
          .update({
            deposit_paid: true,
            remaining_paid: true,
            remaining_amount: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.metadata.hotel_booking_id);
        console.log(`🏨 Full accommodation payment confirmed for booking ${session.metadata.hotel_booking_id}`);
      }

      if (session.metadata?.type === 'accommodation_deposit') {
        await supabase
          .from('hotel_bookings')
          .update({
            deposit_paid: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.metadata.hotel_booking_id);
        console.log(`🏨 Accommodation deposit confirmed for booking ${session.metadata.hotel_booking_id}`);
      }

      if (session.metadata?.type === 'accommodation_remaining') {
        await supabase
          .from('hotel_bookings')
          .update({
            remaining_paid: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.metadata.hotel_booking_id);
        console.log(`🏨 Accommodation remaining balance confirmed for booking ${session.metadata.hotel_booking_id}`);
      }
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { participant_id } = session.metadata ?? {};

    if (participant_id) {
      await supabase
        .from('participant_products')
        .update({
          payment_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('participant_id', participant_id)
        .eq('payment_status', 'pending');

      console.log(`❌ Async payment failed for participant ${participant_id}`);
    }
  }

  return json({ received: true });
};