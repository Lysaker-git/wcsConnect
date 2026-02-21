<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createClient } from '@supabase/supabase-js';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_API_KEY } from '$env/static/public';

  let status = 'Verifying your email...';
  let error = false;

  onMount(async () => {
    // Supabase sends tokens as hash fragments — parse them client-side
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const type = params.get('type');

    if (!access_token || !refresh_token) {
      status = 'Invalid or expired verification link.';
      error = true;
      return;
    }

    // Set the session in Supabase client
    const supabaseClient = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_API_KEY);
    const { data, error: sessionError } = await supabaseClient.auth.setSession({
      access_token,
      refresh_token
    });

    if (sessionError || !data.user) {
      status = 'Verification failed. Please try signing up again.';
      error = true;
      return;
    }

    // Now call your server to set the cookie and finalize
    const res = await fetch('/auth/confirm/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token,
        refresh_token,
        user_id: data.user.id,
        email: data.user.email
      }),
      credentials: 'include'
    });

    if (res.ok) {
      status = 'Email verified! Redirecting...';
      await goto('/profile');
    } else {
      status = 'Something went wrong. Please try signing in.';
      error = true;
    }
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-stone-950">
  <div class="text-center px-6">
    {#if error}
      <p class="text-red-400 text-lg mb-4">{status}</p>
      <a href="/signup" class="text-stone-300 underline">Back to Sign Up</a>
    {:else}
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-stone-300 mx-auto mb-4"></div>
      <p class="text-stone-300 text-lg">{status}</p>
    {/if}
  </div>
</div>