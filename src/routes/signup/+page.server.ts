import { fail } from '@sveltejs/kit';
import { signUpUser } from '$lib/api/auth/signup/signup';

export const actions = {
  default: async ({ request, cookies }) => {
    try {
      const form = await request.formData();
      const email = form.get('email')?.toString();
      const password = form.get('password')?.toString();
      const username = form.get('username')?.toString();
      const role = form.get('role')?.toString() ?? 'follower';
      const avatar_url = form.get('avatar_url')?.toString() ?? 'avatar1';

      if (!email || !password) {
        return fail(400, { success: false, message: 'Missing email or password' });
      }

      const user = await signUpUser({ email, password, profile: { username, role, avatar_url } });
      console.log('[signup action] user created:', user);

      cookies.set('sb_user', JSON.stringify({
        id: user.id,
        email: user.email,
        username: username ?? email.split('@')[0],
        avatar_url: avatar_url ?? '',
        userRole: ['member']
      }), { httpOnly: false, path: '/' });

      return { success: true, data: user };
    } catch (err) {
      console.error('[signup action] unexpected', err);
      return fail(500, { success: false, message: (err as any)?.message ?? String(err) });
    }
  }
};
