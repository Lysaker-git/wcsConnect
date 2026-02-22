<script lang="ts">
  import { enhance } from '$app/forms';

  export let form: { success?: boolean; message?: string } | null = null;
  let isSubmitting = false;
</script>

<div class="min-h-screen bg-stone-900 flex items-center justify-center px-6">
  <div class="w-full max-w-md">

    <div class="text-center mb-10">
      <h1 class="text-4xl font-extrabold text-stone-100 tracking-tight">DancePoint</h1>
      <p class="text-stone-400 mt-2 text-sm">Reset your password</p>
    </div>

    <div class="neomorph-card bg-stone-800 rounded-2xl p-8">

      {#if form?.success}
        <div class="text-center">
          <div class="text-5xl mb-4">📬</div>
          <h2 class="text-xl font-bold text-stone-100 mb-2">Check your email</h2>
          <p class="text-stone-400 text-sm mb-6">
            If an account exists for that email, we've sent a password reset link. 
            Check your inbox and spam folder.
          </p>
          <a href="/signin" class="text-amber-400 hover:text-amber-300 text-sm transition">
            Back to sign in
          </a>
        </div>
      {:else}
        <a href="/signin" class="text-xs text-stone-500 hover:text-stone-300 transition flex items-center gap-1 mb-6">
          ← Back to sign in
        </a>

        <h2 class="text-xl font-bold text-stone-100 mb-2">Forgot your password?</h2>
        <p class="text-stone-400 text-sm mb-6">
          Enter your email and we'll send you a link to reset your password.
        </p>

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
              isSubmitting = false;
              await update();
            };
          }}
          class="space-y-5"
        >
          <div>
            <label for="email" class="block text-sm font-medium text-stone-300 mb-1.5">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autocomplete="email"
              class="w-full px-4 py-3 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            class="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Sending...' : 'Send reset link'}
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