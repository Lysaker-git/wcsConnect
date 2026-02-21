import { json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabaseServiceClient';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { user_id, email, access_token, refresh_token } = await request.json();

  if (!user_id) return json({ error: 'Missing user_id' }, { status: 400 });

  // Fetch their profile to build the full cookie
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url, userRole')
    .eq('id', user_id)
    .single();

  cookies.set('sb_user', JSON.stringify({
    id: user_id,
    email: email,
    username: profile?.username ?? email?.split('@')[0],
    avatar_url: profile?.avatar_url ?? '',
    userRole: profile?.userRole ?? ['member']
  }), { 
    httpOnly: false, 
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });

  return json({ success: true });
};