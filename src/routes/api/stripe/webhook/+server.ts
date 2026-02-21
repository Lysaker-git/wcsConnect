import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const stripe = new Stripe(STRIPE_SECRET_KEY);

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') ?? '';

  // 1. Verify the webhook actually came from Stripe
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return json({ error: 'Invalid signature' }, { status: 400 });
  }

  // 2. Only handle successful checkouts
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { participant_id } = session.metadata ?? {};

    if (!participant_id) {
      console.error('Webhook missing participant_id in metadata');
      return json({ error: 'Missing metadata' }, { status: 400 });
    }

    const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 3. Flip all pending products for this participant to 'paid'
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
  }

  return json({ received: true });
};