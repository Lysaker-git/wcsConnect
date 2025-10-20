import { supabase } from './supabaseClient';

export interface SignupResult {
  data: any;
  error: any;
}

/**
 * Sign up a user using Supabase auth.
 * This tries the public `auth.signUp` flow (email/password).
 * If that method does not exist on the client, it will try the admin create user flow (server-only and requires service role key).
 */
export async function signUpUser(email: string, password: string): Promise<SignupResult> {
  try {
    console.log('[signup] attempting signUp for', email);

    // supabase-js v2 has auth.signUp
    if (typeof (supabase as any).auth?.signUp === 'function') {
      const resp = await (supabase as any).auth.signUp({ email, password });
      console.log('[signup] auth.signUp response', resp);
      return { data: resp, error: resp.error ?? null };
    }

    // fallback: try admin createUser (may require service role key and server-only client)
    if (typeof (supabase as any).auth?.admin?.createUser === 'function') {
      const resp = await (supabase as any).auth.admin.createUser({ email, password });
      console.log('[signup] auth.admin.createUser response', resp);
      return { data: resp, error: resp.error ?? null };
    }

    return { data: null, error: new Error('No supported signup method available on supabase client') };
  } catch (err) {
    console.error('[signup] unexpected error', err);
    return { data: null, error: err };
  }
}
