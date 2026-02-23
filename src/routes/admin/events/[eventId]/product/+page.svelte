<script lang="ts">
    import { enhance } from '$app/forms';

    export let data: { event: any; products: any[] };

    export let form: { message?: string } | null = null;
    $: deleteError = form?.message ?? '';

  const productTypes = [
    { value: 'ticket', label: '🎟️ Event Ticket' },
    { value: 'intensive', label: '🎓 Intensive' },
    { value: 'merchandise', label: '👕 Merchandise' },
    { value: 'accommodation', label: '🏨 Accommodation' },
    { value: 'other', label: '📦 Other' }
  ];

  const currencies = ['EUR', 'NOK', 'USD', 'GBP', 'CAD'];

  // Group products by type
  $: grouped = productTypes.reduce((acc, t) => {
    const items = data.products.filter(p => p.product_type === t.value);
    if (items.length > 0) acc[t.value] = { label: t.label, items };
    return acc;
  }, {} as Record<string, { label: string; items: any[] }>);

  // Modal state
  let showCreate = false;
  let showEdit = false;
  let editingProduct: any = null;

  // Form fields
  let name = '';
  let description = '';
  let price = '';
  let product_type = 'ticket';
  let currency_type = 'EUR';
  let sale_start = '';
  let sale_end = '';
  let quantity_total = '';
  let leader_limit = '';
  let follower_limit = '';
  let is_active = true;
  let max_per_user = '';
  let discount_percent = '';

  function resetForm() {
    name = ''; description = ''; price = ''; product_type = 'ticket';
    currency_type = 'EUR'; sale_start = ''; sale_end = '';
    quantity_total = ''; leader_limit = ''; follower_limit = '';
    is_active = true; max_per_user = '';
    discount_percent = '';
  }

  function openCreate() { resetForm(); showCreate = true; }

  function openEdit(product: any) {
    editingProduct = product;
    name = product.name ?? '';
    description = product.description ?? '';
    price = product.price?.toString() ?? '';
    product_type = product.product_type ?? 'ticket';
    currency_type = product.currency_type ?? 'EUR';
    sale_start = product.sale_start ? new Date(product.sale_start).toISOString().slice(0, 16) : '';
    sale_end = product.sale_end ? new Date(product.sale_end).toISOString().slice(0, 16) : '';
    quantity_total = product.quantity_total?.toString() ?? '';
    leader_limit = product.leader_limit?.toString() ?? '';
    follower_limit = product.follower_limit?.toString() ?? '';
    is_active = product.is_active ?? true;
    max_per_user = product.max_per_user?.toString() ?? '';
    showEdit = true;
    discount_percent = product.discount_percent?.toString() ?? '';
  }

  // Max per user hint based on product type
  $: maxPerUserHint = product_type === 'ticket' || product_type === 'intensive'
    ? 'Set to 1 to enforce one per user (recommended for tickets and intensives)'
    : 'Leave empty for no limit per user';

  function saleStatus(product: any): { label: string; color: string } {
    const now = new Date();
    if (!product.is_active) return { label: 'Inactive', color: 'bg-stone-600 text-stone-300' };
    if (product.sale_start && new Date(product.sale_start) > now) return { label: 'Upcoming', color: 'bg-blue-900 text-blue-300' };
    if (product.sale_end && new Date(product.sale_end) < now) return { label: 'Ended', color: 'bg-red-900 text-red-300' };
    return { label: 'On Sale', color: 'bg-green-900 text-green-300' };
  }
</script>

