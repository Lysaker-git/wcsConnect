import { supabase } from '$lib/server/supabaseServiceClient';
import { error as svelteError, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const { registrationID } = params;

  const sbUser = cookies.get('sb_user');
  if (!sbUser) throw svelteError(401, 'Not authenticated');

  let user: any;
  try { user = JSON.parse(sbUser); } catch { throw svelteError(401, 'Invalid session'); }

  // Fetch participant record — must belong to this user
  const { data: participant, error: participantError } = await supabase
    .from('event_participants')
    .select(`
      id,
      event_id,
      user_id,
      status,
      event_role,
      wsdcLevel,
      role,
      country,
      partner_name,
      created_at,
      events ( id, title, start_date, end_date, stripe_fee_model )
    `)
    .eq('id', registrationID)
    .eq('user_id', user.id)
    .single();

  if (participantError || !participant) {
    throw svelteError(404, 'Registration not found');
  }

  // Fetch products already on this registration
  const { data: participantProducts } = await supabase
    .from('participant_products')
    .select('*')
    .eq('participant_id', registrationID)
    .order('created_at', { ascending: true });

  // Calculate totals
  const allProducts = participantProducts ?? [];
  const unpaidProducts = allProducts.filter(p => p.payment_status === 'pending');
  const paidProducts = allProducts.filter(p => p.payment_status === 'paid');

  const unpaidTotal = unpaidProducts.reduce((sum, p) => sum + parseFloat(p.subtotal), 0);
  const paidTotal = paidProducts.reduce((sum, p) => sum + parseFloat(p.subtotal), 0);

  // Fetch available products for this event (for adding more)
  // Only show if registration is approved
  let availableProducts: any[] = [];
  let availableTickets: any[] = [];
  if (participant.status === 'approved') {
    const now = new Date().toISOString();
    const { data: eventProducts } = await supabase
      .from('products')
      .select('*')
      .eq('event_id', participant.event_id)
      .eq('is_active', true)
      .or(`sale_start.is.null,sale_start.lte.${now}`)
      .or(`sale_end.is.null,sale_end.gte.${now}`);

    // Filter out already purchased 1-per-user products
    const purchasedProductIds = new Set(allProducts.map(p => p.product_id));

    const candidates = (eventProducts ?? []).filter(p => {
      // If max_per_user is 1, hide if already purchased
      if (p.max_per_user === 1 && purchasedProductIds.has(p.id)) return false;
      // Filter out sold out
      if (p.quantity_total && p.quantity_sold >= p.quantity_total) return false;
      return true;
    });

    // Separate tickets from other products. Tickets are managed differently.
    availableProducts = candidates.filter(p => p.product_type !== 'ticket');
    // expose available tickets for optional adding if user has none
    availableTickets = candidates.filter(p => p.product_type === 'ticket');
  }

  const stripe_fee_model = participant.events?.stripe_fee_model ?? 'on_top';

  return {
    participant,
    participantProducts: allProducts,
    unpaidProducts,
    paidProducts,
    unpaidTotal,
    paidTotal,
    availableProducts,
    availableTickets: availableTickets ?? [],
    stripe_fee_model,
    event: participant.events
  };
};

export const actions: Actions = {
  addProduct: async ({ request, params, cookies }) => {
    const { registrationID } = params;

    const sbUser = cookies.get('sb_user');
    if (!sbUser) return fail(401, { message: 'Not authenticated' });

    let user: any;
    try { user = JSON.parse(sbUser); } catch { return fail(401, { message: 'Invalid session' }); }

    // Verify this registration belongs to this user and is approved
    const { data: participant } = await supabase
      .from('event_participants')
      .select('id, event_id, status, user_id')
      .eq('id', registrationID)
      .eq('user_id', user.id)
      .single();

    if (!participant) return fail(404, { message: 'Registration not found' });
    if (participant.status !== 'approved') return fail(400, { message: 'Registration must be approved before adding products' });

    const form = await request.formData();
    const product_id = form.get('product_id')?.toString();
    const quantity = parseInt(form.get('quantity')?.toString() ?? '1');
    const promo_code = form.get('promo_code')?.toString() || null;
    const promo_discount = parseFloat(form.get('promo_discount')?.toString() || '0');

    if (!product_id) return fail(400, { message: 'Missing product' });

    // Fetch product details
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('event_id', participant.event_id)
      .single();

    if (!product) return fail(404, { message: 'Product not found' });
    if (product.product_type === 'ticket') {
      // Ensure user doesn't already have a ticket
      const { data: existingTicket } = await supabase
        .from('participant_products')
        .select('id')
        .eq('participant_id', registrationID)
        .eq('product_type', 'ticket')
        .single();

      if (existingTicket) return fail(400, { message: 'You already have a ticket' });
    }

    // Check max_per_user
    if (product.max_per_user === 1) {
      const { data: existing } = await supabase
        .from('participant_products')
        .select('id')
        .eq('participant_id', registrationID)
        .eq('product_id', product_id)
        .single();

      if (existing) return fail(400, { message: 'You already have this product' });
    }

    // Check availability
    if (product.quantity_total && (product.quantity_sold + quantity) > product.quantity_total) {
      return fail(400, { message: 'Product is sold out' });
    }

    // Apply promo if this is a ticket
    let unitPrice = parseFloat(product.price);
    if (product.product_type === 'ticket' && promo_code && promo_discount > 0) {
      unitPrice = unitPrice * (1 - promo_discount / 100);
    }

    const subtotal = unitPrice * quantity;

    // Insert participant_product
    const { error: insertError } = await supabase
      .from('participant_products')
      .insert({
        participant_id: registrationID,
        product_id: product.id,
        product_name: product.name,
        product_type: product.product_type,
        quantity_ordered: quantity,
        unit_price: unitPrice,
        currency_type: product.currency_type,
        subtotal,
        payment_status: 'pending',
        confirmation_status: 'pending',
        promo_code_used: promo_code
      });

    if (insertError) return fail(500, { message: insertError.message });

    // Update quantity_sold
    await supabase
      .from('products')
      .update({ quantity_sold: (product.quantity_sold ?? 0) + quantity })
      .eq('id', product.id);

    return { success: true };
  }
};