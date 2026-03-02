<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/api/supabaseClient';

  let password = '';
  let passwordConfirm = '';
  let successMessage = '';
  let errorMessage = '';
  let isSubmitting = false;
  let sessionReady = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  $: passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

  onMount(async () => {

    // --- PKCE flow: ?code= in query string ---
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) { sessionReady = true; return; }
      errorMessage = 'This reset link has already been used or has expired.';
      return;
    }

    // --- Implicit flow: #access_token=...&type=recovery in hash ---
    // (produced by admin.generateLink())
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token') ?? '';
    const refreshToken = params.get('refresh_token') ?? '';
    const type = params.get('type');

    if (!accessToken || type !== 'recovery') {
      errorMessage = 'Invalid reset link. Please request a new one.';
      return;
    }

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (error) {
      errorMessage = 'This reset link has already been used or has expired.';
      return;
    }

    sessionReady = true;
  });

  async function handleReset(e: Event) {
    e.preventDefault();
    if (password !== passwordConfirm || !supabase) return;

    isSubmitting = true;
    errorMessage = '';

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        errorMessage = error.message;
        return;
      }
      successMessage = 'Password updated! Redirecting...';
      setTimeout(() => { window.location.href = '/signin'; }, 2000);
    } catch (err: any) {
      errorMessage = err?.message ?? 'Something went wrong';
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

      {#if successMessage}
        <div class="text-center">
          <div class="text-5xl mb-4">✅</div>
          <h2 class="text-xl font-bold text-stone-100 mb-2">Password updated</h2>
          <p class="text-stone-400 text-sm">Redirecting you to sign in...</p>
        </div>

      {:else if errorMessage && !sessionReady}
        <div class="text-center">
          <div class="text-5xl mb-4">❌</div>
          <h2 class="text-lg font-bold text-stone-100 mb-2">Link invalid or expired</h2>
          <p class="text-stone-400 text-sm mb-6">{errorMessage}</p>
          <a href="/signin/forgot-password" class="text-amber-400 hover:text-amber-300 text-sm transition">
            Request a new reset link →
          </a>
        </div>

      {:else if sessionReady}
        <h2 class="text-xl font-bold text-stone-100 mb-2">Choose a new password</h2>
        <p class="text-stone-400 text-sm mb-6">Must be at least 8 characters.</p>

        {#if errorMessage}
          <div class="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg text-sm">
            {errorMessage}
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

      {:else}
        <!-- Loading state while onMount resolves the token -->
        <div class="text-center py-8">
          <div class="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p class="text-stone-400 text-sm">Verifying reset link...</p>
        </div>
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
