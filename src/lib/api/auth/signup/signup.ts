import { supabase } from '../../../server/supabaseServiceClient';


export async function signUpUser(
  { email, password, profile }) {
    console.log('[signUpUser] email:', email, 'password:', password ? '****' : 'undefined');
    console.log('[signUpUser] profile:', profile);
    console.log('[signUpUser] starting user creation');

    const payload = {
      email,
      password,
      email_confirm: true
    };
    console.log('[signUpUser] admin.createUser payload:', payload);

    if (!payload.email || !payload.password) {
      throw new Error('Email and password are required');
    }

    const { data: { user }, error: signUpError } =
      await supabase.auth.admin.createUser(payload);
    console.log('[signUpUser] user creation attempt finished');
    console.log('[signUpUser] user creation result:', { user, signUpError });

    if (signUpError) throw signUpError

    if (!profile?.username) {
      throw new Error('Username is required');
    }

    const profileRow = {
      id: user?.id,
      username: profile?.username,
      role: profile?.role ?? 'follower',
      avatar_url: profile?.avatar_url ?? null,
      userRole: ['member']
    }
    console.log('[signUpUser] inserting profile row:', profileRow);

    const { error: profileInsertError } = await supabase
      .from('profiles')
      .insert([profileRow])
    
    console.log('[signUpUser] profile row insert result:', { profileInsertError });
    if (profileInsertError) {
      // await supabase.auth.admin.deleteUser(user?.id || '')
      throw profileInsertError
    }
    return user
            };
            