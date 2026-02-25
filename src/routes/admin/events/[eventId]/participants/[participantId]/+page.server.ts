import { supabase } from '$lib/server/supabaseServiceClient';
import { error as svelteError, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

async function verifyAccess(eventId: string, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('userRole')
    .eq('id', userId)
    .single();

  if ((profile?.userRole ?? []).includes('Owner')) return true;

  const { data: ed } = await supabase
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('event_role', 'Event Director')
    .single();

  return !!ed;
}

export const load: PageServerLoad = async ({ params, cookies }) => {
  const { eventId, participantId } = params;

  const sbUser = cookies.get('sb_user');
  if (!sbUser) throw svelteError(401, 'Not authenticated');

  let user: any;
  try { user = JSON.parse(sbUser); } catch { throw svelteError(401, 'Invalid session'); }

  if (!(await verifyAccess(eventId, user.id))) throw svelteError(403, 'Access denied');

  // Fetch event
  const { data: event } = await supabase
    .from('events')
    .select('id, title')
    .eq('id', eventId)
    .single();

  // Fetch participant with profile
  const { data: participant, error: pError } = await supabase
    .from('event_participants')
    .select(`
      id, event_id, user_id, status, event_role, role,
      wsdcID, wsdcLevel, country, age, partner_name, created_at,
      profiles ( username, avatar_url )
    `)
    .eq('id', participantId)
    .eq('event_id', eventId)
    .single();

  if (pError || !participant) throw svelteError(404, 'Participant not found');

  // Fetch participant products
  const { data: participantProducts } = await supabase
    .from('participant_products')
    .select('*')
    .eq('participant_id', participantId)
    .order('created_at', { ascending: true });

  // Fetch all event products for adding
  const { data: eventProducts } = await supabase
    .from('products')
    .select('*')
    .eq('event_id', eventId)
    .order('product_type', { ascending: true });

  // Fetch active promo codes for this event
  const { data: promoCodes } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  return {
    event,
    participant,
    participantProducts: participantProducts ?? [],
    eventProducts: eventProducts ?? [],
    promoCodes: promoCodes ?? []
  };
};

export const actions: Actions = {
  updateParticipant: async ({ request, params, cookies }) => {
    const { eventId, participantId } = params;
    const sbUser = cookies.get('sb_user');
    if (!sbUser) return fail(401, { message: 'Not authenticated' });

    let user: any;
    try { user = JSON.parse(sbUser); } catch { return fail(401, { message: 'Invalid session' }); }
    if (!(await verifyAccess(eventId, user.id))) return fail(403, { message: 'Access denied' });

    const form = await request.formData();

    const status = form.get('status')?.toString();
    const role = form.get('role')?.toString();
    const wsdcLevel = form.get('wsdcLevel')?.toString();
    const partner_name = form.get('partner_name')?.toString() || null;
    const country = form.get('country')?.toString();
    const wsdcID = form.get('wsdcID')?.toString();

    const { error } = await supabase
      .from('event_participants')
      .update({
        status,
        role,
        event_role: role,
        wsdcLevel,
        partner_name,
        country,
        wsdcID: wsdcID ? parseInt(wsdcID) : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', participantId)
      .eq('event_id', eventId);

    if (error) return fail(500, { message: error.message });
    return { success: true, action: 'updateParticipant' };
  },

  addProduct: async ({ request, params, cookies }) => {
    const { eventId, participantId } = params;
    const sbUser = cookies.get('sb_user');
    if (!sbUser) return fail(401, { message: 'Not authenticated' });

    let user: any;
    try { user = JSON.parse(sbUser); } catch { return fail(401, { message: 'Invalid session' }); }
    if (!(await verifyAccess(eventId, user.id))) return fail(403, { message: 'Access denied' });

    const form = await request.formData();
    const product_id = form.get('product_id')?.toString();
    const quantity = parseInt(form.get('quantity')?.toString() ?? '1');
    const override_price = form.get('override_price')?.toString();
    const promo_code = form.get('promo_code')?.toString() || null;
    const promo_discount = parseFloat(form.get('promo_discount')?.toString() || '0');

    if (!product_id) return fail(400, { message: 'Missing product' });

    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('event_id', eventId)
      .single();

    if (!product) return fail(404, { message: 'Product not found' });

    let unitPrice = override_price ? parseFloat(override_price) : parseFloat(product.price);
    // Apply promo discount to ticket-type products
    if (promo_code && promo_discount > 0 && product.product_type === 'ticket') {
      unitPrice = unitPrice * (1 - promo_discount / 100);
    }
    const subtotal = unitPrice * quantity;

    const { error } = await supabase
      .from('participant_products')
      .insert({
        participant_id: participantId,
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

    if (error) return fail(500, { message: error.message });

    // Update quantity_sold
    await supabase
      .from('products')
      .update({ quantity_sold: (product.quantity_sold ?? 0) + quantity })
      .eq('id', product.id);

    return { success: true, action: 'addProduct' };
  },

  removeProduct: async ({ request, params, cookies }) => {
    const { eventId, participantId } = params;
    const sbUser = cookies.get('sb_user');
    if (!sbUser) return fail(401, { message: 'Not authenticated' });

    let user: any;
    try { user = JSON.parse(sbUser); } catch { return fail(401, { message: 'Invalid session' }); }
    if (!(await verifyAccess(eventId, user.id))) return fail(403, { message: 'Access denied' });

    const form = await request.formData();
    const participantProductId = form.get('participantProductId')?.toString();
    if (!participantProductId) return fail(400, { message: 'Missing product ID' });

    // Fetch to get quantity and product_id for decrementing quantity_sold
    const { data: pp } = await supabase
      .from('participant_products')
      .select('product_id, quantity_ordered, payment_status')
      .eq('id', participantProductId)
      .single();

    const { error } = await supabase
      .from('participant_products')
      .delete()
      .eq('id', participantProductId)
      .eq('participant_id', participantId);

    if (error) return fail(500, { message: error.message });

    // Decrement quantity_sold on the product
    if (pp?.product_id) {
      const { data: product } = await supabase
        .from('products')
        .select('quantity_sold')
        .eq('id', pp.product_id)
        .single();

      if (product) {
        await supabase
          .from('products')
          .update({ quantity_sold: Math.max(0, (product.quantity_sold ?? 0) - (pp.quantity_ordered ?? 1)) })
          .eq('id', pp.product_id);
      }
    }

    return { success: true, action: 'removeProduct' };
  },

  updateProduct: async ({ request, params, cookies }) => {
    const { eventId, participantId } = params;
    const sbUser = cookies.get('sb_user');
    if (!sbUser) return fail(401, { message: 'Not authenticated' });



    let user: any;
    try { user = JSON.parse(sbUser); } catch { return fail(401, { message: 'Invalid session' }); }
    if (!(await verifyAccess(eventId, user.id))) return fail(403, { message: 'Access denied' });

    const form = await request.formData();
    const participantProductId = form.get('participantProductId')?.toString();
    const payment_status = form.get('payment_status')?.toString();
    const quantity_ordered = parseInt(form.get('quantity_ordered')?.toString() ?? '1');
    const unit_price = parseFloat(form.get('unit_price')?.toString() ?? '0');

    if (!participantProductId) return fail(400, { message: 'Missing product ID' });

    const subtotal = unit_price * quantity_ordered;

    // Block edits on paid products
    const { data: existing } = await supabase
        .from('participant_products')
        .select('payment_status')
        .eq('id', participantProductId)
        .single();

        if (existing?.payment_status === 'paid') {
        return fail(400, { message: 'Cannot edit a paid product' });
    }

    const { error } = await supabase
      .from('participant_products')
      .update({ payment_status, quantity_ordered, unit_price, subtotal })
      .eq('id', participantProductId)
      .eq('participant_id', participantId);

    if (error) return fail(500, { message: error.message });
    return { success: true, action: 'updateProduct' };
  }
};