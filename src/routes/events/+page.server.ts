import { selectAllFromSupabase } from '$lib/api/selectFromSupabase';

export async function load() {
  const { data: events, error } = await selectAllFromSupabase('events', '*');
  return { events, error };
}