<div class="max-w-5xl mx-auto py-10 px-6">
  <!-- Header -->
  <div class="mb-8 flex items-start justify-between">
    <div>
      <a href="/admin/events/{data.event?.id}" class="text-sm text-amber-500 hover:underline">
        ← Back to event
      </a>
      <h1 class="text-3xl font-bold text-stone-100 mt-2">Products</h1>
      <p class="text-stone-400 text-sm mt-1">{data.event?.title}</p>
    </div>
    <button
      on:click={openCreate}
      class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition"
    >
      + Add Product
    </button>
  </div>

  <!-- Stats row -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
    {#each productTypes as t}
      {@const count = data.products.filter(p => p.product_type === t.value).length}
      {#if count > 0}
        <div class="bg-stone-800 rounded-xl p-4 border border-stone-700">
          <p class="text-xs text-stone-400">{t.label}</p>
          <p class="text-2xl font-bold text-stone-100">{count}</p>
        </div>
      {/if}
    {/each}
    {#if data.products.length === 0}
      <div class="col-span-4 text-center py-16 text-stone-500">
        No products yet — click "Add Product" to get started.
      </div>
    {/if}
  </div>

    {#if deleteError}
        <div class="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg text-sm">
            {deleteError}
        </div>
    {/if}
  <!-- Products grouped by type -->
  {#each Object.entries(grouped) as [type, group]}
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-stone-300 mb-3">{group.label}</h2>
      <div class="space-y-3">
        {#each group.items as product (product.id)}
          {@const status = saleStatus(product)}
          <div class="bg-stone-800 rounded-xl border border-stone-700 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-semibold text-stone-100">{product.name}</p>
                <span class="px-2 py-0.5 rounded-full text-xs font-medium {status.color}">
                  {status.label}
                </span>
                {#if product.max_per_user === 1}
                  <span class="px-2 py-0.5 rounded-full text-xs bg-purple-900 text-purple-300">
                    1 per user
                  </span>
                {/if}
              </div>
              {#if product.description}
                <p class="text-sm text-stone-400 mt-1">{product.description}</p>
              {/if}
              <div class="flex flex-wrap gap-4 mt-2 text-xs text-stone-400">
                {#if product.discount_percent}
                    {@const discounted = parseFloat(product.price) * (1 - product.discount_percent / 100)}
                    <span class="line-through text-stone-500 text-xs">{parseFloat(product.price).toFixed(2)}</span>
                    <span class="font-semibold text-amber-400">{discounted.toFixed(2)} {product.currency_type}</span>
                    <span class="text-xs text-green-400">-{product.discount_percent}%</span>
                    {:else}
                    <span class="font-semibold text-stone-200">{parseFloat(product.price).toFixed(2)} {product.currency_type}</span>
                    {/if}
                <span>
                  {#if product.quantity_total}
                    {product.quantity_sold ?? 0} / {product.quantity_total} sold
                  {:else}
                    Unlimited
                  {/if}
                </span>
                {#if product.sale_start}
                  <span>Opens {new Date(product.sale_start).toLocaleDateString()}</span>
                {/if}
                {#if product.sale_end}
                  <span>Closes {new Date(product.sale_end).toLocaleDateString()}</span>
                {/if}
                {#if product.leader_limit || product.follower_limit}
                  <span>
                    {#if product.leader_limit}L: {product.leader_limit}{/if}
                    {#if product.follower_limit} F: {product.follower_limit}{/if}
                  </span>
                {/if}
              </div>
            </div>

            <div class="flex gap-2 flex-shrink-0">
              <button
                on:click={() => openEdit(product)}
                class="px-3 py-1.5 bg-stone-700 text-stone-200 text-sm rounded-lg hover:bg-stone-600 transition"
              >
                Edit
              </button>
              <form method="POST" action="?/deleteProduct" use:enhance={() => {
                if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return () => {};
                return async ({ update }) => { await update(); };
              }}>
                <input type="hidden" name="productId" value={product.id} />
                <button
                  type="submit"
                  class="px-3 py-1.5 bg-red-900/40 text-red-400 text-sm rounded-lg hover:bg-red-900/70 transition"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>

<!-- Shared form fields component - used in both modals -->
{#snippet productFields()}
  <div>
    <label class="block text-sm font-medium text-stone-300 mb-1">Product Name *</label>
    <input type="text" name="name" bind:value={name} required
      class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500" />
  </div>

  <div>
    <label class="block text-sm font-medium text-stone-300 mb-1">Description</label>
    <textarea name="description" bind:value={description} rows="2"
      class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500 resize-none"></textarea>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium text-stone-300 mb-1">Price *</label>
      <input type="number" name="price" bind:value={price} step="0.01" min="0" required
        class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500" />
    </div>
    
    <div>
      <label class="block text-sm font-medium text-stone-300 mb-1">Currency</label>
      <select name="currency_type" bind:value={currency_type}
        class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500">
        {#each currencies as c}<option value={c}>{c}</option>{/each}
      </select>
    </div>
  </div>
  <div>
    <label class="block text-sm font-medium text-stone-300 mb-1">
        Discount (% off)
    </label>
    <input
        type="number"
        name="discount_percent"
        bind:value={discount_percent}
        min="0"
        max="100"
        step="0.01"
        placeholder="Leave empty for no discount"
        class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
    />
    <p class="text-xs text-stone-500 mt-1">
        e.g. 50 = 50% off. Used for judge passes, staff passes etc.
    </p>
    </div>
  <div>
    <label class="block text-sm font-medium text-stone-300 mb-1">Product Type *</label>
    <select name="product_type" bind:value={product_type} required
      class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500">
      {#each productTypes as t}<option value={t.value}>{t.label}</option>{/each}
    </select>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium text-stone-300 mb-1">Sale Start</label>
      <input type="datetime-local" name="sale_start" bind:value={sale_start}
        class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500" />
    </div>
    <div>
      <label class="block text-sm font-medium text-stone-300 mb-1">Sale End</label>
      <input type="datetime-local" name="sale_end" bind:value={sale_end}
        class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500" />
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium text-stone-300 mb-1">Total Quantity</label>
      <input type="number" name="quantity_total" bind:value={quantity_total} min="1"
        placeholder="Leave empty = unlimited"
        class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500" />
    </div>
    <div>
      <label class="block text-sm font-medium text-stone-300 mb-1">Max Per User</label>
      <input type="number" name="max_per_user" bind:value={max_per_user} min="1"
        placeholder="Leave empty = no limit"
        class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500" />
      <p class="text-xs text-stone-500 mt-1">{maxPerUserHint}</p>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium text-stone-300 mb-1">Max Leaders</label>
      <input type="number" name="leader_limit" bind:value={leader_limit} min="1"
        placeholder="No limit"
        class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500" />
    </div>
    <div>
      <label class="block text-sm font-medium text-stone-300 mb-1">Max Followers</label>
      <input type="number" name="follower_limit" bind:value={follower_limit} min="1"
        placeholder="No limit"
        class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500" />
    </div>
  </div>

  <label class="flex items-center gap-2 cursor-pointer">
    <input type="checkbox" name="is_active" bind:checked={is_active}
      class="rounded border-stone-600" />
    <span class="text-sm text-stone-300">Active (visible to users)</span>
  </label>
{/snippet}

<!-- Create Modal -->
{#if showCreate}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-stone-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
      <div class="p-6 border-b border-stone-700 flex-shrink-0">
        <h3 class="text-xl font-bold text-stone-100">Add Product</h3>
      </div>
      <div class="p-6 overflow-y-auto flex-1">
        <form method="POST" action="?/createProduct"
          use:enhance={() => {
            return async ({ update }) => {
              showCreate = false;
              resetForm();
              await update();
            };
          }}
          class="space-y-4"
        >
          {@render productFields()}
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" on:click={() => { showCreate = false; resetForm(); }}
              class="px-4 py-2 bg-stone-700 text-stone-200 rounded-xl hover:bg-stone-600">
              Cancel
            </button>
            <button type="submit"
              class="px-4 py-2 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700">
              Create Product
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Modal -->
{#if showEdit && editingProduct}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-stone-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
      <div class="p-6 border-b border-stone-700 flex-shrink-0">
        <h3 class="text-xl font-bold text-stone-100">Edit Product</h3>
      </div>
      <div class="p-6 overflow-y-auto flex-1">
        <form method="POST" action="?/updateProduct"
          use:enhance={() => {
            return async ({ update }) => {
              showEdit = false;
              editingProduct = null;
              resetForm();
              await update();
            };
          }}
          class="space-y-4"
        >
          <input type="hidden" name="productId" value={editingProduct.id} />
          {@render productFields()}
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" on:click={() => { showEdit = false; editingProduct = null; resetForm(); }}
              class="px-4 py-2 bg-stone-700 text-stone-200 rounded-xl hover:bg-stone-600">
              Cancel
            </button>
            <button type="submit"
              class="px-4 py-2 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}