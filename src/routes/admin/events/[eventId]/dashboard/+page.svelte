<script lang="ts">
  export let data: any;

  const {
    event, participantRows, stats,
    roleStats, wsdcLevels, topCountries,
    registrationTimeline, revenueTimeline,
    paymentConversion, overduePending,
    accommodation, eventProducts, recentActivity
  } = data;

  const fmt = (n: number) => n.toFixed(2);

  // ── Product summary (existing logic kept) ────────────────────────────────────
  $: productSummary = (() => {
    const map = new Map();
    (participantRows ?? []).forEach((r: any) => {
      [...(r.paidProducts ?? []), ...(r.pendingProducts ?? [])].forEach((p: any) => {
        const name     = p.product_name ?? p.name ?? 'Unknown';
        const currency = p.currency_type ?? '';
        const qty      = parseInt(p.quantity_ordered ?? '1') || 0;
        const key      = `${name}|||${currency}`;
        const existing = map.get(key) ?? { name, currency, count: 0, revenue: 0 };
        existing.count   += qty;
        existing.revenue += parseFloat(p.subtotal ?? '0') || 0;
        map.set(key, existing);
      });
    });
    return Array.from(map.values()).sort((a: any, b: any) => b.count - a.count);
  })();

  // ── SVG sparkline for registration timeline ───────────────────────────────────
  function sparklinePoints(data: { total: number }[], w = 400, h = 64): string {
    if (data.length < 2) return '';
    const max = data[data.length - 1].total;
    if (max === 0) return '';
    return data.map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (d.total / max) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  // ── Max helpers for bar charts ────────────────────────────────────────────────
  const maxWsdc    = Math.max(1, ...wsdcLevels.map((l: any) => l.total));
  const maxCountry = Math.max(1, ...topCountries.map((c: any) => c.count));
  const maxRevDay  = Math.max(1, ...revenueTimeline.map((d: any) => d.amount));

  // ── Overdue urgency ───────────────────────────────────────────────────────────
  function urgencyClass(days: number): string {
    if (days >= 21) return 'text-red-400';
    if (days >= 14) return 'text-amber-400';
    return 'text-stone-400';
  }

  // ── CSV export ────────────────────────────────────────────────────────────────
  function downloadCSV() {
    const headers = ['Name', 'Country', 'Role', 'WSDC Level', 'Status', 'Paid', 'Pending', 'Currency'];
    const rows = (participantRows ?? []).map((r: any) => [
      r.username, r.country, r.role, r.wsdcLevel, r.status,
      r.paidTotal.toFixed(2), r.pendingTotal.toFixed(2), r.currency
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${event?.title ?? 'participants'}.csv`;
    a.click();
  }

  // ── Refund handler (existing) ─────────────────────────────────────────────────
  async function refundParticipant(participant_id: string, username: string) {
    if (!confirm(`Refund all paid items for ${username}? This cannot be undone.`)) return;
    const res = await fetch('/api/stripe/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_id })
    });
    const result = await res.json();
    if (!res.ok) alert(result.error ?? 'Refund failed');
    else { alert(`Refund issued for ${username}`); location.reload(); }
  }

  // ── Format date label ─────────────────────────────────────────────────────────
  function fmtDay(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  }
  function fmtDatetime(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // Approved L/F
  const approvedTotal       = (roleStats.approved.leaders + roleStats.approved.followers) || 1;
  const approvedLeaderPct   = Math.round((roleStats.approved.leaders / approvedTotal) * 100);
  const approvedFollowerPct = Math.round((roleStats.approved.followers / approvedTotal) * 100);
  // Pending queue L/F
  const pendingTotal       = (roleStats.pending.leaders + roleStats.pending.followers) || 1;
  const pendingLeaderPct   = Math.round((roleStats.pending.leaders / pendingTotal) * 100);
  const pendingFollowerPct = Math.round((roleStats.pending.followers / pendingTotal) * 100);

  // Payment conversion %
  const convPct = paymentConversion.approved > 0
    ? Math.round((paymentConversion.paid / paymentConversion.approved) * 100)
    : 0;
</script>

<div class="min-h-screen bg-stone-900 py-10 px-4">
  <div class="max-w-7xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <a href="/admin/events/{event?.id}" class="text-sm text-amber-400 hover:text-amber-300 transition">← Back to event</a>
        <h1 class="text-3xl font-bold text-stone-100 mt-1">{event?.title}</h1>
        <p class="text-stone-400 text-sm mt-0.5">{event?.start_date} → {event?.end_date} &nbsp;·&nbsp; {stats.totalParticipants} participants</p>
      </div>
      <button
        on:click={downloadCSV}
        class="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 text-sm font-medium rounded-xl transition flex items-center gap-2"
      >
        ↓ Export CSV
      </button>
    </div>

    <!-- ── Row 1: KPI Cards ────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="p-5 neomorph-card">
        <p class="text-xs text-stone-400 uppercase tracking-wide mb-1">Total Revenue</p>
        <p class="text-2xl font-bold text-stone-100">{fmt(stats.totalRevenue)} <span class="text-sm font-normal text-stone-400">{stats.currency}</span></p>
        <p class="text-xs text-stone-500 mt-1">{stats.paidCount} paid registrations</p>
      </div>
      <div class="p-5 neomorph-card">
        <p class="text-xs text-stone-400 uppercase tracking-wide mb-1">Outstanding</p>
        <p class="text-2xl font-bold text-amber-400">{fmt(stats.totalPending)} <span class="text-sm font-normal text-stone-400">{stats.currency}</span></p>
        <p class="text-xs text-stone-500 mt-1">{stats.pendingCount} unpaid</p>
      </div>
      <div class="p-5 neomorph-card">
        <p class="text-xs text-stone-400 uppercase tracking-wide mb-1">Organizer Payout</p>
        <p class="text-2xl font-bold text-green-400">{fmt(stats.organizerRevenue)} <span class="text-sm font-normal text-stone-400">{stats.currency}</span></p>
        <p class="text-xs text-stone-500 mt-1">After platform fee</p>
      </div>
      <div class="p-5 neomorph-card">
        <p class="text-xs text-stone-400 uppercase tracking-wide mb-1">Platform Fees</p>
        <p class="text-2xl font-bold text-stone-100">{fmt(stats.platformFees)} <span class="text-sm font-normal text-stone-400">{stats.currency}</span></p>
        <p class="text-xs text-stone-500 mt-1">1% of revenue</p>
      </div>
    </div>

    <!-- ── Row 2: Leader/Follower + WSDC Levels ───────────────────────────── -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

      <!-- Leader / Follower ratio -->
      <div class="neomorph-card p-6">
        <h2 class="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-3">Leader / Follower Balance</h2>

        <!-- Approved participants -->
        <p class="text-xs text-stone-500 uppercase tracking-widest mb-2">Approved</p>
        <div class="flex items-center gap-5 mb-3">
          <div class="text-center w-12 shrink-0">
            <p class="text-3xl font-extrabold text-blue-400">{roleStats.approved.leaders}</p>
            <p class="text-xs text-stone-500 mt-0.5">Lead</p>
          </div>
          <div class="flex-1 flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <div class="flex-1 bg-stone-700 rounded-full h-3">
                <div class="bg-blue-500 h-3 rounded-full transition-all" style="width:{approvedLeaderPct}%"></div>
              </div>
              <span class="text-xs text-stone-300 w-8 text-right">{approvedLeaderPct}%</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex-1 bg-stone-700 rounded-full h-3">
                <div class="bg-pink-500 h-3 rounded-full transition-all" style="width:{approvedFollowerPct}%"></div>
              </div>
              <span class="text-xs text-stone-300 w-8 text-right">{approvedFollowerPct}%</span>
            </div>
          </div>
          <div class="text-center w-12 shrink-0">
            <p class="text-3xl font-extrabold text-pink-400">{roleStats.approved.followers}</p>
            <p class="text-xs text-stone-500 mt-0.5">Follow</p>
          </div>
        </div>
        {#if Math.abs(roleStats.approved.leaders - roleStats.approved.followers) > 0}
          {@const diff = Math.abs(roleStats.approved.leaders - roleStats.approved.followers)}
          {@const which = roleStats.approved.leaders > roleStats.approved.followers ? 'leaders' : 'followers'}
          <p class="text-xs text-amber-400 bg-amber-900/20 border border-amber-800/40 rounded-lg px-3 py-2 mb-4">
            ⚠ {diff} more {which} than {which === 'leaders' ? 'followers' : 'leaders'}
          </p>
        {:else}
          <p class="text-xs text-green-400 bg-green-900/20 border border-green-800/40 rounded-lg px-3 py-2 mb-4">
            ✓ Perfectly balanced
          </p>
        {/if}

        <!-- Pending queue -->
        <div class="border-t border-stone-700/50 pt-3">
          <p class="text-xs text-stone-500 uppercase tracking-widest mb-2">Pending Queue</p>
          <div class="flex items-center gap-5">
            <div class="text-center w-12 shrink-0">
              <p class="text-2xl font-bold text-blue-400/60">{roleStats.pending.leaders}</p>
              <p class="text-xs text-stone-600 mt-0.5">Lead</p>
            </div>
            <div class="flex-1 flex flex-col gap-1.5">
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-stone-800 rounded-full h-2">
                  <div class="bg-blue-500/50 h-2 rounded-full transition-all" style="width:{pendingLeaderPct}%"></div>
                </div>
                <span class="text-xs text-stone-600 w-8 text-right">{pendingLeaderPct}%</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-stone-800 rounded-full h-2">
                  <div class="bg-pink-500/50 h-2 rounded-full transition-all" style="width:{pendingFollowerPct}%"></div>
                </div>
                <span class="text-xs text-stone-600 w-8 text-right">{pendingFollowerPct}%</span>
              </div>
            </div>
            <div class="text-center w-12 shrink-0">
              <p class="text-2xl font-bold text-pink-400/60">{roleStats.pending.followers}</p>
              <p class="text-xs text-stone-600 mt-0.5">Follow</p>
            </div>
          </div>
        </div>
      </div>

      <!-- WSDC Level distribution -->
      <div class="neomorph-card p-6">
        <h2 class="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-2">WSDC Level Distribution</h2>
        <div class="flex gap-4 mb-4">
          <span class="text-xs text-stone-500 flex items-center gap-1.5">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-blue-500"></span>Leaders
          </span>
          <span class="text-xs text-stone-500 flex items-center gap-1.5">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-pink-500"></span>Followers
          </span>
        </div>
        {#if wsdcLevels.length === 0}
          <p class="text-stone-500 text-sm">No WSDC level data yet</p>
        {:else}
          <div class="space-y-2.5">
            {#each wsdcLevels as lvl}
              {@const barW = Math.round((lvl.total / maxWsdc) * 100)}
              {@const leaderShare = lvl.total > 0 ? Math.round((lvl.leaderCount / lvl.total) * 100) : 0}
              <div class="flex items-center gap-3">
                <span class="text-xs text-stone-300 w-24 shrink-0">{lvl.level}</span>
                <div class="flex-1 bg-stone-700 rounded-full h-2.5 overflow-hidden">
                  <div class="h-2.5 flex" style="width:{barW}%">
                    <div class="bg-blue-500 h-full" style="width:{leaderShare}%"></div>
                    <div class="bg-pink-500 h-full flex-1"></div>
                  </div>
                </div>
                <span class="text-xs text-stone-500 w-16 text-right shrink-0">
                  {lvl.leaderCount}L {lvl.followerCount}F
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- ── Row 3: Registration timeline + Country breakdown ───────────────── -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

      <!-- Registration timeline sparkline -->
      <div class="neomorph-card p-6">
        <div class="flex justify-between items-start mb-3">
          <h2 class="text-sm font-semibold text-stone-400 uppercase tracking-wide">Registrations Over Time</h2>
          <span class="text-2xl font-bold text-stone-100">{stats.totalParticipants}</span>
        </div>
        {#if registrationTimeline.length >= 2}
          {@const pts = sparklinePoints(registrationTimeline)}
          {@const last = registrationTimeline[registrationTimeline.length - 1]}
          {@const first = registrationTimeline[0]}
          <svg viewBox="0 0 400 64" class="w-full h-16" preserveAspectRatio="none">
            <!-- Area fill -->
            <polyline
              points="0,64 {pts} 400,64"
              fill="#d97706"
              fill-opacity="0.12"
              stroke="none"
            />
            <!-- Line -->
            <polyline points={pts} fill="none" stroke="#d97706" stroke-width="2" stroke-linejoin="round" />
            <!-- End dot -->
            <circle
              cx={(registrationTimeline.length === 1 ? 0 : 400)}
              cy={64 - (last.total / last.total) * 60}
              r="3"
              fill="#d97706"
            />
          </svg>
          <div class="flex justify-between text-xs text-stone-500 mt-1">
            <span>{fmtDay(first.day)}</span>
            <span>{fmtDay(last.day)}</span>
          </div>
        {:else if registrationTimeline.length === 1}
          <p class="text-stone-500 text-sm">First registration on {fmtDay(registrationTimeline[0].day)}</p>
        {:else}
          <p class="text-stone-500 text-sm">No registrations yet</p>
        {/if}
      </div>

      <!-- Country distribution -->
      <div class="neomorph-card p-6">
        <h2 class="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-4">Top Countries</h2>
        {#if topCountries.length === 0}
          <p class="text-stone-500 text-sm">No country data yet</p>
        {:else}
          <div class="space-y-2">
            {#each topCountries as c}
              <div class="flex items-center gap-3">
                <span class="text-xs text-stone-300 w-28 shrink-0 truncate">{c.country}</span>
                <div class="flex-1 bg-stone-700 rounded-full h-2.5">
                  <div
                    class="bg-sky-500 h-2.5 rounded-full transition-all"
                    style="width:{Math.round((c.count / maxCountry) * 100)}%"
                  ></div>
                </div>
                <span class="text-xs text-stone-400 w-6 text-right">{c.count}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- ── Row 4: Revenue timeline ────────────────────────────────────────── -->
    <div class="neomorph-card p-6">
      <div class="flex justify-between items-start mb-3">
        <h2 class="text-sm font-semibold text-stone-400 uppercase tracking-wide">Revenue Over Time</h2>
        <span class="text-sm text-stone-400">{stats.currency}</span>
      </div>
      {#if revenueTimeline.length === 0}
        <p class="text-stone-500 text-sm">No revenue data yet</p>
      {:else}
        <div class="flex items-end gap-1 h-20">
          {#each revenueTimeline as d}
            {@const pct = Math.max(4, Math.round((d.amount / maxRevDay) * 100))}
            <div class="flex-1 flex flex-col items-center justify-end gap-1 group relative">
              <div
                class="w-full bg-amber-600 rounded-t hover:bg-amber-500 transition-colors cursor-default"
                style="height:{pct}%"
                title="{fmtDay(d.day)}: {d.amount.toFixed(0)} {stats.currency}"
              ></div>
            </div>
          {/each}
        </div>
        {#if revenueTimeline.length > 1}
          <div class="flex justify-between text-xs text-stone-500 mt-1">
            <span>{fmtDay(revenueTimeline[0].day)}</span>
            <span>{fmtDay(revenueTimeline[revenueTimeline.length - 1].day)}</span>
          </div>
        {/if}
      {/if}
    </div>

    <!-- ── Row 5: Product sales + Payment conversion ──────────────────────── -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

      <!-- Product sales progress -->
      <div class="neomorph-card p-6">
        <h2 class="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-4">Product Sales</h2>
        {#if eventProducts.length === 0}
          <p class="text-stone-500 text-sm">No products configured</p>
        {:else}
          <div class="space-y-3">
            {#each eventProducts as p}
              {@const sold = p.quantity_sold ?? 0}
              {@const total = p.quantity_total ?? 0}
              {@const pct = total > 0 ? Math.round((sold / total) * 100) : null}
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-stone-300 truncate">{p.name}</span>
                  <span class="text-stone-400 shrink-0 ml-2">
                    {sold}{total > 0 ? ` / ${total}` : ''}
                    {#if pct !== null}<span class="text-stone-500 ml-1">({pct}%)</span>{/if}
                  </span>
                </div>
                {#if total > 0}
                  <div class="bg-stone-700 rounded-full h-2">
                    <div
                      class="h-2 rounded-full transition-all {pct && pct >= 90 ? 'bg-red-500' : pct && pct >= 70 ? 'bg-amber-500' : 'bg-green-500'}"
                      style="width:{pct}%"
                    ></div>
                  </div>
                {:else}
                  <div class="bg-stone-700 rounded-full h-2">
                    <div class="bg-stone-500 h-2 rounded-full" style="width:100%"></div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Payment conversion -->
      <div class="neomorph-card p-6">
        <h2 class="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-4">Payment Conversion</h2>
        <div class="flex items-end gap-4 mb-4">
          <div>
            <p class="text-4xl font-extrabold text-stone-100">{convPct}%</p>
            <p class="text-xs text-stone-400 mt-1">of approved have paid</p>
          </div>
          <div class="text-right text-xs text-stone-400">
            <p><span class="text-green-400 font-semibold">{paymentConversion.paid}</span> paid</p>
            <p><span class="text-stone-300 font-semibold">{paymentConversion.approved}</span> approved</p>
          </div>
        </div>
        <div class="bg-stone-700 rounded-full h-3">
          <div
            class="h-3 rounded-full transition-all {convPct >= 80 ? 'bg-green-500' : convPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}"
            style="width:{convPct}%"
          ></div>
        </div>

        {#if overduePending.length > 0}
          <p class="text-xs text-amber-400 mt-4 mb-2 font-medium">Approved but unpaid — sorted by age</p>
          <div class="space-y-1 max-h-44 overflow-y-auto pr-1">
            {#each overduePending as r}
              <div class="flex justify-between text-xs bg-stone-800 rounded-lg px-3 py-2">
                <span class="text-stone-300 truncate">{r.username}</span>
                <span class={urgencyClass(r.daysSince)}>{r.daysSince}d ago · {fmt(r.pendingTotal)} {r.currency}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- ── Row 6: Accommodation ───────────────────────────────────────────── -->
    {#if accommodation.bookings.length > 0}
    <div class="neomorph-card p-6">
      <h2 class="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-4">Accommodation</h2>
      <div class="grid grid-cols-3 gap-4 mb-5">
        <div class="text-center p-3 bg-stone-800 rounded-xl">
          <p class="text-2xl font-bold text-stone-100">{accommodation.bookings.length}</p>
          <p class="text-xs text-stone-400 mt-1">Total bookings</p>
        </div>
        <div class="text-center p-3 bg-stone-800 rounded-xl">
          <p class="text-2xl font-bold text-green-400">{accommodation.fullyPaidRooms.length}</p>
          <p class="text-xs text-stone-400 mt-1">Fully paid</p>
        </div>
        <div class="text-center p-3 bg-stone-800 rounded-xl">
          <p class="text-2xl font-bold text-amber-400">{accommodation.depositOnly.length}</p>
          <p class="text-xs text-stone-400 mt-1">Deposit only</p>
        </div>
      </div>

      {#if accommodation.depositOnly.length > 0}
        <p class="text-xs text-stone-400 font-medium mb-2">Remaining balance due</p>
        <div class="space-y-1">
          {#each accommodation.depositOnly as b}
            <div class="flex justify-between text-xs bg-stone-800 rounded-lg px-3 py-2">
              <span class="text-stone-300">{b.room_name}</span>
              <div class="flex items-center gap-3">
                {#if b.final_payment_deadline}
                  <span class="text-stone-500">Due {new Date(b.final_payment_deadline).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</span>
                {/if}
                <span class="text-amber-400 font-medium">{parseFloat(b.remaining_amount ?? '0').toFixed(2)} {b.currency}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
    {/if}

    <!-- ── Row 7: Participant tables (accordions) ─────────────────────────── -->
    <details class="neomorph-card overflow-hidden group">
      <summary class="px-6 py-4 border-b border-stone-700/50 flex justify-between items-center cursor-pointer list-none select-none hover:bg-stone-800/30 transition-colors">
        <h2 class="text-base font-semibold text-stone-100">Paid Registrations</h2>
        <div class="flex items-center gap-3">
          <span class="text-xs text-stone-400">{participantRows.filter((r: any) => r.paidTotal > 0).length} participants</span>
          <span class="text-stone-500 text-sm transition-transform duration-200 group-open:rotate-180">▾</span>
        </div>
      </summary>
      <table class="w-full text-sm">
        <thead class="bg-stone-800/60 text-stone-400 uppercase text-xs">
          <tr>
            <th class="px-6 py-3 text-left">Participant</th>
            <th class="px-6 py-3 text-left hidden md:table-cell">Items</th>
            <th class="px-6 py-3 text-right">Amount</th>
            <th class="px-6 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-800">
          {#each participantRows.filter((r: any) => r.paidTotal > 0) as row}
            <tr class="hover:bg-stone-800/40 transition-colors">
              <td class="px-6 py-3">
                <p class="font-medium text-stone-100">{row.username}</p>
                <p class="text-xs text-stone-500">{row.country}{row.wsdcLevel ? ' · ' + row.wsdcLevel : ''}</p>
              </td>
              <td class="px-6 py-3 text-stone-400 text-xs hidden md:table-cell">
                {#each row.paidProducts as p}
                  <p>{p.product_name} × {p.quantity_ordered}</p>
                {/each}
              </td>
              <td class="px-6 py-3 text-right font-semibold text-green-400">
                {fmt(row.paidTotal)} {row.currency}
              </td>
              <td class="px-6 py-3 text-right">
                <button
                  on:click={() => refundParticipant(row.participant_id, row.username)}
                  class="text-xs px-3 py-1 rounded-lg bg-stone-700 hover:bg-red-900/40 hover:text-red-300 text-stone-400 transition"
                >
                  Refund
                </button>
              </td>
            </tr>
          {:else}
            <tr><td colspan="4" class="px-6 py-8 text-center text-stone-500">No paid registrations yet</td></tr>
          {/each}
        </tbody>
      </table>
    </details>

    <details class="neomorph-card overflow-hidden group">
      <summary class="px-6 py-4 border-b border-stone-700/50 flex justify-between items-center cursor-pointer list-none select-none hover:bg-stone-800/30 transition-colors">
        <h2 class="text-base font-semibold text-stone-100">Pending Payments</h2>
        <div class="flex items-center gap-3">
          <span class="text-xs text-stone-400">{participantRows.filter((r: any) => r.pendingTotal > 0).length} participants</span>
          <span class="text-stone-500 text-sm transition-transform duration-200 group-open:rotate-180">▾</span>
        </div>
      </summary>
      <table class="w-full text-sm">
        <thead class="bg-stone-800/60 text-stone-400 uppercase text-xs">
          <tr>
            <th class="px-6 py-3 text-left">Participant</th>
            <th class="px-6 py-3 text-left hidden md:table-cell">Items</th>
            <th class="px-6 py-3 text-right">Amount Due</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-800">
          {#each participantRows.filter((r: any) => r.pendingTotal > 0) as row}
            <tr class="hover:bg-stone-800/40 transition-colors">
              <td class="px-6 py-3">
                <p class="font-medium text-stone-100">{row.username}</p>
                <p class="text-xs text-stone-500">{row.country}{row.wsdcLevel ? ' · ' + row.wsdcLevel : ''}</p>
              </td>
              <td class="px-6 py-3 text-stone-400 text-xs hidden md:table-cell">
                {#each row.pendingProducts as p}
                  <p>{p.product_name} × {p.quantity_ordered}</p>
                {/each}
              </td>
              <td class="px-6 py-3 text-right font-semibold text-amber-400">
                {fmt(row.pendingTotal)} {row.currency}
              </td>
            </tr>
          {:else}
            <tr><td colspan="3" class="px-6 py-8 text-center text-stone-500">No pending payments</td></tr>
          {/each}
        </tbody>
      </table>
    </details>

    <!-- ── Row 8: Recent activity feed ────────────────────────────────────── -->
    <div class="neomorph-card p-6">
      <h2 class="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-4">Recent Activity</h2>
      {#if recentActivity.length === 0}
        <p class="text-stone-500 text-sm">No activity yet</p>
      {:else}
        <div class="space-y-2">
          {#each recentActivity as item}
            <div class="flex items-center gap-3 text-sm">
              <span class="text-lg shrink-0">
                {item.type === 'payment' ? '💳' : '📝'}
              </span>
              <div class="flex-1 min-w-0">
                <span class="font-medium text-stone-200">{item.username}</span>
                <span class="text-stone-400"> — {item.detail}</span>
              </div>
              <span class="text-xs text-stone-500 shrink-0">{fmtDatetime(item.date)}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  </div>
</div>

<style>
  .neomorph-card {
    box-shadow:
      5px 5px 18px rgba(2, 6, 23, 0.5),
      -5px -5px 12px rgba(255, 255, 255, 0.03);
    border-radius: 1.25rem;
    border: 1px solid rgba(255, 255, 255, 0.04);
    background: #1c1917;
  }

</style>
