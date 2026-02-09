// In a file like /src/routes/api/checkout/+server.ts (for SvelteKit)
import { stripe } from '$lib/server/stripeClient';

export async function POST({ request }) {
  const data = await request.json();
  const { priceId, successPath, cancelPath } = data;
  
  const session = await stripe.checkout.sessions.create({
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'payment', // or 'subscription' for recurring
    success_url: `${process.env.DOMAIN}/${successPath || 'success'}`,
    cancel_url: `${process.env.DOMAIN}/${cancelPath || 'cancel'}`,
    // Optionally pass customer data if available
    customer_email: data.email,
  });
  
  return new Response(JSON.stringify({ url: session.url }), {
    headers: { 'Content-Type': 'application/json' }
  });
}