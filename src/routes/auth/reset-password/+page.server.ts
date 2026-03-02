import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
  // If already authenticated (e.g. page refresh after code exchange), just show the form
  const { user } = await locals.safeGetSession();
  if (user) return { sessionReady: true };

  const code = url.searchParams.get('code');
  if (!code) return { error: 'invalid_link' as const };

  // Exchange the one-time PKCE code for a session — sets auth cookies automatically
  const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('exchangeCodeForSession error:', error);
    return { error: 'expired' as const };
  }

  return { sessionReady: true };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Session expired. Please request a new reset link.' });

    const form = await request.formData();
    const password = form.get('password')?.toString();
    const passwordConfirm = form.get('passwordConfirm')?.toString();

    if (!password || password.length < 8) {
      return fail(400, { message: 'Password must be at least 8 characters.' });
    }
    if (password !== passwordConfirm) {
      return fail(400, { message: 'Passwords do not match.' });
    }

    const { error } = await locals.supabase.auth.updateUser({ password });
    if (error) return fail(500, { message: error.message });

    throw redirect(303, '/signin?reset=success');
  }
};
