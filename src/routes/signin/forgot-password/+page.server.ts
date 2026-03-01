import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const form = await request.formData();
    const email = form.get('email')?.toString();

    if (!email) return fail(400, { message: 'Email is required' });

    const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://dancepoint.no/auth/reset-password'
    });

    if (error) return fail(500, { message: error.message });

    return { success: true };
  }
};