import { supabase } from '$lib/server/supabaseServiceClient';
import { getUserClient } from '$lib/server/supabaseUserClient';
import { error as svelteError, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const { registrationID } = params;

  const sbUser = cookies.get('sb_user');
  if (!sbUser) throw svelteError(401, 'Not authenticated');

  let user: any;
  try { user = JSON.parse(sbUser); } catch { throw svelteError(401, 'Invalid session'); }

  const db = getUserClient(cookies);
  if (!db) throw svelteError(401, 'Session expired');

  // Fetch participant — RLS ensures it belongs to this user
  const { data: participant, error: participantError } = await db
    .from('event_participants')
    .select(`
      id, event_id, user_id, status, event_role,
      wsdcLevel, wsdcID, role, country, age, partner_name, created_at,
      events ( id, title, start_date, end_date, stripe_fee_model )
    `)
    .eq('id', registrationID)
    .eq('user_id', user.id)
    .single();

  if (participantError || !participant) {
    throw svelteError(404, 'Registration not found');
  }

  // Fetch participant's products
  const { data: participantProducts } = await db
    .from('participant_products')
    .select('*')
    .eq('participant_id', registrationID)
    .order('created_at', { ascending: true });

  const allProducts = participantProducts ?? [];
  const unpaidProducts = allProducts.filter(p => p.payment_status === 'pending');
  const paidProducts = allProducts.filter(p => p.payment_status === 'paid');
  const unpaidTotal = unpaidProducts.reduce((sum, p) => sum + parseFloat(p.subtotal), 0);
  const paidTotal = paidProducts.reduce((sum, p) => sum + parseFloat(p.subtotal), 0);

  const now = new Date().toISOString();
  const purchasedProductIds = new Set(allProducts.map(p => p.product_id));

  // Fetch available tickets
  const { data: eventTickets } = await db
    .from('products')
    .select('*')
    .eq('event_id', participant.event_id)
    .eq('product_type', 'ticket')
    .eq('is_active', true)
    .or(`sale_start.is.null,sale_start.lte.${now}`)
    .or(`sale_end.is.null,sale_end.gte.${now}`);

  const availableTickets = (eventTickets ?? []).filter(p => {
    if (p.max_per_user === 1 && purchasedProductIds.has(p.id)) return false;
    if (p.quantity_total && p.quantity_sold >= p.quantity_total) return false;
    return true;
  });

  // Fetch non-ticket products if approved
  let availableProducts: any[] = [];
  if (participant.status === 'approved') {
    const { data: eventProducts } = await db
      .from('products')
      .select('*')
      .eq('event_id', participant.event_id)
      .eq('is_active', true)
      .or(`sale_start.is.null,sale_start.lte.${now}`)
      .or(`sale_end.is.null,sale_end.gte.${now}`);

    availableProducts = (eventProducts ?? []).filter(p => {
      if (p.product_type === 'ticket') return false;
      if (p.max_per_user === 1 && purchasedProductIds.has(p.id)) return false;
      if (p.quantity_total && p.quantity_sold >= p.quantity_total) return false;
      return true;
    });
  }

  return {
    participant,
    participantProducts: allProducts,
    unpaidProducts,
    paidProducts,
    unpaidTotal,
    paidTotal,
    availableProducts,
    availableTickets,
    stripe_fee_model: (participant.events as any)?.stripe_fee_model ?? 'on_top',
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

    const db = getUserClient(cookies);
    if (!db) return fail(401, { message: 'Session expired' });

    // Verify ownership via user client
    const { data: participant } = await db
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

    // Fetch product via user client (public read)
    const { data: product } = await db
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('event_id', participant.event_id)
      .single();

    if (!product) return fail(404, { message: 'Product not found' });

    // Check for duplicate ticket
    if (product.product_type === 'ticket') {
      const { data: existingTicket } = await db
        .from('participant_products')
        .select('id')
        .eq('participant_id', registrationID)
        .eq('product_type', 'ticket')
        .maybeSingle();
      if (existingTicket) return fail(400, { message: 'You already have a ticket' });
    }

    // Check for duplicate max_per_user=1
    if (product.max_per_user === 1) {
      const { data: existing } = await db
        .from('participant_products')
        .select('id')
        .eq('participant_id', registrationID)
        .eq('product_id', product_id)
        .maybeSingle();
      if (existing) return fail(400, { message: 'You already have this product' });
    }

    if (product.quantity_total && (product.quantity_sold + quantity) > product.quantity_total) {
      return fail(400, { message: 'Product is sold out' });
    }

    let unitPrice = parseFloat(product.price);
    if (product.product_type === 'ticket' && promo_code && promo_discount > 0) {
      unitPrice = unitPrice * (1 - promo_discount / 100);
    }

    // Insert + quantity update via service role (inventory management)
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
        subtotal: unitPrice * quantity,
        payment_status: 'pending',
        confirmation_status: 'pending',
        promo_code_used: promo_code
      });

    if (insertError) return fail(500, { message: insertError.message });

    await supabase
      .from('products')
      .update({ quantity_sold: (product.quantity_sold ?? 0) + quantity })
      .eq('id', product.id);

    return { success: true };
  },

  updateRegistration: async ({ request, params, cookies }) => {
    const { registrationID } = params;

    const sbUser = cookies.get('sb_user');
    if (!sbUser) return fail(401, { message: 'Not authenticated' });
    let user: any;
    try { user = JSON.parse(sbUser); } catch { return fail(401, { message: 'Invalid session' }); }

    const db = getUserClient(cookies);
    if (!db) return fail(401, { message: 'Session expired' });

    // Verify ownership via user client
    const { data: participant } = await db
      .from('event_participants')
      .select('id, event_id, user_id, status')
      .eq('id', registrationID)
      .eq('user_id', user.id)
      .single();

    if (!participant) return fail(404, { message: 'Registration not found' });

    const allowedStatuses = ['pending', 'pending_single_registration', 'pending_couples_registration'];
    if (!allowedStatuses.includes(participant.status)) {
      return fail(400, { message: 'Registration cannot be edited in its current status' });
    }

    const form = await request.formData();
    const role = form.get('role')?.toString() || null;
    const wsdcID = form.get('wsdcID')?.toString() || null;
    const wsdcLevel = form.get('wsdcLevel')?.toString() || null;
    const country = form.get('country')?.toString() || null;
    const age = form.get('age')?.toString() || null;
    const partner_name = form.get('partner_name')?.toString() || null;
    const promo_code = form.get('promo_code')?.toString() || null;
    const promo_discount = parseFloat(form.get('promo_discount')?.toString() || '0');
    const ticket_product_id = form.get('ticket_product_id')?.toString() || null;

    const updatePayload: Record<string, any> = {
      role: role ?? undefined,
      event_role: role ?? undefined,
      wsdcID: wsdcID ? parseInt(wsdcID) : null,
      wsdcLevel: wsdcLevel ?? null,
      country: country ?? null,
      age: age || null,
      partner_name: partner_name ?? null
    };

    if (partner_name && partner_name.trim().length > 0) {
      updatePayload.status = 'pending_couples_registration';
    }

    // Update own participant record via user client — RLS allows this
    const { error: updateError } = await db
      .from('event_participants')
      .update(updatePayload)
      .eq('id', registrationID);

    if (updateError) return fail(500, { message: updateError.message });

    // Ticket swap — service role for inventory management
    if (ticket_product_id) {
      const { data: existingTicket } = await db
        .from('participant_products')
        .select('*')
        .eq('participant_id', registrationID)
        .eq('product_type', 'ticket')
        .maybeSingle();

      const { data: newProduct } = await db
        .from('products')
        .select('*')
        .eq('id', ticket_product_id)
        .eq('event_id', participant.event_id)
        .eq('is_active', true)
        .single();

      if (!newProduct) return fail(400, { message: 'Selected ticket not available' });

      if (newProduct.quantity_total && (newProduct.quantity_sold + 1) > newProduct.quantity_total) {
        return fail(400, { message: 'Selected ticket is sold out' });
      }

      let newUnitPrice = parseFloat(newProduct.price);
      if (promo_code && promo_discount > 0) {
        newUnitPrice = newUnitPrice * (1 - promo_discount / 100);
      }

      if (existingTicket && existingTicket.product_id === newProduct.id) {
        // Same ticket — apply promo only
        if (promo_code && promo_discount > 0) {
          await supabase
            .from('participant_products')
            .update({
              unit_price: newUnitPrice,
              subtotal: newUnitPrice * (existingTicket.quantity_ordered ?? 1),
              promo_code_used: promo_code
            })
            .eq('id', existingTicket.id);
        }
      } else if (existingTicket) {
        // Swap ticket
        const { error: ppError } = await supabase
          .from('participant_products')
          .update({
            product_id: newProduct.id,
            product_name: newProduct.name,
            unit_price: newUnitPrice,
            currency_type: newProduct.currency_type,
            subtotal: newUnitPrice * (existingTicket.quantity_ordered ?? 1),
            promo_code_used: promo_code
          })
          .eq('id', existingTicket.id);

        if (ppError) return fail(500, { message: ppError.message });

        // Adjust quantities on both products
        const { data: oldProduct } = await supabase
          .from('products').select('quantity_sold').eq('id', existingTicket.product_id).single();
        const qty = existingTicket.quantity_ordered ?? 1;

        await supabase
          .from('products')
          .update({ quantity_sold: Math.max((oldProduct?.quantity_sold ?? 0) - qty, 0) })
          .eq('id', existingTicket.product_id);

        await supabase
          .from('products')
          .update({ quantity_sold: (newProduct.quantity_sold ?? 0) + qty })
          .eq('id', newProduct.id);

      } else {
        // No existing ticket — insert new
        const { error: insertError } = await supabase
          .from('participant_products')
          .insert({
            participant_id: registrationID,
            product_id: newProduct.id,
            product_name: newProduct.name,
            product_type: 'ticket',
            quantity_ordered: 1,
            unit_price: newUnitPrice,
            currency_type: newProduct.currency_type,
            subtotal: newUnitPrice,
            payment_status: 'pending',
            confirmation_status: 'pending',
            promo_code_used: promo_code
          });

        if (insertError) return fail(500, { message: insertError.message });

        await supabase
          .from('products')
          .update({ quantity_sold: (newProduct.quantity_sold ?? 0) + 1 })
          .eq('id', newProduct.id);
      }
    }

    // Apply promo to existing tickets when no swap
    if (promo_code && promo_discount > 0 && !ticket_product_id) {
      const { data: tickets } = await supabase
        .from('participant_products')
        .select('id, product_id, quantity_ordered')
        .eq('participant_id', registrationID)
        .eq('product_type', 'ticket');

      for (const t of tickets ?? []) {
        const { data: product } = await supabase
          .from('products').select('price').eq('id', t.product_id).single();
        if (product) {
          const unitPrice = parseFloat(product.price) * (1 - promo_discount / 100);
          await supabase
            .from('participant_products')
            .update({
              unit_price: unitPrice,
              subtotal: unitPrice * (t.quantity_ordered ?? 1),
              promo_code_used: promo_code
            })
            .eq('id', t.id);
        }
      }
    }

    return { success: true };
  }
};