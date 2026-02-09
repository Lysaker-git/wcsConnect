import type { PageServerLoad } from './$types';
import { supabase } from '$lib/api/supabaseClient';

export const load: PageServerLoad = async ({ cookies }) => {
  let myEvents: Array<{ id: string; title: string; start_date?: string; end_date?: string }> = [];

  try {
    const sbUser = cookies.get('sb_user');
    if (!sbUser) return { myEvents };

    let user: { id?: string } | null = null;
    try {
      user = JSON.parse(sbUser);
    } catch (e) {
      console.warn('[admin/events] failed to parse sb_user cookie', e);
      return { myEvents };
    }

    if (!user?.id) return { myEvents };

    const { data, error } = await supabase
      .from('event_participants')
      .select(
        `event_id, events ( id, title, start_date, end_date )`
      )
      .eq('user_id', user.id)
      .eq('event_role', 'Event Director');

    if (error) {
      console.warn('[admin/events] supabase error', error);
      return { myEvents };
    }

    if (Array.isArray(data)) {
      myEvents = data
        .map((r: any) => r.events)
        .filter(Boolean)
        .map((e: any) => ({ id: e.id, title: e.title, start_date: e.start_date, end_date: e.end_date }));
    }
  } catch (err) {
    console.warn('[admin/events] unexpected error', err);
  }

  return { myEvents };
};
