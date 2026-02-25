import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_API_KEY } from '$env/static/public';

export function createUserClient(accessToken: string) {
  const client = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_API_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
  return client;
}

export function getUserClient(cookies: any) {
  const token = cookies.get('sb_access_token');
  if (!token) return null;
  return createUserClient(token);
}