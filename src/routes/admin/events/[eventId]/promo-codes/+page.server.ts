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
    .in('event_role', ['Event Director', 'Event Super User'])
    .single();

  return !!ed;
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const { eventId } = params;

  const { user } = await locals.safeGetSession();
  if (!user) throw svelteError(401, 'Not authenticated');

  if (!(await verifyAccess(eventId, user.id))) throw svelteError(403, 'Access denied');

  const { data: event } = await supabase
    .from('events')
    .select('id, title')
    .eq('id', eventId)
    .single();

  const { data: promoCodes } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  return { event, promoCodes: promoCodes ?? [] };
};

export const actions: Actions = {
  createCode: async ({ request, params, locals }) => {
    const { eventId } = params;

    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Not authenticated' });

    if (!(await verifyAccess(eventId, user.id))) return fail(403, { message: 'Access denied' });

    const form = await request.formData();
    const code = form.get('code')?.toString().toUpperCase().trim();
    const discount_percent = parseFloat(form.get('discount_percent')?.toString() ?? '0');
    const valid_from = form.get('valid_from')?.toString();
    const valid_to = form.get('valid_to')?.toString();

    if (!code || !discount_percent || !valid_from || !valid_to) {
      return fail(400, { message: 'All fields are required' });
    }

    if (discount_percent <= 0 || discount_percent > 100) {
      return fail(400, { message: 'Discount must be between 1 and 100' });
    }

    const { error } = await supabase
      .from('promo_codes')
      .insert({
        event_id: eventId,
        code,
        discount_percent,
        valid_from,
        valid_to,
        is_active: true,
        created_by: user.id
      });

    if (error) {
      if (error.code === '23505') return fail(400, { message: 'A code with that name already exists for this event' });
      return fail(500, { message: error.message });
    }

    return { success: true };
  },

  toggleCode: async ({ request, params, locals }) => {
    const { eventId } = params;

    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Not authenticated' });

    if (!(await verifyAccess(eventId, user.id))) return fail(403, { message: 'Access denied' });

    const form = await request.formData();
    const id = form.get('id')?.toString();
    const is_active = form.get('is_active') === 'true';

    const { error } = await supabase
      .from('promo_codes')
      .update({ is_active: !is_active })
      .eq('id', id)
      .eq('event_id', eventId);

    if (error) return fail(500, { message: error.message });
    return { success: true };
  },

  deleteCode: async ({ request, params, locals }) => {
    const { eventId } = params;

    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Not authenticated' });

    if (!(await verifyAccess(eventId, user.id))) return fail(403, { message: 'Access denied' });

    const form = await request.formData();
    const id = form.get('id')?.toString();

    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id)
      .eq('event_id', eventId);

    if (error) return fail(500, { message: error.message });
    return { success: true };
  }
};