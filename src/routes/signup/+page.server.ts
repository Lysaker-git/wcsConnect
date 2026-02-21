import { fail, redirect } from '@sveltejs/kit';
import { signUpUser } from '$lib/api/auth/signup/signup';

export const actions = {
  signUp: async ({ request }) => {
    try {
      const form = await request.formData();
      const email = form.get('email')?.toString();
      const password = form.get('password')?.toString();
      const username = form.get('username')?.toString();
      const role = form.get('role')?.toString() ?? 'follower';
      const avatar_url = form.get('avatar_url')?.toString() ?? '';

      if (!email || !password) {
        return fail(400, { success: false, message: 'Missing email or password' });
      }

      await signUpUser({ email, password, profile: { username: username ?? email.split('@')[0], role, avatar_url } });

      // Don't set cookie — they're not verified yet
      // Redirect to check-your-email page
      throw redirect(303, '/signup/verify-email');
    } catch (err: any) {
      if (err?.status === 303) throw err; // let redirect through
      console.error('[signup action]', err);
      return fail(500, { success: false, message: err?.message ?? String(err) });
    }
  }
};