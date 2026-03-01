import type { PageServerLoad } from './$types';
import { supabase } from "$lib/server/supabaseServiceClient";

export const load: PageServerLoad = async ({ locals }) => {
  let myEvents: Array<{ id: string; title: string; start_date?: string; end_date?: string }> = [];

  try {
    const { user } = await locals.safeGetSession();
    if (!user) return { myEvents };

    const { data, error } = await supabase
      .from('event_participants')
      .select(
        `event_id, events ( id, title, start_date, end_date )`
      )
      .eq('user_id', user.id)
      .in('event_role', ['Event Director', 'Event Super User']);

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
