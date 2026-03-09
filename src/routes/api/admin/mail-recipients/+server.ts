import { supabase } from '$lib/server/supabaseServiceClient';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  const { user } = await locals.safeGetSession();
  if (!user) return json({ error: 'Not authenticated' }, { status: 401 });
  if (!locals.userRole.includes('Owner')) return json({ error: 'Access denied' }, { status: 403 });

  const eventId = url.searchParams.get('event_id');
  if (!eventId) return json({ error: 'Missing event_id' }, { status: 400 });

  const { data: participants, error } = await supabase
    .from('event_participants')
    .select('user_id')
    .eq('event_id', eventId)
    .not('event_role', 'in', '("Event Director","Event Super User")');

  if (error) return json({ error: error.message }, { status: 500 });
  if (!participants || participants.length === 0) return json({ recipients: [] });

  const userIds = participants.map(p => p.user_id);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', userIds);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.username]));

  const recipients: { email: string; username: string }[] = [];
  for (const uid of userIds) {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(uid);
      if (authUser?.user?.email) {
        recipients.push({
          email: authUser.user.email,
          username: profileMap.get(uid) || authUser.user.email
        });
      }
    } catch (e) {
      console.warn(`[mail-recipients] failed to fetch auth user ${uid}:`, e);
    }
  }

  return json({ recipients });
};
