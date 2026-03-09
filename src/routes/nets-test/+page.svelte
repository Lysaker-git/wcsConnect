<script lang="ts">
  import { page } from '$app/stores';

  export let data: {
    participants: { id: string; events: { title: string } | null }[];
    pendingProducts: { id: string; product_name: string; subtotal: number; currency_type: string; participant_id: string }[];
    eventId: string;
  };

  let manualParticipantId = '';
  let loading = false;
  let error = '';
  let paymentUrl = '';

  // Group pending products by participant
  const byParticipant = data.participants.map((p) => ({
    ...p,
    products: data.pendingProducts.filter((pr) => pr.participant_id === p.id)
  }));

  async function startPayment(participantId: string) {
    loading = true;
    error = '';
    paymentUrl = '';

    try {
      const res = await fetch('/api/nets/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: participantId })
      });

      const body = await res.json();

      if (!res.ok) {
        error = body.error ?? `Error ${res.status}`;
        return;
      }

      // Redirect to NETS Easy hosted checkout
      window.location.href = body.url;
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-stone-900 text-stone-100 p-8 max-w-2xl mx-auto">
  <div class="mb-6 p-3 rounded bg-yellow-900/40 border border-yellow-600 text-yellow-300 text-sm">
    <strong>Dev test page</strong> — only visible when <code>NETS_TEST_MODE=true</code>.
    Webhooks won't fire back to localhost (DB won't update after payment). Use this to test the
    checkout redirect and payment UI on NETS Easy.
    <br /><br />
    Test card: <code>4925 0000 0000 0004</code> · any future expiry · any CVV
  </div>

  <h1 class="text-2xl font-bold mb-6">NETS Easy — Test Checkout</h1>

  <!-- Auto-detected participants -->
  {#if byParticipant.length > 0}
    <section class="mb-8">
      <h2 class="text-lg font-semibold mb-3">Your pending items (Norwegian Open)</h2>
      {#each byParticipant as p}
        {#if p.products.length > 0}
          <div class="rounded border border-stone-600 p-4 mb-4 bg-stone-800">
            <p class="text-sm text-stone-400 mb-1">Participant ID: <code class="text-xs">{p.id}</code></p>
            <ul class="mb-3 space-y-1">
              {#each p.products as pr}
                <li class="text-sm">
                  {pr.product_name}
                  <span class="text-stone-400">— {pr.subtotal} {pr.currency_type?.toUpperCase()}</span>
                </li>
              {/each}
            </ul>
            <button
              class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-medium disabled:opacity-50"
              disabled={loading}
              on:click={() => startPayment(p.id)}
            >
              {loading ? 'Creating session…' : 'Pay with NETS Easy →'}
            </button>
          </div>
        {/if}
      {/each}
    </section>
  {:else}
    <p class="text-stone-400 mb-8 text-sm">
      No pending items found for your account on the Norwegian Open event.
    </p>
  {/if}

  <!-- Manual entry fallback -->
  <section>
    <h2 class="text-lg font-semibold mb-3">Manual participant ID</h2>
    <div class="flex gap-3">
      <input
        class="flex-1 rounded border border-stone-600 bg-stone-800 px-3 py-2 text-sm font-mono"
        placeholder="paste participant UUID here"
        bind:value={manualParticipantId}
      />
      <button
        class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-medium disabled:opacity-50"
        disabled={loading || !manualParticipantId.trim()}
        on:click={() => startPayment(manualParticipantId.trim())}
      >
        {loading ? '…' : 'Pay →'}
      </button>
    </div>
  </section>

  {#if error}
    <div class="mt-6 p-3 rounded bg-red-900/40 border border-red-600 text-red-300 text-sm">
      <strong>Error:</strong> {error}
    </div>
  {/if}

  {#if $page.url.searchParams.get('paymentid') || $page.url.searchParams.get('paymentId')}
    <div class="mt-6 p-3 rounded bg-green-900/40 border border-green-600 text-green-300 text-sm">
      <strong>Returned from NETS Easy.</strong><br />
      Payment ID: <code>{$page.url.searchParams.get('paymentid') ?? $page.url.searchParams.get('paymentId')}</code><br />
      <span class="text-green-400/70">
        Webhook won't have fired locally — verify payment in the
        <a href="https://test.portal.dibspayment.eu" target="_blank" class="underline">NETS test portal</a>.
      </span>
    </div>
  {/if}
</div>
