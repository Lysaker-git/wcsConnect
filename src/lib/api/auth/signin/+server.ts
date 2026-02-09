import { supabase } from '$lib/api/supabaseClient';
import { json, redirect } from '@sveltejs/kit'; // <-- Added redirect

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
    try {
      // fetch profile to include roles and a display name
      const { data: profile, error: profileError } = await (supabase as any).from('profiles').select('userRole, username, avatar_url').eq('id', user?.id).maybeSingle();
      if (profileError) console.warn('[api/auth/signin] profile fetch error', profileError);

      const sbUserPayload = {
        id: user?.id,
        email: user?.email,
        username: profile?.username ?? null,
        avatar_url: profile?.avatar_url ?? null,
        userRole: profile?.userRole ?? []
      };

      cookies.set('sb_user', JSON.stringify(sbUserPayload), {
        httpOnly: false,
        path: '/',
        maxAge
      });
    } catch (cookieErr) {
      console.warn('[api/auth/signin] failed to fetch profile for cookie', cookieErr);
      cookies.set('sb_user', JSON.stringify({ id: user?.id, email: user?.email }), { httpOnly: false, path: '/', maxAge });
    }

    // *** MODIFICATION: Return a redirect instead of a JSON success payload ***
    // This signals the client to navigate to the root path (/), causing a full page refresh.
    throw redirect(303, '/profile');
  } catch (err) {
    // SvelteKit handles the redirect as a special type of error, so we only catch
    // true unexpected errors here, or re-throw the redirect if it came from
    // another module.
    if ((err as any)?.status === 303) throw err; 
    
    console.error('[api/auth/signin] unexpected error', err);
    return json({ error: (err as any)?.message ?? String(err) }, { status: 500 });
  }
}
