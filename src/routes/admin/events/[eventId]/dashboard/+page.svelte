<script lang="ts">
  export let data: any;
  const { event, participantRows, stats } = data;

  function fmt(n: number) {
    return n.toFixed(2);
  }

  // Refund handler — we'll wire this up in the next step
  async function refundParticipant(participant_id: string, username: string) {
    if (!confirm(`Refund all paid items for ${username}? This cannot be undone.`)) return;
    const res = await fetch('/api/stripe/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_id })
    });
    const result = await res.json();
    if (!res.ok) {
      alert(result.error ?? 'Refund failed');
    } else {
      alert(`Refund issued for ${username}`);
      location.reload();
    }
  }
</script>

<div class="min-h-screen bg-stone-900 py-10 px-6">
  <div class="max-w-5xl mx-auto space-y-8">

    <!-- Header -->
    <div>
      <a href="/admin/events/{event?.id}" class="text-sm text-amber-200 hover:underline">← Back to event</a>
      <h1 class="text-3xl font-bold text-stone-100 mt-2">{event?.title} — Payments Dashboard</h1>
      <p class="text-stone-400 text-sm mt-1">{event?.start_date} → {event?.end_date}</p>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="p-5 neomorph-card">
        <p class="text-xs text-stone-300 uppercase tracking-wide">Total Revenue</p>
        <p class="text-2xl font-bold text-stone-100 mt-1">{fmt(stats.totalRevenue)} {stats.currency}</p>
        <p class="text-xs text-stone-200 mt-1">{stats.paidCount} paid registrations</p>
      </div>

      <div class="p-5 neomorph-card">
        <p class="text-xs text-stone-300 uppercase tracking-wide">Outstanding</p>
        <p class="text-2xl font-bold text-stone-100 mt-1">{fmt(stats.totalPending)} {stats.currency}</p>
        <p class="text-xs text-stone-200 mt-1">{stats.pendingCount} unpaid registrations</p>
      </div>

      <div class="p-5 neomorph-card">
        <p class="text-xs text-stone-300 uppercase tracking-wide">Organizer Payout</p>
        <p class="text-2xl font-bold text-stone-100 mt-1">{fmt(stats.organizerRevenue)} {stats.currency}</p>
        <p class="text-xs text-stone-200 mt-1">After platform fee</p>
      </div>

      <div class="p-5 neomorph-card">
        <p class="text-xs text-stone-300 uppercase tracking-wide">Platform Fees</p>
        <p class="text-2xl font-bold text-stone-100 mt-1">{fmt(stats.platformFees)} {stats.currency}</p>
        <p class="text-xs text-stone-200 mt-1">1% of revenue</p>
      </div>
    </div>

    <!-- Paid participants -->
    <div class="neomorph-card overflow-hidden">
      <div class="px-6 py-4">
        <h2 class="text-lg font-semibold text-stone-100">Paid Registrations</h2>
      </div>
      <table class="w-full text-sm">
        <thead class="bg-stone-800 text-stone-400 uppercase text-xs">
          <tr>
            <th class="px-6 py-3 text-left">Participant</th>
            <th class="px-6 py-3 text-left">Items Paid</th>
            <th class="px-6 py-3 text-right">Amount</th>
            <th class="px-6 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-700">
          {#each participantRows.filter(r => r.paidTotal > 0) as row}
            <tr >
              <td class="px-6 py-4">
                <p class="font-medium text-stone-100">{row.username}</p>
                <p class="text-xs text-stone-400">{row.country}</p>
              </td>
              <td class="px-6 py-4 text-stone-400">
                {#each row.paidProducts as p}
                  <p>{p.product_name} × {p.quantity_ordered}</p>
                {/each}
              </td>
              <td class="px-6 py-4 text-right font-semibold text-green-600">
                {fmt(row.paidTotal)} {row.currency}
              </td>
              <td class="px-6 py-4 text-right">
                <button
                  on:click={() => refundParticipant(row.participant_id, row.username)}
                  class="text-xs px-3 py-1 rounded bg-amber-100 text-amber-900 hover:bg-amber-200 font-medium"
                >
                  Refund
                </button>
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="4" class="px-6 py-8 text-center text-stone-400">No paid registrations yet</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pending participants -->
    <div class="neomorph-card overflow-hidden">
      <div class="px-6 py-4 border-b">
        <h2 class="text-lg font-semibold text-stone-100">Pending Payments</h2>
      </div>
      <table class="w-full text-sm">
        <thead class="bg-stone-800 text-stone-400 uppercase text-xs">
          <tr>
            <th class="px-6 py-3 text-left">Participant</th>
            <th class="px-6 py-3 text-left">Items Pending</th>
            <th class="px-6 py-3 text-right">Amount Due</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-700">
          {#each participantRows.filter(r => r.pendingTotal > 0) as row}
            <tr class="hover:bg-stone-800">
              <td class="px-6 py-4">
                <p class="font-medium text-stone-100">{row.username}</p>
                <p class="text-xs text-stone-400">{row.country}</p>
              </td>
              <td class="px-6 py-4 text-stone-400">
                {#each row.pendingProducts as p}
                  <p>{p.product_name} × {p.quantity_ordered}</p>
                {/each}
              </td>
              <td class="px-6 py-4 text-right font-semibold text-yellow-600">
                {fmt(row.pendingTotal)} {row.currency}
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="3" class="px-6 py-8 text-center text-stone-400">No pending payments</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

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