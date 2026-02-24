import { supabase } from '$lib/server/supabaseServiceClient';
import { error as svelteError, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

async function verifyED(eventId: string, userId: string) {
  const { data } = await supabase
    .from('event_participants')
    .select('event_role')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('event_role', 'Event Director')
    .single();
  return !!data;
}

export const load: PageServerLoad = async ({ params, cookies }) => {
  const { eventId } = params;

  const sbUser = cookies.get('sb_user');
  if (!sbUser) throw svelteError(401, 'Not authenticated');

  let user: any;
  try { user = JSON.parse(sbUser); } catch { throw svelteError(401, 'Invalid session'); }

  if (!(await verifyED(eventId, user.id))) {
    throw svelteError(403, 'Access denied');
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, title')
    .eq('id', eventId)
    .single();

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .eq('event_id', eventId)
    .order('product_type', { ascending: true })
    .order('created_at', { ascending: true });

  if (productsError) throw svelteError(500, 'Failed to load products');

  const { data: productGroups } = await supabase
    .from('product_groups')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  return { event, products: products ?? [], productGroups: productGroups ?? [] };
};

export const actions: Actions = {
  createProduct: async ({ request, params, cookies }) => {
    const { eventId } = params;
    const sbUser = cookies.get('sb_user');
    if (!sbUser) return fail(401, { message: 'Not authenticated' });

    let user: any;
    try { user = JSON.parse(sbUser); } catch { return fail(401, { message: 'Invalid session' }); }
    if (!(await verifyED(eventId, user.id))) return fail(403, { message: 'Access denied' });

    const form = await request.formData();
    const name = form.get('name')?.toString();
    const description = form.get('description')?.toString() || null;
    const price = parseFloat(form.get('price')?.toString() || '0');
    const product_type = form.get('product_type')?.toString();
    const currency_type = form.get('currency_type')?.toString() || 'EUR';
    const sale_start = form.get('sale_start')?.toString() || null;
    const sale_end = form.get('sale_end')?.toString() || null;
    const quantity_total = form.get('quantity_total')?.toString() ? parseInt(form.get('quantity_total')!.toString()) : null;
    const leader_limit = form.get('leader_limit')?.toString() ? parseInt(form.get('leader_limit')!.toString()) : null;
    const follower_limit = form.get('follower_limit')?.toString() ? parseInt(form.get('follower_limit')!.toString()) : null;
    const is_active = form.get('is_active') === 'on';
    const max_per_user = form.get('max_per_user')?.toString() ? parseInt(form.get('max_per_user')!.toString()) : null;
    const discount_percent = form.get('discount_percent')?.toString() 
      ? parseFloat(form.get('discount_percent')!.toString()) 
      : null;
    const room_capacity = form.get('room_capacity')?.toString()
      ? parseInt(form.get('room_capacity')!.toString())
      : null;
    const product_group_id = form.get('product_group_id')?.toString() || null;

    if (!name || !product_type || price < 0) return fail(400, { message: 'Missing required fields' });

    const { error } = await supabase
      .from('products')
      .insert({
        event_id: eventId,
        name,
        description,
        price,
        product_type,
        currency_type,
        sale_start,
        sale_end,
        quantity_total,
        quantity_sold: 0,
        leader_limit,
        follower_limit,
        is_active,
        max_per_user,
        discount_percent,
        room_capacity,
        product_group_id
      });

    if (error) return fail(500, { message: error.message });
    return { success: true };
  },

  updateProduct: async ({ request, params, cookies }) => {
    const { eventId } = params;
    const sbUser = cookies.get('sb_user');
    if (!sbUser) return fail(401, { message: 'Not authenticated' });

    let user: any;
    try { user = JSON.parse(sbUser); } catch { return fail(401, { message: 'Invalid session' }); }
    if (!(await verifyED(eventId, user.id))) return fail(403, { message: 'Access denied' });

    const form = await request.formData();
    const productId = form.get('productId')?.toString();
    const name = form.get('name')?.toString();
    const description = form.get('description')?.toString() || null;
    const price = parseFloat(form.get('price')?.toString() || '0');
    const product_type = form.get('product_type')?.toString();
    const currency_type = form.get('currency_type')?.toString() || 'EUR';
    const sale_start = form.get('sale_start')?.toString() || null;
    const sale_end = form.get('sale_end')?.toString() || null;
    const quantity_total = form.get('quantity_total')?.toString() ? parseInt(form.get('quantity_total')!.toString()) : null;
    const leader_limit = form.get('leader_limit')?.toString() ? parseInt(form.get('leader_limit')!.toString()) : null;
    const follower_limit = form.get('follower_limit')?.toString() ? parseInt(form.get('follower_limit')!.toString()) : null;
    const is_active = form.get('is_active') === 'on';
    const max_per_user = form.get('max_per_user')?.toString() ? parseInt(form.get('max_per_user')!.toString()) : null;
    const discount_percent = form.get('discount_percent')?.toString() 
      ? parseFloat(form.get('discount_percent')!.toString()) 
      : null;
    const room_capacity = form.get('room_capacity')?.toString()
      ? parseInt(form.get('room_capacity')!.toString())
      : null;
    const product_group_id = form.get('product_group_id')?.toString() || null;
    if (!productId || !name || !product_type) return fail(400, { message: 'Missing required fields' });

    const { error } = await supabase
      .from('products')
      .update({
        name, 
        description, 
        price, 
        product_type, 
        currency_type,
        sale_start, 
        sale_end, 
        quantity_total, 
        leader_limit,
        follower_limit, 
        is_active, 
        max_per_user, 
        discount_percent,
        room_capacity,
        product_group_id,
      })
      .eq('id', productId)
      .eq('event_id', eventId);

    if (error) return fail(500, { message: error.message });
    return { success: true };
  },

  deleteProduct: async ({ request, params, cookies }) => {
      const { eventId } = params;
      const sbUser = cookies.get('sb_user');
      if (!sbUser) return fail(401, { message: 'Not authenticated' });

      let user: any;
      try { user = JSON.parse(sbUser); } catch { return fail(401, { message: 'Invalid session' }); }
      if (!(await verifyED(eventId, user.id))) return fail(403, { message: 'Access denied' });

      const form = await request.formData();
      const productId = form.get('productId')?.toString();
      if (!productId) return fail(400, { message: 'Missing product ID' });

      // Check if anyone has purchased this product
      const { count } = await supabase
          .from('participant_products')
          .select('id', { count: 'exact', head: true })
          .eq('product_id', productId);

      if (count && count > 0) {
          return fail(400, { 
          message: `Cannot delete — ${count} participant(s) have purchased this product. Deactivate it instead to hide it from new registrations.`
          });
      }

      const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', productId)
          .eq('event_id', eventId);

      if (error) return fail(500, { message: error.message });
      return { success: true };
  },
  createGroup: async ({ request, params, cookies }) => {
    const { eventId } = params;
    const sbUser = cookies.get('sb_user');
    if (!sbUser) return fail(401, { message: 'Not authenticated' });

    let user: any;
    try { user = JSON.parse(sbUser); } catch { return fail(401, { message: 'Invalid session' }); }
    if (!(await verifyED(eventId, user.id))) return fail(403, { message: 'Access denied' });

    const form = await request.formData();
    const name = form.get('name')?.toString().trim();
    const quantity_total = parseInt(form.get('quantity_total')?.toString() ?? '0');

    if (!name || quantity_total <= 0) return fail(400, { message: 'Name and quantity required' });

    const { error } = await supabase
      .from('product_groups')
      .insert({ event_id: eventId, name, quantity_total, quantity_sold: 0 });

    if (error) return fail(500, { message: error.message });
    return { success: true, action: 'createGroup' };
  },

  deleteGroup: async ({ request, params, cookies }) => {
    const { eventId } = params;
    const sbUser = cookies.get('sb_user');
    if (!sbUser) return fail(401, { message: 'Not authenticated' });

    let user: any;
    try { user = JSON.parse(sbUser); } catch { return fail(401, { message: 'Invalid session' }); }
    if (!(await verifyED(eventId, user.id))) return fail(403, { message: 'Access denied' });

    const form = await request.formData();
    const groupId = form.get('groupId')?.toString();
    if (!groupId) return fail(400, { message: 'Missing group ID' });

    // Unassign all products from group first
    await supabase
      .from('products')
      .update({ product_group_id: null })
      .eq('product_group_id', groupId);

    const { error } = await supabase
      .from('product_groups')
      .delete()
      .eq('id', groupId)
      .eq('event_id', eventId);

    if (error) return fail(500, { message: error.message });
    return { success: true, action: 'deleteGroup' };
  },

  assignGroup: async ({ request, params, cookies }) => {
    const { eventId } = params;
    const sbUser = cookies.get('sb_user');
    if (!sbUser) return fail(401, { message: 'Not authenticated' });

    let user: any;
    try { user = JSON.parse(sbUser); } catch { return fail(401, { message: 'Invalid session' }); }
    if (!(await verifyED(eventId, user.id))) return fail(403, { message: 'Access denied' });

    const form = await request.formData();
    const productId = form.get('productId')?.toString();
    const product_group_id = form.get('product_group_id')?.toString() || null;

    if (!productId) return fail(400, { message: 'Missing product ID' });

    const { error } = await supabase
      .from('products')
      .update({ product_group_id })
      .eq('id', productId)
      .eq('event_id', eventId);

    if (error) return fail(500, { message: error.message });
    return { success: true, action: 'assignGroup' };
  }
};