<script lang="ts">
  import { enhance } from '$app/forms';
  import EditEventDetailsModal from '$lib/components/EditEventDetailsModal.svelte';
  import ParticipantsModal from '$lib/components/ParticipantsModal.svelte';
  export let data: { event: any; eventDetails: any; user: any; products: any[] };

  // Event modals state
  let showEditEventModal = false;
  let showParticipantsModal = false;

  // Product modal state
  let showProductModal = false;
  let showEditModal = false;
  let editingProduct: any = null;
  let productForm: HTMLFormElement;

  // Product form data
  let productName = '';
  let productDescription = '';
  let productPrice = '';
  let productType = 'ticket'; // Default to ticket
  let currencyType = 'EUR'; // Default currency
  let saleStart = '';
  let saleEnd = '';
  let quantityTotal = '';
  let leaderLimit = '';
  let followerLimit = '';
  let isActive = true; // Default to active

  // Product types for WCS events
  const productTypes = [
    { value: 'ticket', label: 'Event Ticket' },
    { value: 'intensive', label: 'Intensive Workshop' },
    { value: 'merchandise', label: 'Merchandise' },
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'other', label: 'Other' }
  ];

  function resetProductForm() {
    productName = '';
    productDescription = '';
    productPrice = '';
    productType = 'ticket';
    currencyType = 'EUR';
    saleStart = '';
    saleEnd = '';
    quantityTotal = '';
    leaderLimit = '';
    followerLimit = '';
    isActive = true;
  }

  function openProductModal() {
    resetProductForm();
    showProductModal = true;
  }

  function closeProductModal() {
    showProductModal = false;
    resetProductForm();
  }

  function openEditModal(product: any) {
    editingProduct = product;
    // Pre-populate form with product data
    productName = product.name || '';
    productDescription = product.description || '';
    productPrice = product.price?.toString() || '';
    productType = product.product_type || 'ticket';
    currencyType = product.currency_type || 'EUR';
    saleStart = product.sale_start ? new Date(product.sale_start).toISOString().slice(0, 16) : '';
    saleEnd = product.sale_end ? new Date(product.sale_end).toISOString().slice(0, 16) : '';
    quantityTotal = product.quantity_total?.toString() || '';
    leaderLimit = product.leader_limit?.toString() || '';
    followerLimit = product.follower_limit?.toString() || '';
    isActive = product.is_active ?? true;
    
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
    editingProduct = null;
    resetProductForm();
  }

  function openEditEventModal() {
    showEditEventModal = true;
  }

  function closeEditEventModal() {
    showEditEventModal = false;
  }

  function openParticipantsModal() {
    showParticipantsModal = true;
  }

  function closeParticipantsModal() {
    showParticipantsModal = false;
  }

  function handleEventUpdateSuccess() {
    // Refresh the page to show updated event details
    window.location.reload();
  }

  async function deleteProduct(productId: string) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    const formData = new FormData();
    formData.set('productId', productId);

    try {
      const response = await fetch(`/admin/events/${data.event.id}?/deleteProduct`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        // Refresh the page to show updated products
        window.location.reload();
      } else {
        alert('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product');
    }
  }

  // Handle form submission
  async function handleProductSubmit(e: Event) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.set('name', productName);
    formData.set('description', productDescription);
    formData.set('price', productPrice);
    formData.set('product_type', productType);
    formData.set('currency_type', currencyType);
    
    if (saleStart) formData.set('sale_start', saleStart);
    if (saleEnd) formData.set('sale_end', saleEnd);
    if (quantityTotal) formData.set('quantity_total', quantityTotal);
    if (leaderLimit) formData.set('leader_limit', leaderLimit);
    if (followerLimit) formData.set('follower_limit', followerLimit);
    if (isActive) formData.set('is_active', 'on');

    try {
      const response = await fetch(`/admin/events/${data.event.id}?/createProduct`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        closeProductModal();
        // Refresh the page to show new product
        window.location.reload();
      } else {
        alert('Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Error creating product');
    }
  }

  // Handle edit form submission
  async function handleEditSubmit(e: Event) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.set('productId', editingProduct.id);
    formData.set('name', productName);
    formData.set('description', productDescription);
    formData.set('price', productPrice);
    formData.set('product_type', productType);
    formData.set('currency_type', currencyType);
    
    if (saleStart) formData.set('sale_start', saleStart);
    if (saleEnd) formData.set('sale_end', saleEnd);
    if (quantityTotal) formData.set('quantity_total', quantityTotal);
    if (leaderLimit) formData.set('leader_limit', leaderLimit);
    if (followerLimit) formData.set('follower_limit', followerLimit);
    if (isActive) formData.set('is_active', 'on');

    try {
      const response = await fetch(`/admin/events/${data.event.id}?/updateProduct`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        closeEditModal();
        // Refresh the page to show updated product
        window.location.reload();
      } else {
        alert('Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error updating product');
    }
  }
