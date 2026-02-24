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

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailRegex.test(email)) {
        return fail(400, { success: false, message: 'Please enter a valid email address (e.g. name@example.com)' });
      }

      await signUpUser({ email, password, profile: { username: username ?? email.split('@')[0], role, avatar_url } });

      // Don't set cookie — they're not verified yet
      // Redirect to check-your-email page
      throw redirect(303, '/signup/verify-email');
      } catch (err: any) {
        if (err?.status === 303) throw err;
        console.error('[signup action]', err);

        const raw = err?.message ?? String(err);

        // Map Supabase error messages to user-friendly ones
        let message = 'Something went wrong. Please try again.';

        if (raw.includes('User already registered') || raw.includes('already been registered')) {
          message = 'An account with this email already exists. Try signing in instead.';
        } else if (raw.includes('invalid format') || raw.includes('Unable to validate email')) {
          message = 'That email address doesn\'t look valid. Please check and try again.';
        } else if (raw.includes('Password should be at least')) {
          message = 'Your password must be at least 6 characters long.';
        } else if (raw.includes('rate limit') || raw.includes('too many requests')) {
          message = 'Too many attempts. Please wait a few minutes before trying again.';
        } else if (raw.includes('signup_disabled')) {
          message = 'New signups are currently disabled. Please contact the organiser.';
        } else if (raw.includes('network') || raw.includes('fetch')) {
          message = 'Network error — please check your connection and try again.';
        } else if (raw.includes('Error sending confirmation email') || raw.includes('unexpected_failure')) {
          message = 'That doesn\'t look like a valid email address. Please check and try again.';
        }

        return fail(500, { success: false, message });
      }
  }
};