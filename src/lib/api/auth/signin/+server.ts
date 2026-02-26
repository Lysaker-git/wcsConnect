import { createAnonClient } from '$lib/server/supabaseAnonClient';
import { supabase } from '$lib/server/supabaseServiceClient';
import { json, redirect } from '@sveltejs/kit';

export async function POST({ request, cookies }) {
  try {
    const supabaseAnon = createAnonClient();
    const contentType = request.headers.get('content-type') ?? '';
    let email: string | undefined;
    let password: string | undefined;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      email = body.email?.toString();
      password = body.password?.toString();
    } else {
      const form = await request.formData();
      email = form.get('email')?.toString();
      password = form.get('password')?.toString();
    }

    if (!email || !password) {
      return json({ error: 'Missing email or password' }, { status: 400 });
    }

    // Use anon client for auth — never service role
    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

    if (error) {
      return json({ error: error.message }, { status: 400 });
    }

    const { session, user } = data;

    if (!session) {
      return json({ error: 'No session returned' }, { status: 500 });
    }

    const maxAge = 60 * 60 * 24 * 7; // 7 days

    // httpOnly — not accessible from JS, safe for the JWT
    cookies.set('sb_access_token', session.access_token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge
    });

    // Store refresh token so we can silently refresh sessions
    cookies.set('sb_refresh_token', session.refresh_token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge
    });

    // Use service role only for the profile fetch — no auth calls
    const { data: profile } = await supabase
      .from('profiles')
      .select('userRole, username, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    // Non-httpOnly — client can read this for display purposes only
    // Never put the JWT here — only non-sensitive display data
    cookies.set('sb_user', JSON.stringify({
      id: user.id,
      email: user.email,
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
      userRole: profile?.userRole ?? []
    }), {
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge
    });

    throw redirect(303, '/profile');

  } catch (err) {
    if ((err as any)?.status === 303) throw err;
    console.error('[signin] unexpected error', err);
    return json({ error: (err as any)?.message ?? String(err) }, { status: 500 });
  }
}