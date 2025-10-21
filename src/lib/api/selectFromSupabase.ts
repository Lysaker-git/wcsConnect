import { supabase } from './supabaseClient';

export async function selectFromSupabase(table: string, columns: string = '*') {
  const { data, error } = await supabase
    .from(table)
    .select(columns);
  return { data, error };
}
