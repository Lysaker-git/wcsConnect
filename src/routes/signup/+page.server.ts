import { fail, json } from '@sveltejs/kit';
import { signUpUser } from '$lib/api/auth/signup/signup';
import { supabase } from '$lib/api/supabaseClient';

export const actions = {
  default: async ({ request, cookies }) => {
    try {
      const form = await request.formData();
      const email = form.get('email')?.toString();
      const password = form.get('password')?.toString();
      const username = form.get('username')?.toString();
      const role = form.get('role')?.toString() ?? 'follower';
      const avatar = form.get('avatar')?.toString() ?? 'avatar1';

      if (!email || !password) {
        return fail(400, { success: false, message: 'Missing email or password' });
      }

  const { data, error } = await signUpUser(email, password);

      if (error) {
        console.error('[signup action] error', error);
        return fail(500, { success: false, message: (error as any)?.message ?? String(error) });
      }

      // If signUp returned a user and session, try to create a profiles row
      try {
        const user = (data as any)?.data?.user ?? null;
        const session = (data as any)?.data?.session ?? null;

        if (user && user.id) {
          // try inserting into profiles table with id = auth user id
          const profilePayload = {
            id: user.id,
            username: username ?? email.split('@')[0],
            role: role,
            description: null,
            avatar_url: avatar === 'avatar2' ? '/avatars/avatar2.png' : '/avatars/avatar1.png',
            provider: 'email'
          };

          try {
            const { data: profileData, error: profileError } = await supabase.from('profiles').insert([profilePayload]).select().single();
            if (profileError) {
              console.warn('[signup action] profile insert returned error', profileError);
            } else {
              console.log('[signup action] profile created', profileData);
            }
          } catch (pe) {
            console.warn('[signup action] profile insert failed', pe);
          }

          // set cookies with session info if available (similar to signin)
          if (session) {
            const maxAge = session.expires_in ?? 3600;
            cookies.set('sb_access_token', session.access_token, {
              httpOnly: true,
              path: '/',
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              maxAge
            });

            cookies.set('sb_user', JSON.stringify({ id: user.id, email: user.email, username: profilePayload.username, avatar_url: profilePayload.avatar_url }), {
              httpOnly: false,
              path: '/',
              maxAge
            });
          }
        }
      } catch (profileErr) {
        console.warn('[signup action] unexpected while creating profile', profileErr);
      }

      return { success: true, data };
    } catch (err) {
      console.error('[signup action] unexpected', err);
      return fail(500, { success: false, message: (err as any)?.message ?? String(err) });
    }
  }
};
