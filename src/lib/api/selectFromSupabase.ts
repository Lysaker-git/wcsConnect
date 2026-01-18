import { supabase } from './supabaseClient';

export async function selectFromSupabase(table: string, columns: string = '*', eventId: string) {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq('id', eventId)
    .single();
  return { data, error };
}
