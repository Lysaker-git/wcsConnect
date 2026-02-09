import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';

const stripe = new Stripe(STRIPE_SECRET_KEY);

export async function POST({ request }) {
    try {
        const body = await request.json();
        const amount = body?.amount ?? 5000; // in cents
        const currency = (body?.currency ?? 'usd').toLowerCase();

        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            payment_method_types: ['card'],
        });

        return json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
        return json({ error: (err && err.message) || 'Failed to create PaymentIntent' }, { status: 500 });
    }
}