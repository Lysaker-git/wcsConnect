<script lang="ts">
  import { enhance } from '$app/forms';

  export let data: {
    participant: any;
    participantProducts: any[];
    unpaidProducts: any[];
    paidProducts: any[];
    unpaidTotal: number;
    paidTotal: number;
    availableProducts: any[];
    stripe_fee_model: string;
    event: any;
  };

  const {
    participant,
    participantProducts,
    unpaidProducts,
    paidProducts,
    availableProducts,
    stripe_fee_model,
    event
  } = data;

  let unpaidTotal = data.unpaidTotal;
  let isCheckingOut = false;
  let checkoutError = '';

  const statusColors: Record<string, string> = {
    approved: 'bg-green-900 text-green-300',
    rejected: 'bg-red-900 text-red-300',
    pending: 'bg-yellow-900 text-yellow-300',
    pending_single_registration: 'bg-yellow-900 text-yellow-300',
    pending_couples_registration: 'bg-blue-900 text-blue-300'
  };

  const statusLabels: Record<string, string> = {
    approved: 'Approved',
    rejected: 'Rejected',
    pending: 'Pending',
    pending_single_registration: 'Pending Approval',
    pending_couples_registration: 'Pending (Couples)'
  };

  // Fee preview for unpaid items
  $: stripeFee = stripe_fee_model === 'on_top' ? unpaidTotal * 0.035 : 0;
  $: serviceFee = unpaidTotal * 0.01;
  $: grandTotal = unpaidTotal + stripeFee + serviceFee;

  // Group available products by type
  const productTypeLabels: Record<string, string> = {
    intensive: '🎓 Intensives',
    merchandise: '👕 Merchandise',
    accommodation: '🏨 Accommodation',
    other: '📦 Other'
  };

  $: availableByType = Object.entries(
    availableProducts.reduce((acc: Record<string, any[]>, p) => {
      if (!acc[p.product_type]) acc[p.product_type] = [];
      acc[p.product_type].push(p);
      return acc;
    }, {})
  );

  // Quantity state for merch/other
  let quantities: Record<string, number> = {};
  availableProducts.forEach(p => {
    if (p.product_type !== 'intensive' && p.product_type !== 'accommodation') {
      quantities[p.id] = 1;
    }
  });

  async function checkout() {
    isCheckingOut = true;
    checkoutError = '';
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ participant_id: participant.id })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        checkoutError = data.error ?? 'Failed to start checkout';
        isCheckingOut = false;
      }
    } catch (err) {
      checkoutError = 'Something went wrong';
      isCheckingOut = false;
    }
  }
</script>

