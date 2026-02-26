import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_API_KEY } from '$env/static/public';

// Export a factory function — never a singleton for auth operations
export function createAnonClient() {
  return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_API_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Keep a singleton ONLY for non-auth reads where contamination isn't a risk
// Do NOT call any auth methods on this
export const supabaseAnon = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_API_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});