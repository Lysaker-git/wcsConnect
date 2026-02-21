import { supabase } from "$lib/server/supabaseServiceClient";

export async function signUpUser({ email, password, profile }: {
  email: string;
  password: string;
  profile: { username: string; role: string; avatar_url: string };
}) {
  if (!email || !password) throw new Error('Email and password are required');
  if (!profile?.username) throw new Error('Username is required');

  // Use regular signUp — this sends the verification email automatically
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // This URL is where Supabase redirects after email confirmation
      emailRedirectTo: 'https://dancepoint.no/auth/confirm'
    }
  });

  if (signUpError) throw signUpError;
  if (!data.user) throw new Error('User creation failed');

  // Insert profile row immediately — but account won't be usable until verified
  const profileRow = {
    id: data.user.id,
    username: profile.username,
    role: profile.role ?? 'follower',
    avatar_url: profile.avatar_url ?? null,
    userRole: ['member']
  };

  const { error: profileInsertError } = await supabase
    .from('profiles')
    .insert([profileRow]);

  if (profileInsertError) throw profileInsertError;

  return data.user;
}