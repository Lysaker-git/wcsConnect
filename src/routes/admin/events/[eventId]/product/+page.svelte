<script lang="ts">
    import { enhance } from '$app/forms';

    export let data: { event: any; products: any[] ; productGroups: any[] };

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
  let room_capacity = '';
  let showCreateGroup = false;
  let newGroupName = '';
  let newGroupQuantity = '';
  let product_group_id = '';

  // Group products visually
  $: ungrouped = data.products.filter(p => !p.product_group_id);
  $: grouped = data.productGroups.map(g => ({
    ...g,
    items: data.products.filter(p => p.product_group_id === g.id)
  }));

$: remaining = (g: any) => g.quantity_total - (g.quantity_sold ?? 0);

  function resetForm() {
    name = ''; description = ''; price = ''; product_type = 'ticket';
    currency_type = 'EUR'; sale_start = ''; sale_end = '';
    quantity_total = ''; leader_limit = ''; follower_limit = '';
    is_active = true; max_per_user = '';
    discount_percent = '';
    room_capacity = '';
    product_group_id = '';
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
    room_capacity = product.room_capacity?.toString() ?? '';
    product_group_id = product.product_group_id ?? '';
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
  <!-- Create group panel -->
  <div class="mb-6 bg-stone-800 rounded-xl border border-stone-700 p-5">
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-base font-semibold text-stone-300">Shared Inventory Pools</h2>
      <button on:click={() => showCreateGroup = !showCreateGroup}
        class="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-stone-200 text-sm rounded-lg transition">
        + New Pool
      </button>
    </div>

    {#if showCreateGroup}
      <form method="POST" action="?/createGroup"
        use:enhance={() => {
          return async ({ update }) => {
            showCreateGroup = false;
            newGroupName = '';
            newGroupQuantity = '';
            await update();
          };
        }}
        class="flex gap-3 items-end mt-3"
      >
        <div class="flex-1">
          <label class="block text-xs text-stone-400 mb-1">Pool name</label>
          <input type="text" name="name" bind:value={newGroupName} required
            placeholder="e.g. Full Pass Pool"
            class="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500" />
        </div>
        <div class="w-32">
          <label class="block text-xs text-stone-400 mb-1">Total spots</label>
          <input type="number" name="quantity_total" bind:value={newGroupQuantity} required min="1"
            placeholder="e.g. 100"
            class="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500" />
        </div>
        <button type="submit"
          class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition">
          Create
        </button>
        <button type="button" on:click={() => showCreateGroup = false}
          class="px-4 py-2 bg-stone-700 text-stone-300 text-sm rounded-lg hover:bg-stone-600">
          Cancel
        </button>
      </form>
    {/if}

    {#if data.productGroups.length === 0}
      <p class="text-stone-600 text-xs mt-2">No pools yet — create one to link products to a shared inventory limit.</p>
    {:else}
      <div class="mt-3 space-y-2">
        {#each data.productGroups as group (group.id)}
          {@const rem = group.quantity_total - (group.quantity_sold ?? 0)}
          <div class="flex items-center justify-between p-3 bg-stone-900 rounded-lg border border-stone-700">
            <div>
              <span class="text-sm font-medium text-stone-100">{group.name}</span>
              <span class="ml-3 text-xs text-stone-400">
                {group.quantity_sold ?? 0} / {group.quantity_total} sold ·
                <span class="{rem <= 0 ? 'text-red-400' : 'text-green-400'}">{rem} remaining</span>
              </span>
            </div>
            <form method="POST" action="?/deleteGroup"
              use:enhance={() => {
                if (!confirm(`Delete pool "${group.name}"? Products will be unlinked.`)) return () => {};
                return async ({ update }) => { await update(); };
              }}
            >
              <input type="hidden" name="groupId" value={group.id} />
              <button type="submit" class="text-xs text-red-500 hover:text-red-400">Delete</button>
            </form>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Grouped products -->
  {#each grouped as group (group.id)}
    {#if group.items.length > 0}
      <div class="mb-8">
        <div class="flex items-center gap-3 mb-3">
          <h2 class="text-base font-semibold text-stone-300">{group.name}</h2>
          <span class="text-xs text-stone-500">
            shared pool: {group.quantity_sold ?? 0} / {group.quantity_total}
          </span>
          {#if remaining(group) <= 0}
            <span class="px-2 py-0.5 rounded-full text-xs bg-red-900 text-red-300">Pool full</span>
          {/if}
        </div>
        <div class="space-y-3">
          {#each group.items as product (product.id)}
            {@render productRow(product)}
          {/each}
        </div>
      </div>
    {/if}
  {/each}

  <!-- Ungrouped products -->
  {#each productTypes as t}
    {@const items = ungrouped.filter(p => p.product_type === t.value)}
    {#if items.length > 0}
      <div class="mb-8">
        <h2 class="text-lg font-semibold text-stone-300 mb-3">{t.label}</h2>
        <div class="space-y-3">
          {#each items as product (product.id)}
            {@render productRow(product)}
          {/each}
        </div>
      </div>
    {/if}
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
    {#if product_type === 'accommodation'}
      <div>
        <label class="block text-sm font-medium text-stone-300 mb-1">Room Capacity</label>
        <input
          type="number"
          name="room_capacity"
          bind:value={room_capacity}
          min="1"
          max="10"
          placeholder="e.g. 2 for double room"
          class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
        />
        <p class="text-xs text-stone-500 mt-1">
          Single = 1 · Double = 2 · Triple = 3 · Quadruple = 4
        </p>
      </div>
    {/if}
    <div>
      <label class="block text-sm font-medium text-stone-300 mb-1">Inventory Pool</label>
      <select name="product_group_id" bind:value={product_group_id}
        class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500">
        <option value="">No pool</option>
        {#each data.productGroups as g}
          <option value={g.id}>{g.name}</option>
        {/each}
      </select>
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

{#snippet productRow(product: any)}
  {@const status = saleStatus(product)}
  <div class="bg-stone-800 rounded-xl border border-stone-700 p-5">
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="font-semibold text-stone-100">{product.name}</p>
          <span class="px-2 py-0.5 rounded-full text-xs font-medium {status.color}">{status.label}</span>
          {#if product.max_per_user === 1}
            <span class="px-2 py-0.5 rounded-full text-xs bg-purple-900 text-purple-300">1 per user</span>
          {/if}
        </div>
        {#if product.description}
          <p class="text-sm text-stone-400 mt-1">{product.description}</p>
        {/if}
        <div class="flex flex-wrap gap-4 mt-2 text-xs text-stone-400">
          {#if product.discount_percent}
            {@const discounted = parseFloat(product.price) * (1 - product.discount_percent / 100)}
            <span class="line-through text-stone-500">{parseFloat(product.price).toFixed(2)}</span>
            <span class="font-semibold text-amber-400">{discounted.toFixed(2)} {product.currency_type}</span>
            <span class="text-green-400">-{product.discount_percent}%</span>
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
        </div>

        <!-- Group assignment dropdown -->
        <form method="POST" action="?/assignGroup"
          use:enhance={() => {
            return async ({ update }) => { await update({ reset: false }); };
          }}
          class="mt-3 flex items-center gap-2"
        >
          <input type="hidden" name="productId" value={product.id} />
          <select name="product_group_id"
            on:change={(e) => e.currentTarget.form?.requestSubmit()}
            class="text-xs px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-300 focus:outline-none focus:border-amber-500">
            <option value="">No pool</option>
            {#each data.productGroups as g}
              <option value={g.id} selected={product.product_group_id === g.id}>{g.name}</option>
            {/each}
          </select>
          <span class="text-xs text-stone-600">Inventory pool</span>
        </form>
      </div>

      <div class="flex gap-2 flex-shrink-0">
        <button on:click={() => openEdit(product)}
          class="px-3 py-1.5 bg-stone-700 text-stone-200 text-sm rounded-lg hover:bg-stone-600 transition">
          Edit
        </button>
        <form method="POST" action="?/deleteProduct" use:enhance={() => {
          if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return () => {};
          return async ({ update }) => { await update(); };
        }}>
          <input type="hidden" name="productId" value={product.id} />
          <button type="submit"
            class="px-3 py-1.5 bg-red-900/40 text-red-400 text-sm rounded-lg hover:bg-red-900/70 transition">
            Delete
          </button>
        </form>
      </div>
    </div>
  </div>
{/snippet}