<div class="min-h-screen bg-stone-900 py-10 px-6">
  <div class="max-w-2xl mx-auto">

    <!-- Header -->
    <div class="mb-8">
      <a href="/profile" class="text-sm text-amber-500 hover:underline">← Back to profile</a>
      <h1 class="text-3xl font-bold text-stone-100 mt-2">{event?.title}</h1>
      <div class="flex items-center gap-2 mt-2">
        <span class="px-2 py-0.5 rounded-full text-xs font-medium {statusColors[participant.status] ?? 'bg-stone-700 text-stone-300'}">
          {statusLabels[participant.status] ?? participant.status}
        </span>
        <span class="text-stone-500 text-xs">
          Registered {new Date(participant.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>

    <!-- Paid products -->
    {#if paidProducts.length > 0}
      <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6 mb-6">
        <h2 class="text-lg font-semibold text-stone-100 mb-4">✅ Paid</h2>
        <div class="space-y-2">
          {#each paidProducts as p}
            <div class="flex justify-between text-sm">
              <span class="text-stone-300">{p.product_name} × {p.quantity_ordered}</span>
              <span class="text-stone-100 font-medium">{parseFloat(p.subtotal).toFixed(2)} {p.currency_type}</span>
            </div>
          {/each}
        </div>
        <div class="border-t border-stone-700 mt-3 pt-3 flex justify-between text-sm font-semibold">
          <span class="text-stone-400">Total paid</span>
          <span class="text-green-400">{data.paidTotal.toFixed(2)} {paidProducts[0]?.currency_type}</span>
        </div>
      </div>
    {/if}

    <!-- Unpaid products -->
    {#if unpaidProducts.length > 0}
      <div class="bg-stone-800 rounded-2xl border border-amber-700/50 p-6 mb-6">
        <h2 class="text-lg font-semibold text-stone-100 mb-4">⏳ Awaiting Payment</h2>
        <div class="space-y-2">
          {#each unpaidProducts as p}
            <div class="flex justify-between text-sm">
              <span class="text-stone-300">{p.product_name} × {p.quantity_ordered}</span>
              <span class="text-stone-100 font-medium">{parseFloat(p.subtotal).toFixed(2)} {p.currency_type}</span>
            </div>
          {/each}
        </div>

        <!-- Fee breakdown -->
        <div class="border-t border-stone-700 mt-3 pt-3 space-y-1">
          <div class="flex justify-between text-xs text-stone-400">
            <span>Subtotal</span>
            <span>{unpaidTotal.toFixed(2)} {unpaidProducts[0]?.currency_type}</span>
          </div>
          {#if stripe_fee_model === 'on_top'}
            <div class="flex justify-between text-xs text-stone-400">
              <span>Payment handling (3.5%)</span>
              <span>{stripeFee.toFixed(2)} {unpaidProducts[0]?.currency_type}</span>
            </div>
          {/if}
          <div class="flex justify-between text-xs text-stone-400">
            <span>Service fee (1%)</span>
            <span>{serviceFee.toFixed(2)} {unpaidProducts[0]?.currency_type}</span>
          </div>
          <div class="flex justify-between text-sm font-bold text-stone-100 pt-1 border-t border-stone-700">
            <span>Total due</span>
            <span class="text-amber-400">{grandTotal.toFixed(2)} {unpaidProducts[0]?.currency_type}</span>
          </div>
        </div>

        {#if checkoutError}
          <div class="mt-3 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg text-sm">
            {checkoutError}
          </div>
        {/if}

        {#if participant.status === 'approved'}
          <button
            on:click={checkout}
            disabled={isCheckingOut}
            class="mt-4 w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition disabled:opacity-50"
          >
            {isCheckingOut ? 'Redirecting to payment...' : `Pay ${grandTotal.toFixed(2)} ${unpaidProducts[0]?.currency_type}`}
          </button>
        {:else}
          <p class="mt-3 text-xs text-stone-500 text-center">
            Payment will be available once your registration is approved.
          </p>
        {/if}
      </div>
    {/if}

    <!-- Nothing pending or paid yet -->
    {#if participantProducts.length === 0}
      <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6 mb-6 text-center text-stone-500 text-sm">
        No products on this registration yet.
      </div>
    {/if}

    <!-- Add more products (only if approved) -->
    {#if participant.status === 'approved' && availableByType.length > 0}
      <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6">
        <h2 class="text-lg font-semibold text-stone-100 mb-1">Add to your registration</h2>
        <p class="text-stone-500 text-xs mb-5">These will be added to your next payment.</p>

        {#each availableByType as [type, products]}
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-stone-400 mb-3">
              {productTypeLabels[type] ?? type}
            </h3>
            <div class="space-y-3">
              {#each products as product (product.id)}
                <div class="bg-stone-900 rounded-xl p-4 border border-stone-700">
                  <div class="flex justify-between items-start mb-3">
                    <div>
                      <p class="font-medium text-stone-100">{product.name}</p>
                      {#if product.description}
                        <p class="text-xs text-stone-400 mt-0.5">{product.description}</p>
                      {/if}
                      {#if product.quantity_total}
                        <p class="text-xs text-stone-500 mt-1">
                          {product.quantity_total - (product.quantity_sold ?? 0)} remaining
                        </p>
                      {/if}
                    </div>
                    <span class="text-stone-100 font-bold text-sm ml-4 flex-shrink-0">
                      {parseFloat(product.price).toFixed(2)} {product.currency_type}
                    </span>
                  </div>

                  <form method="POST" action="?/addProduct"
                    use:enhance={() => {
                      return async ({ update }) => { await update(); };
                    }}
                    class="flex items-center gap-2"
                  >
                    <input type="hidden" name="product_id" value={product.id} />

                    {#if product.product_type === 'merchandise'}
                      <input
                        type="number"
                        name="quantity"
                        bind:value={quantities[product.id]}
                        min="1"
                        max={product.quantity_total ? product.quantity_total - product.quantity_sold : 99}
                        class="w-16 px-2 py-1.5 rounded-lg bg-stone-800 border border-stone-600 text-stone-100 text-sm text-center focus:outline-none focus:border-amber-500"
                      />
                    {:else}
                      <input type="hidden" name="quantity" value="1" />
                    {/if}

                    <button
                      type="submit"
                      class="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition"
                    >
                      Add
                    </button>
                  </form>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {:else if participant.status !== 'approved' && availableProducts.length === 0}
      <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6 text-center text-stone-500 text-sm">
        Additional products will be available once your registration is approved.
      </div>
    {/if}

  </div>
</div>