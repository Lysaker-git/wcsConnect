<script lang="ts">
  import { enhance } from '$app/forms';

  export let data: { event: any; participants: any[] };

    const statusColors: Record<string, string> = {
        approved: 'bg-green-100 text-green-700',
        rejected: 'bg-red-100 text-red-700',
        pending: 'bg-amber-200 text-amber-900',
        pending_single_registration: 'bg-amber-200 text-amber-900',
        pending_couples_registration: 'bg-blue-100 text-blue-700'
    };

    const statusLabel: Record<string, string> = {
        approved: 'Approved',
        rejected: 'Rejected',
        pending: 'Pending',
        pending_single_registration: 'Pending (Single)',
        pending_couples_registration: 'Pending (Couples)'
    };

    $: pending = data.participants.filter(p => 
        p.status === 'pending' || 
        p.status === 'pending_couples_registration' ||
        p.status === 'pending_single_registration'
    );
    $: approved = data.participants.filter(p => p.status === 'approved');
    $: rejected = data.participants.filter(p => p.status === 'rejected');

    let filter: 'all' | 'pending' | 'approved' | 'rejected' = 'pending';
    let productFilter: 'all' | 'has' | 'none' = 'all';
    let search: string = '';

    $: filtered = (() => {
      const statusFiltered = filter === 'all'
        ? data.participants
        : data.participants.filter(p => {
          if (filter === 'pending') return p.status === 'pending' ||
            p.status === 'pending_couples_registration' ||
            p.status === 'pending_single_registration';
          return p.status === filter;
        });

      // Apply product presence filter independent from status
      const productFiltered = productFilter === 'all'
        ? statusFiltered
        : statusFiltered.filter(p => {
            const has = (p.products ?? []).length > 0;
            return productFilter === 'has' ? has : !has;
          });

      const term = (search ?? '').toString().trim().toLowerCase();
      if (!term) return productFiltered;

      return productFiltered.filter(p => {
        const username = p.profiles?.username?.toString()?.toLowerCase() ?? '';
        const country = p.profiles?.country?.toString()?.toLowerCase() ?? '';
        const role = p.profiles?.role?.toString()?.toLowerCase() ?? '';
        const eventRole = p.event_role?.toString()?.toLowerCase() ?? '';
        const products = (p.products ?? []).map((x: any) => (x.product_name ?? '').toString().toLowerCase()).join(' ');

        const combined = `${username} ${country} ${role} ${eventRole} ${products}`;
        return combined.includes(term);
      });
    })();

  function fmt(n: number) { return parseFloat(n?.toString() ?? '0').toFixed(2); }
</script>

