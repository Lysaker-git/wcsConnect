import { supabase as serviceRole } from '$lib/server/supabaseServiceClient';
import { json, redirect } from '@sveltejs/kit';

export async function POST({ request, cookies, locals }) {
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

    if (!email || !password) {
      return json({ error: 'Missing email or password' }, { status: 400 });
    }

    // Sign in via the SSR client — it writes session cookies automatically
    const { data, error } = await locals.supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return json({ error: error.message }, { status: 400 });
    }

    const { user } = data;

    // Fetch profile for display cookie
    const { data: profile } = await serviceRole
      .from('profiles')
      .select('userRole, username, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    // Non-httpOnly display cookie — header and client-side role checks only
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
      maxAge: 60 * 60 * 24 * 7
    });

    // Check for redirect param
    const redirectTo = new URL(request.url).searchParams.get('redirect') ?? '/profile';
    throw redirect(303, redirectTo);

  } catch (err) {
    if ((err as any)?.status === 303) throw err;
    console.error('[signin] unexpected error', err);
    return json({ error: (err as any)?.message ?? String(err) }, { status: 500 });
  }
}