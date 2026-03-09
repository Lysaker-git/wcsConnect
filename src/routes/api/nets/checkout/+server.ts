import { NETS_WEBHOOK_SECRET, NETS_ALLOWED_EVENT_ID, NETS_LOCAL_TUNNEL_URL } from '$env/static/private';
import { createNetsPayment } from '$lib/server/netsEasyClient';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, url }) => {
  const db = locals.supabase;

  const { user } = await locals.safeGetSession();
  if (!user) return json({ error: 'Not authenticated' }, { status: 401 });

  const { participant_id } = await request.json();
  if (!participant_id) return json({ error: 'Missing participant_id' }, { status: 400 });

  // Verify participant belongs to this user
  const { data: participant, error: participantError } = await db
    .from('event_participants')
    .select('id, event_id, user_id, events ( title, stripe_fee_model )')
    .eq('id', participant_id)
    .eq('user_id', user.id)
    .single();

  if (participantError || !participant) {
    return json({ error: 'Participant not found' }, { status: 404 });
  }

  // NETS Easy is restricted to the Norwegian Open event only
  if (participant.event_id !== NETS_ALLOWED_EVENT_ID) {
    return json({ error: 'NETS Easy payment is not available for this event' }, { status: 403 });
  }

  const { data: buyerProfile } = await db
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  const buyerName = buyerProfile?.username ?? user.email ?? 'Unknown';
  const eventTitle = (participant.events as any)?.title ?? 'Event';
  const feeModel: string = (participant.events as any)?.stripe_fee_model ?? 'on_top';

  // Get pending cart items
  const { data: cartItems, error: cartError } = await db
    .from('participant_products')
    .select('id, product_name, unit_price, quantity_ordered, subtotal, mva_rate, mva_amount, currency_type')
    .eq('participant_id', participant_id)
    .eq('payment_status', 'pending');

  if (cartError || !cartItems || cartItems.length === 0) {
    return json({ error: 'No pending items found' }, { status: 400 });
  }

  const currency = cartItems[0].currency_type?.toUpperCase() ?? 'NOK';
  const ticketSubtotal = cartItems.reduce((sum, item) => sum + Number(item.subtotal), 0);

  const handlingFeeAmount = feeModel === 'on_top' ? Math.round(ticketSubtotal * 0.035 * 100) : 0; // øre
  const serviceFeeAmount = Math.round(ticketSubtotal * 0.01 * 100); // øre
  const totalAmount = Math.round(ticketSubtotal * 100) + handlingFeeAmount + serviceFeeAmount;

  // Build NETS Easy order items (amounts in øre)
  const orderItems = cartItems.map((item) => {
    const unitPrice = Math.round(Number(item.unit_price) * 100);
    const grossTotal = Math.round(Number(item.subtotal) * 100);
    const mvaRate = Number(item.mva_rate ?? 0);
    const taxAmount = Math.round(Number(item.mva_amount ?? 0) * 100);
    const netTotal = grossTotal - taxAmount;

    return {
      reference: item.id,
      name: item.product_name,
      quantity: item.quantity_ordered,
      unit: 'pcs',
      unitPrice,
      taxRate: Math.round(mvaRate * 100), // basis points: 25% → 2500
      taxAmount,
      grossTotalAmount: grossTotal,
      netTotalAmount: netTotal
    };
  });

  // Add fee line items (no tax on fees)
  if (feeModel === 'on_top') {
    orderItems.push({
      reference: 'handling-fee',
      name: 'Payment handling fee (3.5%)',
      quantity: 1,
      unit: 'pcs',
      unitPrice: handlingFeeAmount,
      taxRate: 0,
      taxAmount: 0,
      grossTotalAmount: handlingFeeAmount,
      netTotalAmount: handlingFeeAmount
    });
  }
  orderItems.push({
    reference: 'service-fee',
    name: 'Platform service fee (1%)',
    quantity: 1,
    unit: 'pcs',
    unitPrice: serviceFeeAmount,
    taxRate: 0,
    taxAmount: 0,
    grossTotalAmount: serviceFeeAmount,
    netTotalAmount: serviceFeeAmount
  });

  const isLocal = url.origin.includes('localhost');
  // Return URLs always use actual origin so localhost redirects back to localhost
  const returnOrigin = url.origin;
  // Webhook URL needs to be publicly reachable; use tunnel for local dev if set
  const webhookOrigin = isLocal
    ? (NETS_LOCAL_TUNNEL_URL || 'https://dancepoint.no')
    : url.origin;
  const webhookUrl = `${webhookOrigin}/api/nets/webhook`;

  const payload = {
    order: {
      items: orderItems,
      amount: totalAmount,
      currency,
      reference: participant_id
    },
    checkout: {
      integrationType: 'HostedPaymentPage',
      returnUrl: `${returnOrigin}/checkout/success`,
      cancelUrl: `${returnOrigin}/checkout/cancel`,
      termsUrl: `${returnOrigin}/terms`,
      charge: true // auto-capture on checkout completion
    },
    notifications: {
      webHooks: [
        {
          eventName: 'payment.checkout.completed',
          url: webhookUrl,
          authorization: NETS_WEBHOOK_SECRET
        },
        {
          eventName: 'payment.charge.failed',
          url: webhookUrl,
          authorization: NETS_WEBHOOK_SECRET
        },
        {
          eventName: 'payment.cancel.created',
          url: webhookUrl,
          authorization: NETS_WEBHOOK_SECRET
        }
      ]
    }
  };

  try {
    const { paymentId, hostedPaymentPageUrl } = await createNetsPayment(payload);
    return json({ url: hostedPaymentPageUrl, paymentId });
  } catch (err) {
    console.error('Failed to create NETS Easy payment:', err);
    return json({ error: 'Failed to create payment session' }, { status: 500 });
  }
};