<div class="max-w-5xl mx-auto py-10 px-6">
  <!-- Header -->
  <div class="mb-8">
    <a href="/admin/events/{data.event?.id}" class="text-sm text-amber-600 hover:underline">
      ← Back to event
    </a>
    <h1 class="text-3xl font-bold text-stone-100 mt-2">Participants</h1>
    <p class="text-stone-400 text-sm mt-1">{data.event?.title}</p>
  </div>

  <a href="/admin/events/{data.event?.id}/approval"
    class="px-4 py-2 mb-4 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl transition">
    Open approval queue →
  </a>

  <!-- Search -->
  <div class="mb-6 pt-4">
    <input
      type="search"
      bind:value={search}
      placeholder="Search participants by name, country, role or product..."
      class="w-full px-4 py-2 rounded bg-stone-900 text-stone-100 border border-stone-700 focus:outline-none"
    />
  </div>

  <!-- Product presence filter (independent) -->
  <div class="flex gap-2 mb-4">
    <button
      on:click={() => productFilter = 'all'}
      class="px-3 py-1 rounded-full text-sm font-medium {productFilter === 'all' ? 'bg-amber-700 text-amber-100' : 'bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-50'}"
    >
      All
    </button>
    <button
      on:click={() => productFilter = 'has'}
      class="px-3 py-1 rounded-full text-sm font-medium {productFilter === 'has' ? 'bg-amber-700 text-amber-100' : 'bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-50'}"
    >
      With products
    </button>
    <button
      on:click={() => productFilter = 'none'}
      class="px-3 py-1 rounded-full text-sm font-medium {productFilter === 'none' ? 'bg-amber-700 text-amber-100' : 'bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-50'}"
    >
      No products
    </button>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-3 gap-4 mb-8 ">
    <div class="p-4 neomorph-card">
      <p class="text-xs text-stone-300 uppercase">Pending Approval</p>
      <p class="text-2xl font-bold text-stone-100">{pending.length}</p>
    </div>
    <div class="p-4 neomorph-card">
      <p class="text-xs text-stone-300 uppercase">Approved</p>
      <p class="text-2xl font-bold text-stone-100">{approved.length}</p>
    </div>
    <div class="p-4 neomorph-card">
      <p class="text-xs text-stone-300 uppercase">Rejected</p>
      <p class="text-2xl font-bold text-stone-100">{rejected.length}</p>
    </div>
  </div>

  <!-- Filter tabs -->
  <div class="flex gap-2 mb-6">
    {#each ['pending', 'approved', 'rejected', 'all'] as f}
      <button
        on:click={() => filter = f as any}
        class="px-4 py-1.5 rounded-full text-sm font-medium transition-all {filter === f
          ? 'bg-amber-700 text-amber-100'
          : 'bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-50'}"
      >
        {f.charAt(0).toUpperCase() + f.slice(1)}
      </button>
    {/each}
  </div>

  <!-- Participant list -->
  <div class="space-y-4">
    {#each filtered as participant (participant.id)}
      <div class="p-4 neomorph-card">
        <div class="p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

          <!-- Left: user info -->
          <div class="flex items-start gap-4 flex-1">
            {#if participant.profiles?.avatar_url}
              <img 
                src={participant.profiles.avatar_url} 
                alt="avatar"
                class="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            {:else}
              <div class="w-10 h-10 rounded-full bg-stone-700 flex items-center justify-center flex-shrink-0">
                <span class="text-stone-100 font-bold text-sm">
                  {participant.profiles?.username?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
            {/if}

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-semibold text-stone-100">{participant.profiles?.username ?? 'Unknown'}</p>
                <span class="px-2 py-0.5 rounded-full text-xs font-medium {statusColors[participant.status] ?? 'bg-gray-100 text-gray-600'}">
                  {statusLabel[participant.status] ?? participant.status}
                </span>
                <span class="px-2 py-0.5 rounded-full text-xs bg-stone-100 text-stone-600 capitalize">
                  {participant.profiles?.role ?? '—'}
                </span>
              </div>

              <div class="flex gap-3 mt-1 text-xs text-stone-400">
                <span>{participant.profiles?.country ?? ''}</span>
                {#if participant.profiles?.wsdcLevel}
                  <span>· {participant.profiles.wsdcLevel}</span>
                {/if}
                <span>· Registered {new Date(participant.created_at).toLocaleDateString()}</span>
              </div>

              <!-- Products -->
              {#if participant.products?.length > 0}
                <div class="mt-3 space-y-1">
                  {#each participant.products as product}
                    <div class="flex items-center justify-between text-xs text-stone-400 bg-stone-800 rounded px-3 py-1.5">
                      <span>
                        {product.product_name}
                        <span class="text-stone-400">× {product.quantity_ordered}</span>
                      </span>
                      <div class="flex items-center gap-2">
                        <span class="font-medium">{fmt(product.subtotal)} {product.currency_type}</span>
                        <span class="px-1.5 py-0.5 rounded text-xs {product.payment_status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-amber-100 text-amber-800'}">
                          {product.payment_status}
                        </span>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="mt-2 text-xs text-stone-400">No products selected</p>
              {/if}
            </div>
          </div>

          <!-- Right: action buttons -->
          <div class="flex gap-2 flex-shrink-0">
            <!-- {#if participant.status !== 'approved'}
              <form
                method="POST"
                action="?/approve"
                use:enhance={() => {
                  return async ({ update }) => { await update(); };
                }}
              >
                <input type="hidden" name="participant_id" value={participant.id} />
                <button
                  type="submit"
                  class="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                >
                  Approve
                </button>
              </form>
            {/if} -->

            {#if participant.status !== 'rejected'}
              <form
                method="POST"
                action="?/reject"
                use:enhance={() => {
                  return async ({ update }) => { await update(); };
                }}
              >
                <input type="hidden" name="participant_id" value={participant.id} />
                <button
                  type="submit"
                  class="px-3 py-1.5 bg-red-100 text-red-800 text-sm font-medium rounded-lg hover:bg-red-200"
                >
                  Reject
                </button>
              </form>
            {/if}
            <a href="/admin/events/{data.event.id}/participants/{participant.id}"
                class="px-3 py-1.5 bg-stone-700 text-stone-200 text-sm font-medium rounded-lg hover:bg-stone-600">
                Edit
            </a>
          </div>
        </div>
      </div>
    {:else}
      <div class="text-center py-12 text-stone-400">
        No {filter === 'all' ? '' : filter} participants yet
      </div>
    {/each}
  </div>
</div>

<style>
    .neomorph-card {
        box-shadow:
            5px 5px 18px rgba(2,6,23,0.5),
            -5px -5px 12px rgba(255,255,255,0.08);
        border-radius: 1.25rem;
        border: 2px solid rgba(255,255,255,0.02);
        background: inherit;
    }
</style>