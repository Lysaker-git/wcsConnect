import { json } from '@sveltejs/kit';
import { supabase } from '$lib/api/supabaseClient';

export async function POST({ cookies }) {
  try {
    // Get access token to revoke the session
    const accessToken = cookies.get('sb_access_token');
    
    // Revoke the session server-side
    if (accessToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: '' });
      await supabase.auth.signOut();
    }
    
    // Clear auth cookies
    cookies.delete('sb_access_token', { path: '/' });
    cookies.delete('sb_user', { path: '/' });

    return json({ success: true });
  } catch (err) {
    console.error('[api/auth/signout] error', err);
    return json({ error: (err as any)?.message ?? String(err) }, { status: 500 });
  }
}
