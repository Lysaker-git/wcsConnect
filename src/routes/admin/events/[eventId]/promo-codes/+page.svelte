<script lang="ts">
  import { enhance } from '$app/forms';

  export let data: { event: any; promoCodes: any[] };
  export let form: { message?: string; success?: boolean } | null = null;

  let showCreate = false;
  let code = '';
  let discount_percent = '';
  let valid_from = '';
  let valid_to = '';

  function resetForm() {
    code = ''; discount_percent = ''; valid_from = ''; valid_to = '';
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function isExpired(valid_to: string) {
    return new Date(valid_to) < new Date();
  }
</script>

<div class="max-w-4xl mx-auto py-10 px-6">
  <div class="mb-8 flex items-start justify-between">
    <div>
      <a href="/admin/events/{data.event?.id}" class="text-sm text-amber-500 hover:underline">
        ← Back to event
      </a>
      <h1 class="text-3xl font-bold text-stone-100 mt-2">Promo Codes</h1>
      <p class="text-stone-400 text-sm mt-1">{data.event?.title}</p>
    </div>
    <button
      on:click={() => { showCreate = true; }}
      class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition"
    >
      + New Code
    </button>
  </div>

  {#if form?.message}
    <div class="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg text-sm">
      {form.message}
    </div>
  {/if}

  <!-- Codes list -->
  {#if data.promoCodes.length === 0}
    <div class="text-center py-16 text-stone-500">
      No promo codes yet — click "New Code" to create one.
    </div>
  {:else}
    <div class="space-y-3">
      {#each data.promoCodes as promoCode (promoCode.id)}
        {@const expired = isExpired(promoCode.valid_to)}
        <div class="bg-stone-800 rounded-xl border border-stone-700 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <code class="text-lg font-bold text-amber-400 tracking-widest">{promoCode.code}</code>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium {
                !promoCode.is_active ? 'bg-stone-600 text-stone-400' :
                expired ? 'bg-red-900 text-red-300' :
                'bg-green-900 text-green-300'
              }">
                {!promoCode.is_active ? 'Disabled' : expired ? 'Expired' : 'Active'}
              </span>
              <span class="px-2 py-0.5 rounded-full text-xs bg-purple-900 text-purple-300">
                {promoCode.discount_percent}% off
              </span>
            </div>
            <p class="text-xs text-stone-500 mt-1">
              Valid {formatDate(promoCode.valid_from)} — {formatDate(promoCode.valid_to)}
            </p>
          </div>

          <div class="flex gap-2 flex-shrink-0">
            <form method="POST" action="?/toggleCode" use:enhance={() => {
              return async ({ update }) => { await update(); };
            }}>
              <input type="hidden" name="id" value={promoCode.id} />
              <input type="hidden" name="is_active" value={promoCode.is_active} />
              <button
                type="submit"
                class="px-3 py-1.5 text-sm rounded-lg transition {promoCode.is_active
                  ? 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                  : 'bg-green-900/40 text-green-400 hover:bg-green-900/70'}"
              >
                {promoCode.is_active ? 'Disable' : 'Enable'}
              </button>
            </form>

            <form method="POST" action="?/deleteCode" use:enhance={() => {
              if (!confirm(`Delete code "${promoCode.code}"?`)) return () => {};
              return async ({ update }) => { await update(); };
            }}>
              <input type="hidden" name="id" value={promoCode.id} />
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
  {/if}
</div>

<!-- Create modal -->
{#if showCreate}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-stone-800 rounded-2xl shadow-xl w-full max-w-md">
      <div class="p-6 border-b border-stone-700">
        <h3 class="text-xl font-bold text-stone-100">New Promo Code</h3>
      </div>
      <div class="p-6">
        <form method="POST" action="?/createCode"
          use:enhance={() => {
            return async ({ result, update }) => {
              if (result.type === 'success') {
                showCreate = false;
                resetForm();
              }
              await update();
            };
          }}
          class="space-y-4"
        >
          <div>
            <label class="block text-sm font-medium text-stone-300 mb-1">Code *</label>
            <input
              type="text"
              name="code"
              bind:value={code}
              required
              placeholder="e.g. JUDGE50"
              class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 uppercase focus:outline-none focus:border-amber-500"
            />
            <p class="text-xs text-stone-500 mt-1">Will be stored in uppercase automatically</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-stone-300 mb-1">Discount % *</label>
            <input
              type="number"
              name="discount_percent"
              bind:value={discount_percent}
              required
              min="1"
              max="100"
              step="0.01"
              placeholder="e.g. 50"
              class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-stone-300 mb-1">Valid From *</label>
              <input
                type="date"
                name="valid_from"
                bind:value={valid_from}
                required
                class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-stone-300 mb-1">Valid To *</label>
              <input
                type="date"
                name="valid_to"
                bind:value={valid_to}
                required
                class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" on:click={() => { showCreate = false; resetForm(); }}
              class="px-4 py-2 bg-stone-700 text-stone-200 rounded-xl hover:bg-stone-600">
              Cancel
            </button>
            <button type="submit"
              class="px-4 py-2 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700">
              Create Code
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}