<script lang="ts">
  import { enhance } from '$app/forms';

  export let data: { sessionReady?: boolean; error?: string };
  export let form: { message?: string } | null = null;

  let password = '';
  let passwordConfirm = '';
  let isSubmitting = false;

  $: passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
</script>

<div class="min-h-screen bg-stone-900 flex items-center justify-center px-6">
  <div class="w-full max-w-md">

    <div class="text-center mb-10">
      <h1 class="text-4xl font-extrabold text-stone-100 tracking-tight">DancePoint</h1>
      <p class="text-stone-400 mt-2 text-sm">Set a new password</p>
    </div>

    <div class="neomorph-card bg-stone-800 rounded-2xl p-8">

      {#if data.error}
        <!-- Invalid or expired link -->
        <div class="text-center">
          <div class="text-5xl mb-4">❌</div>
          <h2 class="text-lg font-bold text-stone-100 mb-2">Link invalid or expired</h2>
          <p class="text-stone-400 text-sm mb-6">
            This reset link has already been used or has expired. Reset links are valid for 1 hour.
          </p>
          <a href="/signin/forgot-password" class="text-amber-400 hover:text-amber-300 text-sm transition">
            Request a new reset link →
          </a>
        </div>

      {:else if data.sessionReady}
        <h2 class="text-xl font-bold text-stone-100 mb-2">Choose a new password</h2>
        <p class="text-stone-400 text-sm mb-6">Must be at least 8 characters.</p>

        {#if form?.message}
          <div class="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg text-sm">
            {form.message}
          </div>
        {/if}

        <form
          method="POST"
          use:enhance={() => {
            isSubmitting = true;
            return async ({ update }) => {
              await update();
              isSubmitting = false;
            };
          }}
          class="space-y-5"
        >
          <div>
            <label for="password" class="block text-sm font-medium text-stone-300 mb-1.5">
              New password
            </label>
            <input
              id="password"
              name="password"
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
              name="passwordConfirm"
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