</script>

<div class="max-w-4xl mx-auto py-12 px-6">
  <h1 class="text-3xl font-bold mb-6">Event Admin: {data.event.title}</h1>

  <div class="bg-white shadow-lg rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">Event Details</h2>
      <div class="flex space-x-2">
        <button
          on:click={openEditEventModal}
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm"
        >
          Edit Details
        </button>
        <button
          on:click={openParticipantsModal}
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium text-sm"
        >
          View Participants
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Title</label>
        <p class="mt-1 text-lg">{data.event.title}</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">ID</label>
        <p class="mt-1 text-lg">{data.event.id}</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Start Date</label>
        <p class="mt-1 text-lg">{new Date(data.event.start_date).toLocaleDateString()}</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">End Date</label>
        <p class="mt-1 text-lg">{new Date(data.event.end_date).toLocaleDateString()}</p>
      </div>

      {#if data.eventDetails?.description}
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Description</label>
          <p class="mt-1">{data.eventDetails.description}</p>
        </div>
      {/if}

      {#if data.eventDetails?.address}
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Address</label>
          <p class="mt-1">{data.eventDetails.address}</p>
        </div>
      {/if}

      {#if data.eventDetails?.venue}
        <div>
          <label class="block text-sm font-medium text-gray-700">Venue</label>
          <p class="mt-1">{data.eventDetails.venue}</p>
        </div>
      {/if}

      {#if data.eventDetails?.hotel}
        <div>
          <label class="block text-sm font-medium text-gray-700">Hotel</label>
          <p class="mt-1">{data.eventDetails.hotel}</p>
        </div>
      {/if}

      {#if data.eventDetails?.max_participants}
        <div>
          <label class="block text-sm font-medium text-gray-700">Max Participants</label>
          <p class="mt-1">{data.eventDetails.max_participants}</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Products Management Section -->
  <div class="bg-white shadow-lg rounded-lg p-6 mt-8">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold">Event Store Products</h2>
      <button 
        on:click={openProductModal}
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
      >
        Add Product
      </button>
    </div>

    {#if data.products.length === 0}
      <p class="text-gray-500 text-center py-8">No products added yet. Click "Add Product" to get started.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full table-auto">
          <thead>
            <tr class="bg-gray-50">
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role Limits</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each data.products as product}
              <tr>
                <td class="px-4 py-2 whitespace-nowrap">
                  <div>
                    <div class="text-sm font-medium text-gray-900">{product.name}</div>
                    {#if product.description}
                      <div class="text-sm text-gray-500">{product.description}</div>
                    {/if}
                  </div>
                </td>
                <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500 capitalize">
                  {product.product_type}
                </td>
                <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  {product.currency_type || 'USD'} ${product.price}
                </td>
                <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {#if product.leader_limit || product.follower_limit}
                    {#if product.leader_limit}L: {product.leader_limit}{/if}
                    {#if product.follower_limit}{#if product.leader_limit} / {/if}F: {product.follower_limit}{/if}
                  {:else}
                    No limits
                  {/if}
                </td>
                <td class="px-4 py-2 whitespace-nowrap">
                  <span class={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    product.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {#if product.quantity_total}
                    {product.quantity_sold || 0} / {product.quantity_total}
                  {:else}
                    Unlimited
                  {/if}
                </td>
                <td class="px-4 py-2 whitespace-nowrap text-sm font-medium">
                  <div class="flex space-x-2">
                    <button 
                      on:click={() => openEditModal(product)}
                      class="text-blue-600 hover:text-blue-900"
                      title="Edit product"
                    >
                      ✏️
                    </button>
                    <button 
                      on:click={() => deleteProduct(product.id)}
                      class="text-red-600 hover:text-red-900"
                      title="Delete product"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Product Creation Modal -->
  {#if showProductModal}
    <div class="fixed inset-0 bg-white/10 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] flex flex-col">
        <div class="p-6 flex-shrink-0">
          <h3 class="text-xl font-semibold mb-4">Add New Product</h3>
        </div>
        <div class="px-6 pb-6 overflow-y-auto flex-1">
          <form on:submit={handleProductSubmit} class="space-y-4">
            <div>
              <label for="product-name" class="block text-sm font-medium text-gray-700">Product Name *</label>
              <input 
                id="product-name"
                bind:value={productName} 
                type="text" 
                required 
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
              />
            </div>

            <div>
              <label for="product-description" class="block text-sm font-medium text-gray-700">Description</label>
              <textarea 
                id="product-description"
                bind:value={productDescription} 
                rows="3"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="product-price" class="block text-sm font-medium text-gray-700">Price *</label>
                <input 
                  id="product-price"
                  bind:value={productPrice} 
                  type="number" 
                  step="0.01"
                  min="0"
                  required 
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label for="currency-type" class="block text-sm font-medium text-gray-700">Currency</label>
                <select 
                  id="currency-type"
                  bind:value={currencyType}
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option selected value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="NOK">NOK (kr)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD (C$)</option>
                </select>
              </div>
            </div>

            <div>
              <label for="product-type" class="block text-sm font-medium text-gray-700">Product Type *</label>
              <select 
                id="product-type"
                bind:value={productType} 
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {#each productTypes as type}
                  <option value={type.value}>{type.label}</option>
                {/each}
              </select>
            </div>

            <!-- Role-based limits for WCS balance -->
            <div class="border-t pt-4">
              <h4 class="text-sm font-medium text-gray-700 mb-2">Role Balance Limits (Optional)</h4>
              <p class="text-xs text-gray-500 mb-3">Set limits to maintain leader/follower balance at your event</p>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="leader-limit" class="block text-sm font-medium text-gray-700">Max Leaders</label>
                  <input 
                    id="leader-limit"
                    bind:value={leaderLimit} 
                    type="number" 
                    min="1"
                    placeholder="e.g., 50"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label for="follower-limit" class="block text-sm font-medium text-gray-700">Max Followers</label>
                  <input 
                    id="follower-limit"
                    bind:value={followerLimit} 
                    type="number" 
                    min="1"
                    placeholder="e.g., 50"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                  />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="sale-start" class="block text-sm font-medium text-gray-700">Sale Start</label>
                <input 
                  id="sale-start"
                  bind:value={saleStart} 
                  type="datetime-local"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label for="sale-end" class="block text-sm font-medium text-gray-700">Sale End</label>
                <input 
                  id="sale-end"
                  bind:value={saleEnd} 
                  type="datetime-local"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4">
              <div>
                <label for="quantity-total" class="block text-sm font-medium text-gray-700">Total Quantity</label>
                <input 
                  id="quantity-total"
                  bind:value={quantityTotal} 
                  type="number" 
                  min="1"
                  placeholder="Leave empty for unlimited"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                />
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-4">
              <button 
                type="button" 
                on:click={closeProductModal}
                class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Product
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  {/if}

  <!-- Product Edit Modal -->
  {#if showEditModal}
    <div class="fixed inset-0 bg-white/10 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] flex flex-col">
        <div class="p-6 flex-shrink-0">
          <h3 class="text-xl font-semibold mb-4">Edit Product</h3>
        </div>
        <div class="px-6 pb-6 overflow-y-auto flex-1">
          <form on:submit={handleEditSubmit} class="space-y-4">
            <div>
              <label for="edit-product-name" class="block text-sm font-medium text-gray-700">Product Name *</label>
              <input 
                id="edit-product-name"
                bind:value={productName} 
                type="text" 
                required 
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
              />
            </div>

            <div>
              <label for="edit-product-description" class="block text-sm font-medium text-gray-700">Description</label>
              <textarea 
                id="edit-product-description"
                bind:value={productDescription} 
                rows="3"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="edit-product-price" class="block text-sm font-medium text-gray-700">Price *</label>
                <input 
                  id="edit-product-price"
                  bind:value={productPrice} 
                  type="number" 
                  step="0.01"
                  min="0"
                  required 
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label for="edit-currency-type" class="block text-sm font-medium text-gray-700">Currency</label>
                <select 
                  id="edit-currency-type"
                  bind:value={currencyType}
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="NOK">NOK (kr)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD (C$)</option>
                </select>
              </div>
            </div>

            <div>
              <label for="edit-product-type" class="block text-sm font-medium text-gray-700">Product Type *</label>
              <select 
                id="edit-product-type"
                bind:value={productType} 
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {#each productTypes as type}
                  <option value={type.value}>{type.label}</option>
                {/each}
              </select>
            </div>

            <!-- Role-based limits for WCS balance -->
            <div class="border-t pt-4">
              <h4 class="text-sm font-medium text-gray-700 mb-2">Role Balance Limits (Optional)</h4>
              <p class="text-xs text-gray-500 mb-3">Set limits to maintain leader/follower balance at your event</p>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="edit-leader-limit" class="block text-sm font-medium text-gray-700">Max Leaders</label>
                  <input 
                    id="edit-leader-limit"
                    bind:value={leaderLimit} 
                    type="number" 
                    min="1"
                    placeholder="e.g., 50"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label for="edit-follower-limit" class="block text-sm font-medium text-gray-700">Max Followers</label>
                  <input 
                    id="edit-follower-limit"
                    bind:value={followerLimit} 
                    type="number" 
                    min="1"
                    placeholder="e.g., 50"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                  />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="edit-sale-start" class="block text-sm font-medium text-gray-700">Sale Start</label>
                <input 
                  id="edit-sale-start"
                  bind:value={saleStart} 
                  type="datetime-local"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label for="edit-sale-end" class="block text-sm font-medium text-gray-700">Sale End</label>
                <input 
                  id="edit-sale-end"
                  bind:value={saleEnd} 
                  type="datetime-local"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="edit-quantity-total" class="block text-sm font-medium text-gray-700">Total Quantity</label>
                <input 
                  id="edit-quantity-total"
                  bind:value={quantityTotal} 
                  type="number" 
                  min="1"
                  placeholder="Leave empty for unlimited"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                />
              </div>
              <div class="flex items-center">
                <label class="flex items-center">
                  <input 
                    type="checkbox" 
                    bind:checked={isActive}
                    class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <span class="ml-2 text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-4">
              <button 
                type="button" 
                on:click={closeEditModal}
                class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update Product
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  {/if}

  <!-- Event Edit Modal -->
  <EditEventDetailsModal
    bind:showModal={showEditEventModal}
    eventData={data.event}
    eventDetailsData={data.eventDetails}
    on:success={handleEventUpdateSuccess}
    on:close={closeEditEventModal}
  />

  <!-- Participants Modal -->
  <ParticipantsModal
    eventId={data.event.id}
    bind:showModal={showParticipantsModal}
    on:close={closeParticipantsModal}
  />
</div>
