<script lang="ts">
  import { onMount } from 'svelte';

  let visible = false;

  onMount(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) visible = true;
  });

  function accept() {
    localStorage.setItem('cookie_consent', 'accepted');
    visible = false;
  }

  function decline() {
    localStorage.setItem('cookie_consent', 'declined');
    visible = false;
  }
</script>

{#if visible}
  <div class="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
    <div class="max-w-3xl mx-auto bg-stone-800 border border-stone-700 rounded-2xl shadow-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div class="flex-1">
        <p class="text-stone-100 font-semibold text-sm mb-1">We use cookies 🍪</p>
        <p class="text-stone-400 text-xs leading-relaxed">
          We use essential cookies to keep you logged in. By clicking Accept you also allow functional cookies.
          Read our <a href="/cookies" class="text-amber-400 hover:underline">Cookie Policy</a> and
          <a href="/privacy" class="text-amber-400 hover:underline">Privacy Policy</a>.
        </p>
      </div>
      <div class="flex gap-2 flex-shrink-0">
        <button
          on:click={decline}
          class="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 text-sm font-medium rounded-xl transition"
        >
          Decline
        </button>
        <button
          on:click={accept}
          class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition"
        >
          Accept
        </button>
      </div>
    </div>
  </div>
{/if}