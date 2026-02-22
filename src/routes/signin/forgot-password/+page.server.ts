import { fail } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabaseServiceClient';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    const email = form.get('email')?.toString();

    if (!email) return fail(400, { message: 'Email is required' });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://dancepoint.no/auth/reset-password'
    });

    if (error) return fail(500, { message: error.message });

    return { success: true };
  }
};