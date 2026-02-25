<script lang="ts">
  import { enhance } from '$app/forms';

  export let data: {
    event: any;
    participant: any;
    participantProducts: any[];
    eventProducts: any[];
  };
  export let form: { message?: string; success?: boolean; action?: string } | null = null;

  const wsdcLevels = ['Newcomer', 'Novice', 'Intermediate', 'Advanced', 'All-Star', 'Champion'];
  const statuses = [
    { value: 'pending', label: 'Pending' },
    { value: 'pending_single_registration', label: 'Pending (Single)' },
    { value: 'pending_couples_registration', label: 'Pending (Couples)' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const paymentStatuses = ['pending', 'paid', 'refunded', 'waived'];

  // Participant form state
  let status = data.participant.status ?? 'pending';
  let role = data.participant.role ?? 'follower';
  let wsdcLevel = data.participant.wsdcLevel ?? 'Newcomer';
  let partner_name = data.participant.partner_name ?? '';
  let country = data.participant.country ?? '';
  let wsdcID = data.participant.wsdcID?.toString() ?? '';

  // Add product state
  let showAddProduct = false;
  let addProductId = '';
  let addQuantity = 1;
  let addOverridePrice = '';
  let addPromoCode = '';

  // Edit product state
  let editingProductId: string | null = null;

  $: selectedAddProduct = data.eventProducts.find(p => p.id === addProductId);
  $: selectedAddPromo = data.promoCodes?.find((c: any) => c.code === addPromoCode) ?? null;

  const statusColors: Record<string, string> = {
    approved: 'bg-green-900 text-green-300',
    rejected: 'bg-red-900 text-red-300',
    pending: 'bg-yellow-900 text-yellow-300',
    pending_single_registration: 'bg-yellow-900 text-yellow-300',
    pending_couples_registration: 'bg-blue-900 text-blue-300'
  };

  const paymentColors: Record<string, string> = {
    pending: 'bg-yellow-900 text-yellow-300',
    paid: 'bg-green-900 text-green-300',
    refunded: 'bg-blue-900 text-blue-300',
    waived: 'bg-purple-900 text-purple-300'
  };

  $: paidTotal = data.participantProducts
    .filter(p => p.payment_status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.subtotal), 0);

  $: pendingTotal = data.participantProducts
    .filter(p => p.payment_status === 'pending')
    .reduce((sum, p) => sum + parseFloat(p.subtotal), 0);

  $: currency = data.participantProducts[0]?.currency_type ?? 'EUR';
</script>

<div class="max-w-4xl mx-auto py-10 px-6">

  <!-- Header -->
  <div class="mb-8">
    <a href="/admin/events/{data.event?.id}/participants" class="text-sm text-amber-500 hover:underline">
      ← Back to participants
    </a>
    <div class="flex items-center gap-4 mt-3">
      <div>
        <h1 class="text-3xl font-bold text-stone-100">
          {data.participant.profiles?.username ?? 'Participant'}
        </h1>
        <p class="text-stone-400 text-sm mt-1">{data.event?.title}</p>
      </div>
      <span class="px-3 py-1 rounded-full text-xs font-medium {statusColors[data.participant.status] ?? 'bg-stone-700 text-stone-300'}">
        {statuses.find(s => s.value === data.participant.status)?.label ?? data.participant.status}
      </span>
    </div>
  </div>

  {#if form?.message}
    <div class="mb-6 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg text-sm">
      {form.message}
    </div>
  {/if}

  {#if form?.success}
    <div class="mb-6 p-3 bg-green-900/30 border border-green-700 text-green-300 rounded-lg text-sm">
      Saved successfully.
    </div>
  {/if}

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

    <!-- Registration Details -->
    <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6">
      <h2 class="text-lg font-semibold text-stone-100 mb-5">Registration Details</h2>
      <form method="POST" action="?/updateParticipant"
        use:enhance={() => {
          return async ({ update }) => { await update({ reset: false }); };
        }}
        class="space-y-4"
      >
        <div>
          <label class="block text-sm font-medium text-stone-400 mb-1">Status</label>
          <select name="status" bind:value={status}
            class="w-full px-3 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500">
            {#each statuses as s}
              <option value={s.value}>{s.label}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-stone-400 mb-1">Role</label>
          <select name="role" bind:value={role}
            class="w-full px-3 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500">
            <option value="leader">Leader</option>
            <option value="follower">Follower</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-stone-400 mb-1">WSDC Level</label>
          <select name="wsdcLevel" bind:value={wsdcLevel}
            class="w-full px-3 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500">
            {#each wsdcLevels as l}
              <option value={l}>{l}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-stone-400 mb-1">WSDC ID</label>
          <input type="text" name="wsdcID" bind:value={wsdcID}
            class="w-full px-3 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500" />
        </div>

        <div>
          <label class="block text-sm font-medium text-stone-400 mb-1">Country</label>
          <input type="text" name="country" bind:value={country}
            class="w-full px-3 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500" />
        </div>

        <div>
          <label class="block text-sm font-medium text-stone-400 mb-1">Partner Name</label>
          <input type="text" name="partner_name" bind:value={partner_name}
            placeholder="Leave empty if none"
            class="w-full px-3 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500" />
        </div>

        <button type="submit"
          class="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition">
          Save Changes
        </button>
      </form>
    </div>

    <!-- Products -->
    <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6">
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-lg font-semibold text-stone-100">Products</h2>
        <button
          on:click={() => showAddProduct = !showAddProduct}
          class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition">
          + Add Product
        </button>
      </div>

      <!-- Add product panel -->
      {#if showAddProduct}
        <form method="POST" action="?/addProduct"
          use:enhance={() => {
            return async ({ update }) => {
              showAddProduct = false;
              addProductId = '';
              addQuantity = 1;
              addOverridePrice = '';
              await update();
            };
          }}
          class="mb-5 p-4 bg-stone-900 rounded-xl border border-stone-700 space-y-3"
        >
          <div>
            <label class="block text-xs text-stone-400 mb-1">Product</label>
            <select name="product_id" bind:value={addProductId} required
              class="w-full px-3 py-2 rounded-lg bg-stone-800 border border-stone-600 text-stone-100 focus:outline-none focus:border-amber-500 text-sm">
              <option value="">Select a product...</option>
              {#each data.eventProducts as p}
                <option value={p.id}>{p.name} — {parseFloat(p.price).toFixed(2)} {p.currency_type}</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="block text-xs text-stone-400 mb-1">Promo Code (optional)</label>
            <select name="promo_code" bind:value={addPromoCode}
              class="w-full px-3 py-2 rounded-lg bg-stone-800 border border-stone-600 text-stone-100 focus:outline-none focus:border-amber-500 text-sm">
              <option value="">No code</option>
              {#each data.promoCodes as pc}
                <option value={pc.code}>{pc.code} — {pc.discount_percent}% off</option>
              {/each}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-stone-400 mb-1">Quantity</label>
              <input type="number" name="quantity" bind:value={addQuantity} min="1"
                class="w-full px-3 py-2 rounded-lg bg-stone-800 border border-stone-600 text-stone-100 text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label class="block text-xs text-stone-400 mb-1">Override Price</label>
              <input type="number" name="override_price" bind:value={addOverridePrice}
                step="0.01" min="0"
                placeholder={selectedAddProduct ? parseFloat(selectedAddProduct.price).toFixed(2) : '—'}
                class="w-full px-3 py-2 rounded-lg bg-stone-800 border border-stone-600 text-stone-100 text-sm focus:outline-none focus:border-amber-500" />
              <p class="text-xs text-stone-600 mt-0.5">Leave empty to use product price</p>
            </div>
          </div>

          {#if selectedAddProduct}
            {#if addPromoCode}
              {#if selectedAddPromo && selectedAddProduct.product_type === 'ticket'}
                <div class="mt-2 text-sm text-stone-300">
                  <div>Original: {parseFloat(selectedAddProduct.price).toFixed(2)} {selectedAddProduct.currency_type}</div>
                  <div>Discount: {selectedAddPromo.discount_percent}% → <strong class="text-amber-300">{(parseFloat(selectedAddProduct.price) * (1 - selectedAddPromo.discount_percent/100)).toFixed(2)} {selectedAddProduct.currency_type}</strong></div>
                </div>
              {/if}
            {/if}
            <input type="hidden" name="promo_discount" value={selectedAddPromo?.discount_percent ?? ''} />
          {/if}

          <div class="flex gap-2">
            <button type="button" on:click={() => showAddProduct = false}
              class="flex-1 py-2 bg-stone-700 text-stone-300 text-sm rounded-lg hover:bg-stone-600">
              Cancel
            </button>
            <button type="submit"
              class="flex-1 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700">
              Add
            </button>
          </div>
        </form>
      {/if}

      <!-- Products list -->
      {#if data.participantProducts.length === 0}
        <p class="text-stone-500 text-sm text-center py-6">No products on this registration.</p>
      {:else}
        <div class="space-y-3">
    {#each data.participantProducts as pp (pp.id)}
        {#if editingProductId === pp.id}
            <!-- Edit form -->
            <form method="POST" action="?/updateProduct"
            use:enhance={() => {
                return async ({ update }) => {
                editingProductId = null;
                await update();
                };
            }}
            class="p-3 bg-stone-900 rounded-xl border border-amber-700/50 space-y-2"
            >
            <input type="hidden" name="participantProductId" value={pp.id} />
            <p class="text-sm font-medium text-stone-100">{pp.product_name}</p>
            <div class="grid grid-cols-3 gap-2">
                <div>
                <label class="block text-xs text-stone-500 mb-1">Qty</label>
                <input type="number" name="quantity_ordered" value={pp.quantity_ordered} min="1"
                    class="w-full px-2 py-1.5 rounded-lg bg-stone-800 border border-stone-600 text-stone-100 text-sm focus:outline-none" />
                </div>
                <div>
                <label class="block text-xs text-stone-500 mb-1">Unit price</label>
                <input type="number" name="unit_price" value={pp.unit_price} step="0.01" min="0"
                    class="w-full px-2 py-1.5 rounded-lg bg-stone-800 border border-stone-600 text-stone-100 text-sm focus:outline-none" />
                </div>
                <div>
                <label class="block text-xs text-stone-500 mb-1">Payment</label>
                <select name="payment_status" value={pp.payment_status}
                    class="w-full px-2 py-1.5 rounded-lg bg-stone-800 border border-stone-600 text-stone-100 text-sm focus:outline-none">
                    {#each paymentStatuses as s}
                    <option value={s}>{s}</option>
                    {/each}
                </select>
                </div>
            </div>
            <div class="flex gap-2">
                <button type="button" on:click={() => editingProductId = null}
                class="flex-1 py-1.5 bg-stone-700 text-stone-300 text-xs rounded-lg hover:bg-stone-600">
                Cancel
                </button>
                <button type="submit"
                class="flex-1 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700">
                Save
                </button>
            </div>
            </form>
        {:else}
            <!-- Display row -->
            <div class="flex items-center gap-3 p-3 bg-stone-900 rounded-xl border border-stone-700">
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-stone-100 truncate">{pp.product_name}</p>
                <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-stone-400">
                    {pp.quantity_ordered} × {parseFloat(pp.unit_price).toFixed(2)} {pp.currency_type}
                    = {parseFloat(pp.subtotal).toFixed(2)}
                </span>
                {#if pp.promo_code_used}
                    <span class="text-xs text-purple-400">🏷 {pp.promo_code_used}</span>
                {/if}
                </div>
            </div>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 {paymentColors[pp.payment_status] ?? 'bg-stone-700 text-stone-300'}">
                {pp.payment_status}
            </span>
            {#if pp.payment_status !== 'paid'}
                <div class="flex gap-1 flex-shrink-0">
                <button on:click={() => editingProductId = pp.id}
                    class="px-2 py-1 bg-stone-700 hover:bg-stone-600 text-stone-300 text-xs rounded-lg">
                    Edit
                </button>
                <form method="POST" action="?/removeProduct"
                    use:enhance={() => {
                    if (!confirm(`Remove "${pp.product_name}" from this registration?`)) return () => {};
                    return async ({ update }) => { await update(); };
                    }}
                >
                    <input type="hidden" name="participantProductId" value={pp.id} />
                    <button type="submit"
                    class="px-2 py-1 bg-red-900/40 hover:bg-red-900/70 text-red-400 text-xs rounded-lg">
                    Remove
                    </button>
                </form>
                </div>
            {:else}
                <span class="px-2 py-1 text-xs text-stone-600">Locked</span>
            {/if}
            </div>
        {/if}
    {/each}
        </div>

        <!-- Totals -->
        <div class="mt-4 pt-4 border-t border-stone-700 space-y-1">
          {#if paidTotal > 0}
            <div class="flex justify-between text-sm">
              <span class="text-stone-400">Paid</span>
              <span class="text-green-400 font-medium">{paidTotal.toFixed(2)} {currency}</span>
            </div>
          {/if}
          {#if pendingTotal > 0}
            <div class="flex justify-between text-sm">
              <span class="text-stone-400">Pending payment</span>
              <span class="text-amber-400 font-medium">{pendingTotal.toFixed(2)} {currency}</span>
            </div>
          {/if}
        </div>
      {/if}
    </div>

  </div>
</div>