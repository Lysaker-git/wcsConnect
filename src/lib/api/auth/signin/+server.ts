import { supabase } from '$lib/api/supabaseClient';
import { json } from '@sveltejs/kit';

export async function POST({ request, cookies }) {
  try {
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

    console.log('[api/auth/signin] signin attempt', { email });

    if (!email || !password) {
      return json({ error: 'Missing email or password' }, { status: 400 });
    }

    // Use supabase auth to sign in (server-side)
    const resp: any = await (supabase as any).auth.signInWithPassword({ email, password });
    console.log('[api/auth/signin] supabase resp', resp);

    if (resp.error) {
      return json({ error: resp.error.message ?? resp.error }, { status: 400 });
    }

    const session = resp.data?.session;
    const user = resp.data?.user;

    if (!session) {
      return json({ error: 'No session returned from Supabase' }, { status: 500 });
    }

    // set httpOnly cookie with access token
    const maxAge = session.expires_in ?? 3600;
    cookies.set('sb_access_token', session.access_token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge
    });

    // also set a non-httpOnly cookie with basic user info for client display
    cookies.set('sb_user', JSON.stringify({ id: user?.id, email: user?.email }), {
      httpOnly: false,
      path: '/',
      maxAge
    });

    return json({ user, session });
  } catch (err) {
    console.error('[api/auth/signin] unexpected error', err);
    return json({ error: (err as any)?.message ?? String(err) }, { status: 500 });
  }
}
