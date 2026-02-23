import { supabase } from "$lib/server/supabaseServiceClient"; // service role — for DB writes
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_API_KEY } from '$env/static/public';

export async function signUpUser({ email, password, profile }: {
  email: string;
  password: string;
  profile: { username: string; role: string; avatar_url: string };
}) {
  if (!email || !password) throw new Error('Email and password are required');
  if (!profile?.username) throw new Error('Username is required');

  // Use anon client for auth.signUp — this is what sends the verification email
  const anonClient = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_API_KEY);

  const { data, error: signUpError } = await anonClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: 'https://dancepoint.no/auth/confirm'
    }
  });

  console.log('[signUpUser] signUp result:', { user: data?.user?.id, signUpError });

  if (signUpError) throw signUpError;
  if (!data.user) throw new Error('User creation failed');

  // Use service role client for profile insert — bypasses RLS
  const profileRow = {
    id: data.user.id,
    username: profile.username,
    role: profile.role ?? 'follower',
    avatar_url: profile.avatar_url ?? null,
    userRole: ['member'],
    terms_accepted_at: new Date().toISOString(),
    terms_version: '2026-02'
  };

  console.log('[signUpUser] inserting profile:', profileRow);

  const { error: profileInsertError } = await supabase
    .from('profiles')
    .insert([profileRow]);

  if (profileInsertError) throw profileInsertError;

  return data.user;
}