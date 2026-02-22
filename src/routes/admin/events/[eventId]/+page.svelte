<script lang="ts">
  // route admin/events/[eventId]/+page.svelte - main event admin page with details and product management
  import { enhance } from '$app/forms';
  import { SiFacebook, SiInstagram, SiTiktok } from "@icons-pack/svelte-simple-icons";
  import EditEventDetailsModal from '$lib/components/EditEventDetailsModal.svelte';
  import ParticipantsModal from '$lib/components/ParticipantsModal.svelte';
  export let data: { event: any; eventDetails: any; user: any; products: any[] };

  console.log('Admin event page loaded with data:', data);

  // Event modals state
  let showEditEventModal = false;
  let showParticipantsModal = false;
  // Actions dropdown state
  let showActions = false;

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
  $: isPublished = data.event?.is_published ?? false;
</script>

<div class="max-w-4xl mx-auto py-12 px-6 neumorph-card">
  <h1 class="text-3xl font-bold mb-6 text-stone-100">Event Admin: {data.event.title}</h1>

  <div class="bg-stone-800 shadow-lg rounded-lg p-6 neumorph-subcard">
    <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-stone-100">Event Details</h2>
        <form
          method="POST"
          action="?/togglePublish"
          use:enhance={() => {

            return async ({ result, update }) => {
              if (result.type === 'success') {
                isPublished = result.data?.is_published ?? !isPublished;
              }
              await update({ reset: false });
            };
          }}
          >
          <button
            type="submit"
            class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all {isPublished
              ? 'bg-green-900 text-green-300 hover:bg-green-800'
              : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}"
          >
            <span class="w-2 h-2 rounded-full {isPublished ? 'bg-green-400' : 'bg-stone-500'}"></span>
            {isPublished ? 'Published' : 'Unpublished'}
          </button>
        </form>
        <div class="relative">
          <button on:click={() => showActions = !showActions} class="px-3 py-2 bg-stone-700 text-stone-200 rounded-md flex items-center gap-2">
          <span>⚙️</span><span>Actions</span>
          </button>
          {#if showActions}
            <div class="absolute right-0 mt-2 w-48 bg-stone-800 border border-stone-700 rounded-md shadow-lg z-20">
              <a href={`/admin/events/${data.event.id}/edit`} on:click={() => showActions = false} class="block w-full text-left px-4 py-2 text-stone-100 hover:bg-stone-700">Edit Event</a>
              <a href={`/admin/events/${data.event.id}/participants`} on:click={() => showActions = false} class="block w-full text-left px-4 py-2 text-stone-100 hover:bg-stone-700">Participants</a>
              <a href={`/admin/events/${data.event.id}/dashboard`} on:click={() => showActions = false} class="block w-full text-left px-4 py-2 text-stone-100 hover:bg-stone-700">Dashboard</a>
              <a href={`/admin/events/${data.event.id}/products`} on:click={() => showActions = false} class="block w-full text-left px-4 py-2 text-stone-100 hover:bg-stone-700">Products</a>
              <a href={`/admin/events/${data.event.id}/crew`} on:click={() => showActions = false} class="block w-full text-left px-4 py-2 text-stone-100 hover:bg-stone-700">Permissions / Settings</a>
            </div>
          {/if}
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

      <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-stone-400">Title</label>
            <p class="mt-1 text-lg font-semibold text-stone-100">{data.event.title}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-stone-400">When</label>
            <p class="mt-1 text-stone-100">{new Date(data.event.start_date).toLocaleDateString()} — {new Date(data.event.end_date).toLocaleDateString()}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-stone-400">Organizer</label>
            <p class="mt-1 text-stone-100">{data.eventDetails?.organizer_name || '—'}</p>
            {#if data.eventDetails?.organizer_email}
              <p class="text-sm text-stone-500">{data.eventDetails.organizer_email}</p>
            {/if}
            {#if data.eventDetails?.organizer_phone}
              <p class="text-sm text-stone-500">{data.eventDetails.organizer_phone}</p>
            {/if}
          </div>

          <div>
            <label class="block text-sm font-medium text-stone-400">Location</label>
            <p class="mt-1 text-stone-100">{data.eventDetails?.venue || data.eventDetails?.hotel || '—'}</p>
            {#if data.eventDetails?.address}
              <p class="text-sm text-stone-500">{data.eventDetails.address}</p>
            {/if}
            {#if data.eventDetails?.hotel}
              <p class="text-sm text-stone-500">Hotel: {data.eventDetails.hotel}</p>
            {/if}
          </div>

          <div>
            <label class="block text-sm font-medium text-stone-400">Capacity</label>
            <p class="mt-1 text-stone-100">{data.eventDetails?.max_participants ?? '—'}</p>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-stone-400">Event Type</label>
            <p class="mt-1 text-stone-100">{data.eventDetails?.event_type || '—'}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-stone-400">Languages</label>
            <p class="mt-1 text-stone-100">{data.eventDetails?.languages || '—'}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-stone-400">Social Links</label>
            <div class="mt-2 flex items-center space-x-3">
              {#each data.eventDetails?.social_links || [] as link}
                {#if link.includes('facebook.com')}
                  <a href={link} target="_blank" rel="noreferrer" aria-label="Facebook" class="inline-block text-blue-500">
                    <SiFacebook class="w-6 h-6"/>
                  </a>
                {:else if link.includes('instagram.com')}
                  <a href={link} target="_blank" rel="noreferrer" aria-label="Instagram" class="inline-block text-pink-500">
                    <SiInstagram class="w-6 h-6"/>
                  </a>
                {:else if link.includes('tiktok.com')}
                  <a href={link} target="_blank" rel="noreferrer" aria-label="TikTok" class="inline-block text-black">
                    <SiTiktok class="w-6 h-6"/>
                  </a>
                {/if}
              {/each}
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-stone-400">Media / Links</label>
            <div class="mt-1 space-y-1">
              {#if data.eventDetails?.banner_image_url}
                <img src='{data.eventDetails.banner_image_url}' alt="Banner" class="mt-2 rounded-md border border-stone-700" />
              {/if}
              {#if data.eventDetails?.schedule_image_url}
                <a class="text-sm text-blue-600 hover:underline block" href={data.eventDetails.schedule_image_url} target="_blank" rel="noreferrer">Schedule Image</a>
              {/if}
              {#if data.eventDetails?.promo_video_url}
                <a class="text-sm text-blue-600 hover:underline block" href={data.eventDetails.promo_video_url} target="_blank" rel="noreferrer">Promo Video</a>
              {/if}
              {#if !data.eventDetails?.banner_image_url && !data.eventDetails?.schedule_image_url && !data.eventDetails?.promo_video_url}
                <p class="text-sm text-stone-500">No media links</p>
              {/if}
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-stone-400">Tags</label>
            <div class="mt-2 flex flex-wrap gap-2">
              {#if Array.isArray(data.eventDetails?.tags) && data.eventDetails.tags.length > 0}
                {#each data.eventDetails.tags as tag}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-600 text-stone-100">{tag}</span>
                {/each}
              {:else}
                <span class="text-sm text-stone-500">No tags</span>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

<!-- Products Summary -->
<div class="shadow-lg rounded-lg p-6 mt-8 neumorph-subcard bg-stone-800">
  <div class="flex justify-between items-center">
    <div>
      <h2 class="text-xl font-semibold text-stone-100">Products</h2>
      <p class="text-stone-400 text-sm mt-1">
        {data.products.length} product{data.products.length === 1 ? '' : 's'} ·
        {data.products.filter(p => p.is_active).length} active
      </p>
    </div>
    <a
      href="/admin/events/{data.event.id}/product"
      class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition"
    >
      Manage Products →
    </a>
  </div>
  {#if data.products.length > 0}
    <div class="mt-4 flex flex-wrap gap-2">
      {#each ['ticket', 'intensive', 'merchandise', 'accommodation', 'other'] as type}
        {@const count = data.products.filter(p => p.product_type === type).length}
        {#if count > 0}
          <span class="px-3 py-1 bg-stone-700 text-stone-300 rounded-full text-xs capitalize">
            {type}: {count}
          </span>
        {/if}
      {/each}
    </div>
  {/if}
</div>


</div>

<style>
  	.neumorph-card {
		box-shadow: 10px 10px 30px rgba(2,6,23,0.7), -8px -8px 20px rgba(255,255,255,0.02);
		border-radius: 18px;
		border: 1px solid rgba(255,255,255,0.03);
	}
	.neumorph-subcard {
		background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(0,0,0,0.04));
		box-shadow: inset 4px 4px 10px rgba(2,6,23,0.5), inset -4px -4px 8px rgba(255,255,255,0.02);
		border-radius: 12px;
	}
	.neumorph-btn {
		box-shadow: 6px 6px 16px rgba(2,6,23,0.6), -6px -6px 12px rgba(255,255,255,0.02);
		border: 1px solid rgba(255,255,255,0.03);
	}

	input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:active
  {
    /* The large inset box-shadow covers the browser's background */
    -webkit-box-shadow: 0 0 0 1000px #1c1917bd inset !important;
    /* Change the text color to match your design */
    -webkit-text-fill-color: #F5F5F4 !important;
    /* Optional: Add a smooth transition */
    transition: background-color 5000s ease-in-out 0s;
  }
</style>