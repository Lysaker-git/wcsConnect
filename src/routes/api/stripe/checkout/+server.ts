import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const stripe = new Stripe(STRIPE_SECRET_KEY);

export const POST: RequestHandler = async ({ request, locals, url }) => {
  const db = locals.supabase;
  // 1. Get user from session
  const { user } = await locals.safeGetSession();
  if (!user) return json({ error: 'Not authenticated' }, { status: 401 });

  // 2. Get the participant_id from the request body
  const { participant_id } = await request.json();
  if (!participant_id) return json({ error: 'Missing participant_id' }, { status: 400 });

  // 3. Verify this participant row belongs to this user
  const { data: participant, error: participantError } = await db
    .from('event_participants')
    .select('id, event_id, user_id, events ( title )')
    .eq('id', participant_id)
    .eq('user_id', user.id)
    .single();

  if (participantError || !participant) {
    return json({ error: 'Participant not found' }, { status: 404 });
  }

  // Fetch buyer's display name
  const { data: buyerProfile } = await db
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  const buyerName = buyerProfile?.username ?? user.email ?? 'Unknown';
  const eventTitle = (participant.events as any)?.title ?? 'Event';

  // 4. Get all pending products in their cart
  const { data: cartItems, error: cartError } = await db
    .from('participant_products')
    .select('id, product_name, unit_price, quantity_ordered, subtotal, currency_type')
    .eq('participant_id', participant_id)
    .eq('payment_status', 'pending');

  if (cartError || !cartItems || cartItems.length === 0) {
    return json({ error: 'No pending items found' }, { status: 400 });
  }

  // 5. Find the event organizer with a connected Stripe account
  // Look for Event Director first — they own the Stripe account
  const { data: edParticipants, error: edError } = await db
    .from('event_participants')
    .select('user_id')
    .eq('event_id', participant.event_id)
    .eq('event_role', 'Event Director');

  if (edError || !edParticipants || edParticipants.length === 0) {
    return json({ error: 'Event organizer not found' }, { status: 400 });
  }

  // Find the ED who has Stripe connected
  const edUserIds = edParticipants.map(ep => ep.user_id);

  const { data: organizers } = await db
    .from('profiles')
    .select('id, stripe_account_id, stripe_onboarding_complete')
    .in('id', edUserIds)
    .eq('stripe_onboarding_complete', true)
    .not('stripe_account_id', 'is', null)
    .limit(1);

  const organizer = organizers?.[0];

  if (!organizer?.stripe_account_id) {
    return json({ error: 'Organizer has not connected Stripe yet' }, { status: 400 });
  }

  // 6. Fetch event's stripe_fee_model
  const { data: eventData } = await db
      .from('events')
      .select('stripe_fee_model')
      .eq('id', participant.event_id)
      .single();

  const stripeFeeModel = eventData?.stripe_fee_model ?? 'on_top';

  // 7. Build line items
  const currency = cartItems[0].currency_type?.toLowerCase() ?? 'eur';
  const ticketSubtotal = cartItems.reduce((sum, item) => sum + Number(item.subtotal), 0);

  const lineItems = cartItems.map((item) => ({
      price_data: {
          currency,
          product_data: { name: item.product_name },
          unit_amount: Math.round(item.unit_price * 100)
      },
      quantity: item.quantity_ordered
  }));

  // 8. Add fees as line items
  const serviceFeeAmount = Math.round(ticketSubtotal * 0.01 * 100); // 1% in cents

  if (stripeFeeModel === 'on_top') {
      const stripeFeeAmount = Math.round(ticketSubtotal * 0.035 * 100); // 3.5% in cents
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
          product_data: { name: 'Platform service fee (1%)' },
          unit_amount: serviceFeeAmount
      },
      quantity: 1
  });

  // 9. application_fee is 1% of ticket subtotal only — goes to your platform account
  const applicationFee = serviceFeeAmount;

  // 10. Create Stripe Checkout Session
  const origin = url.origin.includes('localhost') 
    ? 'https://dancepoint.no' 
    : url.origin;
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    payment_intent_data: {
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: organizer.stripe_account_id
      },
      description: `${eventTitle} — ${buyerName}`,
      metadata: {
        participant_id,
        user_id: user.id,
        buyer_name: buyerName,
        event_title: eventTitle
      }
    },
    // Pass participant_id so the webhook knows what to update
    metadata: {
      participant_id,
      user_id: user.id,
      buyer_name: buyerName,
      event_title: eventTitle
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/cancel`
  });

  return json({ url: session.url });
};