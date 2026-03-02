import { fail } from '@sveltejs/kit';
import { supabase as serviceRole } from '$lib/server/supabaseServiceClient';
import { sendPasswordResetEmail } from '$lib/server/email';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    const email = form.get('email')?.toString();

    if (!email) return fail(400, { message: 'Email is required' });

    // Generate the reset link server-side so we can send our own branded email
    const { data, error } = await serviceRole.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: 'https://dancepoint.no/auth/reset-password'
      }
    });

    if (error) {
      console.error('generateLink error:', error);
      // Return success anyway so we don't leak whether the email exists
      return { success: true };
    }

    const resetLink = data.properties?.action_link;
    if (resetLink) {
      try {
        await sendPasswordResetEmail({ to: email, resetLink });
      } catch (emailErr) {
        console.error('Failed to send password reset email:', emailErr);
      }
    }

    return { success: true };
  }
};
