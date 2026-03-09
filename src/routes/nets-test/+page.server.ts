import { NETS_ALLOWED_EVENT_ID, NETS_TEST_MODE } from '$env/static/private';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Only available in test mode
  if (NETS_TEST_MODE !== 'true') {
    throw redirect(302, '/');
  }

  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(302, '/signin');

  // Load user's participant row for the Norwegian Open event
  const { data: participants } = await locals.supabase
    .from('event_participants')
    .select('id, events ( title )')
    .eq('user_id', user.id)
    .eq('event_id', NETS_ALLOWED_EVENT_ID);

  // Load their pending products
  const participantIds = (participants ?? []).map((p) => p.id);

  const { data: pendingProducts } = participantIds.length
    ? await locals.supabase
        .from('participant_products')
        .select('id, product_name, subtotal, currency_type, participant_id')
        .in('participant_id', participantIds)
        .eq('payment_status', 'pending')
    : { data: [] };

  return {
    participants: participants ?? [],
    pendingProducts: pendingProducts ?? [],
    eventId: NETS_ALLOWED_EVENT_ID
  };
};
