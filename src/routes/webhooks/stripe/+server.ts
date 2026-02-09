import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { supabase } from '$lib/api/supabaseClient';
import { json } from '@sveltejs/kit';

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

export async function POST({ request }) {
    try {
        // Get the raw body for signature verification
        const body = await request.text();
        const sig = request.headers.get('stripe-signature');

        if (!sig) {
            console.error('[webhook] Missing stripe-signature header');
            return json({ error: 'Missing signature' }, { status: 400 });
        }

        // Verify the webhook signature
        let event;
        try {
            event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
        } catch (err) {
            console.error('[webhook] Signature verification failed:', (err as any)?.message);
            return json({ error: 'Invalid signature' }, { status: 400 });
        }

        console.log(`[webhook] Received event: ${event.type}`);

        // Handle payment_intent.succeeded
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const paymentIntentId = paymentIntent.id;

            console.log(`[webhook] Payment succeeded for PaymentIntent: ${paymentIntentId}`);

            // Update the order in Supabase
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .update({
                    payment_intent_id: paymentIntentId,
                    payment_status: 'completed',
                    status: 'confirmed'
                })
                .eq('payment_intent_id', paymentIntentId)
                .select()
                .single();

            if (orderError) {
                console.error('[webhook] Failed to update order:', orderError);
                return json({ error: 'Failed to update order' }, { status: 500 });
            }

            console.log('[webhook] Order updated successfully:', orderData);
        }

        // Handle payment_intent.payment_failed
        if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const paymentIntentId = paymentIntent.id;

            console.log(`[webhook] Payment failed for PaymentIntent: ${paymentIntentId}`);

            // Update the order status to failed
            const { error: orderError } = await supabase
                .from('orders')
                .update({
                    payment_status: 'failed',
                    status: 'payment_failed'
                })
                .eq('payment_intent_id', paymentIntentId);

            if (orderError) {
                console.error('[webhook] Failed to update order on payment failure:', orderError);
            }
        }

        // Always return 200 to acknowledge receipt
        return json({ received: true }, { status: 200 });
    } catch (err) {
        console.error('[webhook] Unexpected error:', (err as any)?.message);
        return json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
