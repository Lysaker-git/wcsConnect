<script lang="ts">
  import { page } from '$app/stores';

  $: expired = $page.url.searchParams.get('expired') === 'true';
  let email = '';
  let password = '';
  let message = '';
  let isSigningIn = false;

  async function signIn(e: Event) {
    e.preventDefault();
    isSigningIn = true;
    message = '';

    const form = new FormData();
    form.set('email', email);
    form.set('password', password);

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        body: form,
        credentials: 'include'
      });

      if (res.redirected || res.status === 200) {
        window.location.href = '/profile';
        return;
      }

      const json = await res.json();
      message = json?.error ?? 'Sign in failed';
    } catch (err) {
      message = 'Something went wrong, please try again';
    } finally {
      isSigningIn = false;
    }
  }
</script>

<div class="min-h-screen bg-stone-900 flex items-center justify-center px-6">
  <div class="w-full max-w-md">

    <!-- Logo / Brand -->
    <div class="text-center mb-10">
      <h1 class="text-4xl font-extrabold text-stone-100 tracking-tight">DancePoint</h1>
      <p class="text-stone-400 mt-2 text-sm">Sign in to your account</p>
    </div>

    <!-- Card -->
    <div class="neomorph-card bg-stone-800 rounded-2xl p-8">

    {#if expired}
        <div class="mb-5 p-3 bg-amber-900/30 border border-amber-700 text-amber-300 rounded-lg text-sm flex items-center gap-2">
            <span>⏱️</span>
            <span>Your session expired. Please sign in again.</span>
        </div>
    {/if}


      {#if message}
        <div class="mb-5 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg text-sm">
          {message}
        </div>
      {/if}

      <form on:submit|preventDefault={signIn} class="space-y-5">
        <div>
          <label for="email" class="block text-sm font-medium text-stone-300 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            required
            autocomplete="email"
            class="w-full px-4 py-3 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div class="flex justify-between items-center mb-1.5">
            <label for="password" class="block text-sm font-medium text-stone-300">
              Password
            </label>
            <a href="/signin/forgot-password" class="text-xs text-amber-400 hover:text-amber-300 transition">
              Forgot password?
            </a>
          </div>
          <input
            id="password"
            type="password"
            bind:value={password}
            required
            autocomplete="current-password"
            class="w-full px-4 py-3 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isSigningIn}
          class="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {#if isSigningIn}
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Signing in...
          {:else}
            Sign In
          {/if}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-stone-500">
        Don't have an account?
        <a href="/signup" class="text-amber-400 hover:text-amber-300 font-medium transition">Sign up</a>
      </p>
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