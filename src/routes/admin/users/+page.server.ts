import { supabase } from '$lib/api/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '$env/static/private';

export const load = async () => {
  // Simplified loader: return all rows from profiles
  try {
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.error('[admin/users load] supabase error', error);
      return { status: 500, error: error.message ?? String(error) };
    }
    const users = (profiles ?? []).map((p: any) => ({ id: p.id, email: p.email ?? null, ...p }));
    return { users };
  } catch (err) {
    return { status: 500, error: (err as any)?.message ?? String(err) };
  }
};
