import { selectAllFromSupabase } from '$lib/api/selectFromSupabase';

export async function load() {
  // fetch events and include related event_details to get event_type
  const { data: events, error } = await selectAllFromSupabase('events', '*, event_details(*)');
  return { events, error };
}
