import { fail } from '@sveltejs/kit';
import { signUpUser } from '$lib/api/signup';

export const actions = {
  default: async ({ request }) => {
    try {
      const form = await request.formData();
      const email = form.get('email')?.toString();
      const password = form.get('password')?.toString();

      if (!email || !password) {
        return fail(400, { success: false, message: 'Missing email or password' });
      }

      const { data, error } = await signUpUser(email, password);

      if (error) {
        console.error('[signup action] error', error);
        return fail(500, { success: false, message: (error as any)?.message ?? String(error) });
      }

      return { success: true, data };
    } catch (err) {
      console.error('[signup action] unexpected', err);
      return fail(500, { success: false, message: (err as any)?.message ?? String(err) });
    }
  }
};
