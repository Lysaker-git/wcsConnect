<script lang="ts">
  import { enhance } from '$app/forms';
  import { tick } from 'svelte';

  export let data: {
    participant: any;
    participantProducts: any[];
    unpaidProducts: any[];
    paidProducts: any[];
    unpaidTotal: number;
    paidTotal: number;
    availableProducts: any[];
    availableTickets: any[];
    stripe_fee_model: string;
    useNets: boolean;
    event: any;
  };

  const {
    participant,
    participantProducts,
    availableProducts,
    availableTickets,
    stripe_fee_model,
    useNets,
    event
  } = data;

  let unpaidTotal = data.unpaidTotal;
  let unpaidProducts = data.unpaidProducts;
  let paidProducts = data.paidProducts;

  // ─── Status helpers ───────────────────────────────────────────────────────
  const statusColors: Record<string, string> = {
    approved: 'bg-green-900/40 text-green-300 border border-green-700',
    rejected: 'bg-red-900/40 text-red-300 border border-red-700',
    pending: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
    pending_single_registration: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
    pending_couples_registration: 'bg-blue-900/40 text-blue-300 border border-blue-700'
  };
  const statusLabels: Record<string, string> = {
    approved: '✅ Approved',
    rejected: '❌ Rejected',
    pending: '⏳ Pending Review',
    pending_single_registration: '⏳ Pending Approval',
    pending_couples_registration: '⏳ Pending (Couples)'
  };

  const isPending = ['pending', 'pending_single_registration', 'pending_couples_registration'].includes(participant.status);

  // ─── Fee calculation ──────────────────────────────────────────────────────
  $: stripeFee = stripe_fee_model === 'on_top' ? unpaidTotal * 0.035 : 0;
  $: serviceFee = unpaidTotal * 0.01;
  $: grandTotal = unpaidTotal + stripeFee + serviceFee;

  // ─── MVA breakdown — informational only, already included in prices ───────
  $: unpaidMVA = unpaidProducts.reduce((sum, p) => sum + parseFloat(p.mva_amount ?? '0'), 0);
  $: paidMVA = paidProducts.reduce((sum, p) => sum + parseFloat(p.mva_amount ?? '0'), 0);

  // ─── Product grouping ─────────────────────────────────────────────────────
  const productTypeLabels: Record<string, string> = {
    intensive: '🎓 Intensives',
    merchandise: '👕 Merchandise',
    other: '📦 Other'
  };
  $: availableByType = Object.entries(
    availableProducts
      .filter(p => p.product_type !== 'accommodation')
      .reduce((acc: Record<string, any[]>, p) => {
        if (!acc[p.product_type]) acc[p.product_type] = [];
        acc[p.product_type].push(p);
        return acc;
      }, {})
  );
  let quantities: Record<string, number> = {};
  availableProducts.forEach(p => {
    if (p.product_type !== 'intensive' && p.product_type !== 'accommodation') quantities[p.id] = 1;
  });

  // ─── Edit registration modal state ────────────────────────────────────────
  let showEditModal = false;
  let isSavingRegistration = false;
  let saveError = '';

  // Form fields — pre-filled from current participant data
  let roleInput: string = participant.role ?? 'follower';
  let wsdcIDInput: string = participant.wsdcID ?? '';
  let wsdcLevelInput: string = participant.wsdcLevel ?? '';
  let countryInput: string = participant.country ?? '';
  let ageInput: string = participant.age ?? '';
  let partnerNameInput: string = participant.partner_name ?? '';

  // Ticket selection
  let selectedTicket: string = '';
  const existingTicket = participantProducts.find((p: any) => p.product_type === 'ticket');
  const existingTicketId = existingTicket?.product_id ?? null;

  // Promo code
  let promoInputTicket = '';
  let promoCodeTicket = '';
  let promoDiscountTicket = 0;
  let promoErrorTicket = '';
  let promoCheckingTicket = false;

  // Partner lookup
  let partnerSuggestions: any[] = [];
  let showPartnerDropdown = false;
  let partnerSearchTimeout: any = null;
  let isPartnerSearching = false;
  let addingProduct: string | null = null; // tracks which product_id is being added

  async function searchPartnerProfiles(query: string) {
    if (query.length < 3) { partnerSuggestions = []; showPartnerDropdown = false; isPartnerSearching = false; return; }
    if (partnerSearchTimeout) clearTimeout(partnerSearchTimeout);
    isPartnerSearching = true;
    partnerSearchTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-profiles?query=${encodeURIComponent(query)}`);
        const result = await res.json();
        partnerSuggestions = result.profiles || [];
        showPartnerDropdown = partnerSuggestions.length > 0;
      } catch { partnerSuggestions = []; showPartnerDropdown = false; }
      finally { isPartnerSearching = false; }
    }, 300);
  }

  function selectPartnerSuggestion(s: any) {
    partnerNameInput = s.username;
    showPartnerDropdown = false;
  }

  // Changes summary for review step
  $: changesSummary = (() => {
    const changes: string[] = [];
    if (roleInput !== (participant.role ?? '')) changes.push(`Role → ${roleInput}`);
    if ((wsdcIDInput || '') !== (String(participant.wsdcID ?? ''))) changes.push(`WSDC ID → ${wsdcIDInput}`);
    if ((wsdcLevelInput || '') !== (participant.wsdcLevel ?? '')) changes.push(`WSDC Level → ${wsdcLevelInput}`);
    if ((countryInput || '') !== (participant.country ?? '')) changes.push(`Country → ${countryInput}`);
    if ((ageInput || '') !== (participant.age ?? '')) changes.push(`Birthdate → ${ageInput}`);
    if ((partnerNameInput || '') !== (participant.partner_name ?? '')) changes.push(`Partner → ${partnerNameInput}`);
    if (promoCodeTicket) changes.push(`Promo applied: ${promoCodeTicket} (${promoDiscountTicket}% off)`);
    if (selectedTicket && selectedTicket !== existingTicketId) changes.push('Ticket changed');
    return changes;
  })();

  // ─── Checkout ─────────────────────────────────────────────────────────────
  let isCheckingOut = false;
  let checkoutError = '';

  async function checkout() {
    isCheckingOut = true;
    checkoutError = '';
    const endpoint = useNets ? '/api/nets/checkout' : '/api/stripe/checkout';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ participant_id: participant.id })
      });
      const json = await res.json();
      if (json.url) { window.location.href = json.url; }
      else { checkoutError = json.error ?? 'Failed to start checkout'; isCheckingOut = false; }
    } catch { checkoutError = 'Something went wrong'; isCheckingOut = false; }
  }

  function openEditModal() { saveError = ''; showEditModal = true; }
  function closeEditModal() { showEditModal = false; }
</script>

<!-- ─── Saving overlay ────────────────────────────────────────────────────── -->
{#if isSavingRegistration}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-[60] animate-fade-in">
    <div class="bg-stone-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center gap-4 border border-stone-700">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-500"></div>
      <p class="text-lg font-semibold text-stone-100">Saving changes…</p>
      <p class="text-sm text-stone-400 text-center">Please wait while we update your registration.</p>
    </div>
  </div>
{/if}

<!-- ─── Edit Registration Modal ───────────────────────────────────────────── -->
{#if showEditModal}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-fade-in">
    <div class="bg-stone-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-stone-700">
      <!-- Modal header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-stone-700">
        <h3 class="text-lg font-bold text-stone-100">Edit Registration</h3>
        <button on:click={closeEditModal} class="text-stone-400 hover:text-stone-100 text-2xl leading-none">&times;</button>
      </div>

      <!-- Modal body -->
      <div class="overflow-y-auto flex-1 px-6 py-5">
        <form
          id="edit-registration-form"
          method="POST"
          action="?/updateRegistration"
          use:enhance={() => {
            isSavingRegistration = true;
            saveError = '';
            return async ({ result, update }) => {
              await update({ reset: false });
              isSavingRegistration = false;
              if (result.type === 'success') {
                showEditModal = false;
                await tick();
                location.reload();
              } else {
                saveError = (result as any)?.data?.message ?? 'Failed to save changes. Please try again.';
              }
            };
          }}
          class="space-y-4"
        >
          <!-- Role + WSDC ID -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-stone-400 mb-1">Role</label>
              <select name="role" bind:value={roleInput}
                class="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500">
                <option value="follower">Follower</option>
                <option value="leader">Leader</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-stone-400 mb-1">WSDC ID</label>
              <input name="wsdcID" bind:value={wsdcIDInput} type="number" placeholder="e.g. 12345"
                class="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500" />
            </div>
          </div>

          <!-- WSDC Level + Country -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-stone-400 mb-1">WSDC Level</label>
              <input name="wsdcLevel" bind:value={wsdcLevelInput} placeholder="e.g. Novice"
                class="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-stone-400 mb-1">Country</label>
              <input name="country" bind:value={countryInput} placeholder="e.g. Norway"
                class="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500" />
            </div>
          </div>

          <!-- Birthdate + Partner -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-stone-400 mb-1">Birthdate</label>
              <input name="age" bind:value={ageInput} type="date"
                class="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div class="relative">
              <label class="block text-xs font-medium text-stone-400 mb-1">Partner name</label>
              <input name="partner_name" bind:value={partnerNameInput}
                on:input={() => searchPartnerProfiles(partnerNameInput)}
                autocomplete="off" placeholder="Search by name…"
                class="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500" />
              {#if showPartnerDropdown}
                <div class="absolute left-0 right-0 bg-stone-900 border border-stone-700 mt-1 rounded-lg max-h-40 overflow-auto z-20 shadow-xl">
                  {#each partnerSuggestions as s}
                    <div class="px-3 py-2 hover:bg-stone-800 cursor-pointer text-stone-100 text-sm"
                      on:click={() => selectPartnerSuggestion(s)}>
                      {s.username}{s.wsdcID ? ` (${s.wsdcID})` : ''}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>

          <!-- Divider -->
          <div class="border-t border-stone-700 pt-4">
            <p class="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Ticket & Promo</p>

            <!-- Ticket selector -->
            <div class="mb-3">
              <label class="block text-xs font-medium text-stone-400 mb-1">Event Ticket</label>
              <select name="ticket_product_id" bind:value={selectedTicket}
                class="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500">
                <option value="">(Keep current ticket)</option>
                {#each availableTickets as t}
                  <option value={t.id}>{t.name} — {parseFloat(t.price).toFixed(2)} {t.currency_type}</option>
                {/each}
              </select>
              {#if existingTicket}
                <p class="text-xs text-stone-500 mt-1">Current: {existingTicket.product_name}</p>
              {/if}
            </div>

            <!-- Promo code -->
            <div>
              <label class="block text-xs font-medium text-stone-400 mb-1">Promo Code <span class="text-stone-600">(optional)</span></label>
              <div class="flex gap-2">
                <input type="text" bind:value={promoInputTicket} placeholder="Enter code"
                  class="flex-1 px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500" />
                <button type="button" disabled={promoCheckingTicket}
                  on:click={async () => {
                    if (!promoInputTicket) return;
                    promoCheckingTicket = true; promoErrorTicket = '';
                    try {
                      const fd = new FormData();
                      fd.append('code', promoInputTicket.toUpperCase().trim());
                      const res = await fetch(`/events/${event.id}/register?/validatePromo`, { method: 'POST', body: fd });
                      const result = await res.json();
                      const parsed = JSON.parse(result.data);
                      if (res.status === 200) {
                        const idx = parsed.find((x: any) => typeof x === 'object' && x !== null) ?? {};
                        promoCodeTicket = parsed[idx.promoCode] ?? '';
                        promoDiscountTicket = parseFloat(parsed[idx.promoDiscount]) || 0;
                        promoErrorTicket = '';
                      } else {
                        const idx = parsed.find((x: any) => typeof x === 'object' && x !== null) ?? {};
                        promoErrorTicket = parsed[idx.promoError] ?? 'Invalid or expired promo code';
                        promoCodeTicket = ''; promoDiscountTicket = 0;
                      }
                    } catch { promoErrorTicket = 'Failed to validate promo code'; promoCodeTicket = ''; promoDiscountTicket = 0; }
                    promoCheckingTicket = false;
                  }}
                  class="px-3 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg text-sm text-stone-100 transition disabled:opacity-50">
                  {promoCheckingTicket ? 'Checking…' : 'Validate'}
                </button>
              </div>
              {#if promoErrorTicket}
                <p class="text-xs text-red-400 mt-1">{promoErrorTicket}</p>
              {/if}
              {#if promoCodeTicket}
                <p class="text-xs text-green-400 mt-1">✓ Code <strong>{promoCodeTicket}</strong> applied — {promoDiscountTicket}% off</p>
              {/if}
              <input type="hidden" name="promo_code" value={promoCodeTicket} />
              <input type="hidden" name="promo_discount" value={promoDiscountTicket} />
            </div>
          </div>

          <!-- Changes summary -->
          {#if changesSummary.length > 0}
            <div class="p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg">
              <p class="text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wide">Pending changes</p>
              <ul class="space-y-1">
                {#each changesSummary as c}
                  <li class="text-xs text-amber-200 flex items-center gap-1">
                    <span class="text-amber-500">→</span> {c}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          {#if saveError}
            <div class="p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg text-sm">{saveError}</div>
          {/if}
        </form>
      </div>

      <!-- Modal footer -->
      <div class="px-6 py-4 border-t border-stone-700 flex justify-end gap-3">
        <button type="button" on:click={closeEditModal}
          class="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-100 rounded-xl text-sm font-medium transition">
          Cancel
        </button>
        <button type="submit" form="edit-registration-form" disabled={isSavingRegistration}
          class="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm transition disabled:opacity-50 flex items-center gap-2">
          {#if isSavingRegistration}
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Saving…
          {:else}
            Save changes
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ─── Page ──────────────────────────────────────────────────────────────── -->
<div class="min-h-screen bg-stone-900 py-10 px-6">
  <div class="max-w-2xl mx-auto space-y-6">

    <!-- Back + header -->
    <div>
      <a href="/profile" class="text-sm text-amber-500 hover:underline">← Back to profile</a>
      <h1 class="text-3xl font-bold text-stone-100 mt-2">{event?.title}</h1>
      <div class="flex items-center justify-between mt-3">
        <div class="flex items-center gap-3">
          <span class="px-3 py-1 rounded-full text-xs font-semibold {statusColors[participant.status] ?? 'bg-stone-700 text-stone-300'}">
            {statusLabels[participant.status] ?? participant.status}
          </span>
          <span class="text-stone-500 text-xs">
            Registered {new Date(participant.created_at).toLocaleDateString()}
          </span>
        </div>
        {#if isPending}
          <button on:click={openEditModal}
            class="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-100 rounded-xl text-sm font-semibold transition flex items-center gap-2">
            ✏️ Edit registration
          </button>
        {/if}
      </div>
    </div>

    <!-- Pending notice banner -->
    {#if isPending}
      <div class="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-xl">
        <p class="text-sm font-semibold text-yellow-300 mb-1">Awaiting approval</p>
        <p class="text-xs text-yellow-200/70">Your registration is being reviewed. You can still edit your details using the button above. Payment becomes available once approved.</p>
      </div>
    {/if}

    <!-- Registration details card -->
    <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6 neomorph-card">
      <h2 class="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">Registration Details</h2>
      <div class="grid grid-cols-2 gap-y-3 text-sm">
        <div class="text-stone-400">Role</div>
        <div class="text-stone-100 font-medium capitalize">{participant.role ?? '—'}</div>

        <div class="text-stone-400">WSDC ID</div>
        <div class="text-stone-100 font-medium">{participant.wsdcID ?? '—'}</div>

        <div class="text-stone-400">WSDC Level</div>
        <div class="text-stone-100 font-medium">{participant.wsdcLevel ?? '—'}</div>

        <div class="text-stone-400">Country</div>
        <div class="text-stone-100 font-medium">{participant.country ?? '—'}</div>

      </div>
    </div>

    <!-- Paid products -->
    {#if paidProducts.length > 0}
      <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6 neomorph-card">
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
        {#if paidMVA > 0}
          <div class="flex justify-between text-xs text-stone-500 mt-1">
            <span>of which MVA (incl.)</span>
            <span>{paidMVA.toFixed(2)} {paidProducts[0]?.currency_type}</span>
          </div>
        {/if}
      </div>
    {/if}



    <!-- Unpaid products -->
    {#if unpaidProducts.length > 0}
      <div class="bg-stone-800 rounded-2xl border border-amber-700/40 p-6 neomorph-card">
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
          {#if unpaidMVA > 0}
            <div class="flex justify-between text-xs text-stone-500 mt-1">
              <span>of which MVA (incl.)</span>
              <span>{unpaidMVA.toFixed(2)} {unpaidProducts[0]?.currency_type}</span>
            </div>
          {/if}
        </div>

        {#if checkoutError}
          <div class="mt-3 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg text-sm">{checkoutError}</div>
        {/if}

        {#if participant.status === 'approved'}
          <button on:click={checkout} disabled={isCheckingOut}
            class="mt-4 w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
            {#if isCheckingOut}
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Redirecting to payment…
            {:else}
              Pay {grandTotal.toFixed(2)} {unpaidProducts[0]?.currency_type}
            {/if}
          </button>
        {:else}
          <p class="mt-3 text-xs text-stone-500 text-center">Payment available once your registration is approved.</p>
        {/if}
      </div>
    {/if}

    <!-- No products yet -->
    {#if participantProducts.length === 0}
      <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6 text-center text-stone-500 text-sm neomorph-card">
        No products on this registration yet.
      </div>
    {/if}

    <!-- Add more products (approved only) -->
    {#if participant.status === 'approved' && availableByType.length > 0}
      <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6 neomorph-card">
        <h2 class="text-lg font-semibold text-stone-100 mb-1">Add to your registration</h2>
        <p class="text-stone-500 text-xs mb-5">These will be added to your next payment.</p>

        {#each availableByType as [type, products]}
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-stone-400 mb-3">{productTypeLabels[type] ?? type}</h3>
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
                        <p class="text-xs text-stone-500 mt-1">{product.quantity_total - (product.quantity_sold ?? 0)} remaining</p>
                      {/if}
                    </div>
                    <span class="text-stone-100 font-bold text-sm ml-4 flex-shrink-0">
                      {parseFloat(product.price).toFixed(2)} {product.currency_type}
                    </span>
                  </div>
                  <form method="POST" action="?/addProduct"
                    use:enhance={() => {
                      addingProduct = product.id;
                      return async ({ result, update }) => {
                        await update({ reset: false });
                        addingProduct = null;
                        if (result.type === 'success') {
                          location.reload();
                        }
                      };
                    }}
                    class="flex items-center gap-2">
                    <input type="hidden" name="product_id" value={product.id} />
                    {#if product.product_type === 'merchandise'}
                      <input type="number" name="quantity" bind:value={quantities[product.id]} min="1"
                        max={product.quantity_total ? product.quantity_total - product.quantity_sold : 99}
                        class="w-16 px-2 py-1.5 rounded-lg bg-stone-800 border border-stone-600 text-stone-100 text-sm text-center focus:outline-none focus:border-amber-500" />
                    {:else}
                      <input type="hidden" name="quantity" value="1" />
                    {/if}
                    <button type="submit" disabled={addingProduct === product.id}
                      class="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1">
                      {#if addingProduct === product.id}
                        <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Adding…
                      {:else}
                        Add
                      {/if}
                    </button>
                  </form>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if participant.status !== 'approved' && availableProducts.length === 0 && !isPending}
      <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6 text-center text-stone-500 text-sm neomorph-card">
        Additional products will be available once your registration is approved.
      </div>
    {/if}
    <!-- Accommodation (approved only) -->
    {#if participant.status === 'approved'}
      <div class="bg-stone-800 rounded-2xl border border-stone-700 p-5 neomorph-card">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-base font-semibold text-stone-100">🏨 Accommodation</h2>
            <p class="text-stone-500 text-xs mt-0.5">Book your room for this event</p>
          </div>
          <a href="/profile/{participant.id}/accommodation"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition">
            View rooms →
          </a>
        </div>
      </div>
    {/if}

  </div>
</div>


<style>
  .neomorph-card {
    box-shadow: 5px 5px 18px rgba(2,6,23,0.5), -5px -5px 12px rgba(255,255,255,0.04);
  }
  .animate-fade-in {
    animation: fadeIn 0.2s ease-in-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>