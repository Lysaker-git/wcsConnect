import { selectFromSupabase } from '$lib/api/selectFromSupabase';

export async function load() {
  const { data: events, error } = await selectFromSupabase('events', '*');
  return { events, error };
}
