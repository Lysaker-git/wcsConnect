<script lang="ts">
  import { page } from '$app/stores';
  $: reason = $page.url.searchParams.get('reason');
</script>

<div class="bg-stone-950/90 min-h-screen w-full flex items-center justify-center">
  <div class="max-w-md mx-auto py-12 px-6 text-center">
    <div class="bg-stone-800 rounded-2xl p-10 shadow-xl">
      <div class="text-5xl mb-6">📬</div>
      <h1 class="text-stone-100 text-2xl font-bold mb-4">Check your email</h1>
      <p class="text-stone-300 mb-6">
        {#if reason === 'unverified'}
          You need to verify your email before registering for events.
          Please check your inbox for the confirmation link.
        {:else}
          We've sent a confirmation link to your email address.
          Click the link in the email to activate your account.
        {/if}
      </p>
      <p class="text-stone-400 text-sm mb-8">
        Can't find it? Check your spam folder. The link expires after 1 hour.
      </p>
      <a href="/signin" class="inline-block px-6 py-3 bg-stone-600 text-white rounded-lg hover:bg-stone-500 transition">
        Back to Sign In
      </a>
    </div>
  </div>
</div>