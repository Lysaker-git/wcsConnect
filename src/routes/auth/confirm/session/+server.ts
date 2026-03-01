import { supabase as serviceRole } from '$lib/server/supabaseServiceClient';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
  const { user_id, email } = await request.json();
  if (!user_id) return json({ error: 'Missing user_id' }, { status: 400 });

  // The SSR client already has the session from the email confirmation flow
  // Just rebuild the display cookie
  const { data: profile } = await serviceRole
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
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7
  });

  return json({ success: true });
};