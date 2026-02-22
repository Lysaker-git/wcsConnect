<script lang="ts">
  import { onMount } from 'svelte';
  import { createClient } from '@supabase/supabase-js';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_API_KEY } from '$env/static/public';

  let password = '';
  let passwordConfirm = '';
  let message = '';
  let error = '';
  let isSubmitting = false;
  let sessionReady = false;
  let accessToken = '';
  let refreshToken = '';

  $: passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

  onMount(() => {
    // Parse hash fragment — Supabase sends tokens this way
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    accessToken = params.get('access_token') ?? '';
    refreshToken = params.get('refresh_token') ?? '';
    const type = params.get('type');

    if (!accessToken || type !== 'recovery') {
      error = 'Invalid or expired reset link. Please request a new one.';
      return;
    }

    sessionReady = true;
  });

  async function handleReset(e: Event) {
    e.preventDefault();
    if (password !== passwordConfirm) return;

    isSubmitting = true;
    error = '';

    try {
      const supabaseClient = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_API_KEY);

      // Set the session from the reset link tokens
      const { error: sessionError } = await supabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (sessionError) {
        error = 'Session error: ' + sessionError.message;
        return;
      }

      // Update the password
      const { error: updateError } = await supabaseClient.auth.updateUser({
        password
      });

      if (updateError) {
        error = updateError.message;
        return;
      }

      message = 'Password updated successfully!';
      setTimeout(() => {
        window.location.href = '/signin';
      }, 2000);

    } catch (err: any) {
      error = err?.message ?? 'Something went wrong';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="min-h-screen bg-stone-900 flex items-center justify-center px-6">
  <div class="w-full max-w-md">

    <div class="text-center mb-10">
      <h1 class="text-4xl font-extrabold text-stone-100 tracking-tight">DancePoint</h1>
      <p class="text-stone-400 mt-2 text-sm">Set a new password</p>
    </div>

    <div class="neomorph-card bg-stone-800 rounded-2xl p-8">

      {#if message}
        <div class="text-center">
          <div class="text-5xl mb-4">✅</div>
          <h2 class="text-xl font-bold text-stone-100 mb-2">Password updated</h2>
          <p class="text-stone-400 text-sm">Redirecting you to sign in...</p>
        </div>

      {:else if error && !sessionReady}
        <div class="text-center">
          <div class="text-5xl mb-4">❌</div>
          <p class="text-red-300 text-sm mb-6">{error}</p>
          <a href="/signin/forgot-password" class="text-amber-400 hover:text-amber-300 text-sm transition">
            Request a new reset link
          </a>
        </div>

      {:else}
        <h2 class="text-xl font-bold text-stone-100 mb-2">Choose a new password</h2>
        <p class="text-stone-400 text-sm mb-6">Must be at least 8 characters.</p>

        {#if error}
          <div class="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg text-sm">
            {error}
          </div>
        {/if}

        <form on:submit|preventDefault={handleReset} class="space-y-5">
          <div>
            <label for="password" class="block text-sm font-medium text-stone-300 mb-1.5">
              New password
            </label>
            <input
              id="password"
              type="password"
              bind:value={password}
              required
              minlength="8"
              class="w-full px-4 py-3 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label for="passwordConfirm" class="block text-sm font-medium text-stone-300 mb-1.5">
              Confirm new password
            </label>
            <input
              id="passwordConfirm"
              type="password"
              bind:value={passwordConfirm}
              required
              class="w-full px-4 py-3 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition"
              placeholder="••••••••"
            />
            {#if passwordMismatch}
              <p class="text-red-400 text-xs mt-1">Passwords do not match</p>
            {/if}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || passwordMismatch || password.length < 8}
            class="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Updating...' : 'Update password'}
          </button>
        </form>
      {/if}
    </div>
  </div>
</div>

<style>
  .neomorph-card {
    box-shadow:
      8px 8px 24px rgba(2, 6, 23, 0.6),
      -8px -8px 18px rgba(255, 255, 255, 0.03);
  }

  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px #1c1917 inset !important;
    -webkit-text-fill-color: #f5f5f4 !important;
    transition: background-color 5000s ease-in-out 0s;
  }
</style>