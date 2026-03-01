<script lang="ts">
  import { enhance } from '$app/forms';

  export let data: {
    event: any;
    couplesQueue: any[];
    singleLeaders: any[];
    singleFollowers: any[];
    approved: any[];
    totalPending: number;
  };

  let { event, couplesQueue, singleLeaders, singleFollowers, approved } = data;

  // ── Couple approval state ─────────────────────────────────────────────────
  let approvingId: string | null = null;

  // Manual partner reassignment
  let reassigning: string | null = null; // primary_id being reassigned
  let reassignSearch = '';
  $: reassignCandidates = reassigning
    ? couplesQueue
        .filter(c => c.primary.id !== reassigning)
        .map(c => c.primary)
        .concat(singleLeaders)
        .concat(singleFollowers)
        .filter(p =>
          (p.profiles?.username ?? '').toLowerCase().includes(reassignSearch.toLowerCase())
        )
    : [];

  // ── Singles drag and drop ─────────────────────────────────────────────────
  let draggedId: string | null = null;
  let draggedRole: 'leader' | 'follower' | null = null;
  let pairedLeaderId: string | null = null;
  let pairedFollowerId: string | null = null;
  let pairError = '';

  function onDragStart(id: string, role: 'leader' | 'follower') {
    draggedId = id;
    draggedRole = role;
  }

  function onDrop(targetId: string, targetRole: 'leader' | 'follower') {
    if (!draggedId || draggedRole === targetRole) {
      pairError = 'You must pair a leader with a follower';
      return;
    }
    pairError = '';
    if (draggedRole === 'leader') {
      pairedLeaderId = draggedId;
      pairedFollowerId = targetId;
    } else {
      pairedLeaderId = targetId;
      pairedFollowerId = draggedId;
    }
    draggedId = null;
    draggedRole = null;
  }

  function clearPair() {
    pairedLeaderId = null;
    pairedFollowerId = null;
    pairError = '';
  }

  // ── Approved section ──────────────────────────────────────────────────────
  let showApproved = false;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const roleColor = (role: string) =>
    role === 'leader'
      ? 'bg-blue-900/40 text-blue-300 border border-blue-700'
      : 'bg-pink-900/40 text-pink-300 border border-pink-700';

  const confidenceConfig: Record<string, { label: string; color: string }> = {
    exact: { label: 'Exact match', color: 'text-green-400' },
    fuzzy: { label: 'Fuzzy match', color: 'text-amber-400' },
    weak:  { label: 'Weak match', color: 'text-red-400' },
    manual:  { label: 'Manual match',  color: 'text-blue-400'  }
  };

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
</script>

<div class="min-h-screen bg-stone-900 py-10 px-6">
  <div class="max-w-6xl mx-auto space-y-8">

    <!-- Header -->
    <div>
      <a href="/admin/events/{event?.id}/participants" class="text-sm text-amber-500 hover:underline">← Participants</a>
      <h1 class="text-3xl font-bold text-stone-100 mt-2">Approval Queue</h1>
      <p class="text-stone-400 text-sm mt-1">{event?.title} · {data.totalPending} pending</p>
    </div>

    <!-- ── COUPLES QUEUE ──────────────────────────────────────────────────── -->
    <section>
      <h2 class="text-lg font-bold text-stone-100 mb-4 flex items-center gap-2">
        💑 Couples
        <span class="px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-xs text-stone-400">
          {couplesQueue.length}
        </span>
      </h2>

      {#if couplesQueue.length === 0}
        <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6 text-center text-stone-500 text-sm">
          No couples pending
        </div>
      {:else}
        <div class="space-y-3">
          {#each couplesQueue as item (item.primary.id)}
            <div class="bg-stone-800 rounded-2xl border border-stone-700 p-5">

              {#if item.type === 'pair'}
                <!-- Matched pair -->
                <div class="flex items-start justify-between gap-4 flex-wrap">
                  <div class="flex items-center gap-6 flex-wrap flex-1">

                    <!-- Primary -->
                    <div class="min-w-[200px]">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-semibold text-stone-100">{item.primary.profiles?.username ?? '—'}</span>
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium {roleColor(item.primary.role)}">{item.primary.role}</span>
                      </div>
                      <div class="text-xs text-stone-400 space-y-0.5">
                        {#if item.primary.wsdcLevel}<div>Level: {item.primary.wsdcLevel}</div>{/if}
                        {#if item.primary.wsdcID}<div>WSDC: {item.primary.wsdcID}</div>{/if}
                        {#if item.primary.country}<div>📍 {item.primary.country}</div>{/if}
                        {#if item.primary.ticketName}<div class="text-amber-400">🎟 {item.primary.ticketName}</div>{/if}
                        <div class="text-stone-600">{formatDate(item.primary.created_at)}</div>
                        <div class="text-stone-500 italic">Listed: "{item.primary.partner_name}"</div>
                      </div>
                    </div>

                    <!-- Match indicator -->
                    <div class="flex flex-col items-center gap-1">
                      <div class="text-2xl">🔗</div>
                      <span class="text-xs {confidenceConfig[item.confidence]?.color}">
                        {confidenceConfig[item.confidence]?.label}
                      </span>
                      {#if item.confidence !== 'exact'}
                        <span class="text-xs text-stone-600">dist: {item.totalDist}</span>
                      {/if}
                    </div>

                    <!-- Match -->
                    <div class="min-w-[200px]">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-semibold text-stone-100">{item.match.profiles?.username ?? '—'}</span>
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium {roleColor(item.match.role)}">{item.match.role}</span>
                      </div>
                      <div class="text-xs text-stone-400 space-y-0.5">
                        {#if item.match.wsdcLevel}<div>Level: {item.match.wsdcLevel}</div>{/if}
                        {#if item.match.wsdcID}<div>WSDC: {item.match.wsdcID}</div>{/if}
                        {#if item.match.country}<div>📍 {item.match.country}</div>{/if}
                        {#if item.match.ticketName}<div class="text-amber-400">🎟 {item.match.ticketName}</div>{/if}
                        <div class="text-stone-600">{formatDate(item.match.created_at)}</div>
                        <div class="text-stone-500 italic">Listed: "{item.match.partner_name}"</div>
                      </div>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex flex-col gap-2 min-w-[140px]">
                    <form method="POST" action="?/approveCouple" use:enhance={() => {
                      approvingId = item.primary.id;
                      return async ({ update, result }) => { await update(); approvingId = null; if (result.type === 'success') location.reload(); };
                    }}>
                      <input type="hidden" name="primary_id" value={item.primary.id} />
                      <input type="hidden" name="match_id" value={item.match.id} />
                      <button type="submit" disabled={approvingId === item.primary.id}
                        class="w-full py-2 px-4 bg-green-700 hover:bg-green-600 text-white text-sm font-bold rounded-xl transition disabled:opacity-50">
                        {approvingId === item.primary.id ? 'Approving…' : '✅ Approve couple'}
                      </button>
                    </form>
                    <button on:click={() => { reassigning = item.primary.id; reassignSearch = ''; }}
                      class="w-full py-2 px-4 bg-stone-700 hover:bg-stone-600 text-stone-300 text-sm rounded-xl transition">
                      🔄 Reassign
                    </button>
                  </div>
                </div>

              {:else}
                <!-- Solo — no match found -->
                <div class="flex items-start justify-between gap-4 flex-wrap">
                  <div class="min-w-[200px]">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-semibold text-stone-100">{item.primary.profiles?.username ?? '—'}</span>
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium {roleColor(item.primary.role)}">{item.primary.role}</span>
                      <span class="px-2 py-0.5 rounded-full text-xs bg-red-900/30 text-red-400 border border-red-800">No match found</span>
                    </div>
                    <div class="text-xs text-stone-400 space-y-0.5">
                      {#if item.primary.wsdcLevel}<div>Level: {item.primary.wsdcLevel}</div>{/if}
                      {#if item.primary.wsdcID}<div>WSDC: {item.primary.wsdcID}</div>{/if}
                      {#if item.primary.country}<div>📍 {item.primary.country}</div>{/if}
                      {#if item.primary.ticketName}<div class="text-amber-400">🎟 {item.primary.ticketName}</div>{/if}
                      <div class="text-stone-600">{formatDate(item.primary.created_at)}</div>
                      {#if item.primary.partner_name}
                        <div class="text-red-400 italic">Listed: "{item.primary.partner_name}" — not found</div>
                      {/if}
                    </div>
                  </div>
                  <div class="flex flex-col gap-2 min-w-[140px]">
                    <button on:click={() => { reassigning = item.primary.id; reassignSearch = ''; }}
                      class="w-full py-2 px-4 bg-amber-700 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition">
                      🔍 Find partner
                    </button>
                    <form method="POST" action="?/approveSingle" use:enhance={() => {
                      approvingId = item.primary.id;
                      return async ({ update, result }) => { await update(); approvingId = null; if (result.type === 'success') location.reload(); };
                    }}>
                      <input type="hidden" name="participant_id" value={item.primary.id} />
                      <button type="submit" disabled={approvingId === item.primary.id}
                        class="w-full py-2 px-4 bg-stone-700 hover:bg-stone-600 text-stone-300 text-sm rounded-xl transition disabled:opacity-50">
                        Approve solo
                      </button>
                    </form>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- ── SINGLES MATCHING ───────────────────────────────────────────────── -->
    <section>
      <h2 class="text-lg font-bold text-stone-100 mb-2 flex items-center gap-2">
        🕺 Singles Matching
        <span class="px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-xs text-stone-400">
          {singleLeaders.length + singleFollowers.length}
        </span>
      </h2>
      <p class="text-stone-500 text-xs mb-4">Drag a card from one column onto a card in the other to pair them, then approve together.</p>

      <!-- Paired preview -->
      {#if pairedLeaderId && pairedFollowerId}
        {@const leader = singleLeaders.find(p => p.id === pairedLeaderId)}
        {@const follower = singleFollowers.find(p => p.id === pairedFollowerId)}
        <div class="mb-4 p-4 bg-green-900/20 border border-green-700/50 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
          <div class="flex items-center gap-4">
            <div>
              <p class="text-xs text-stone-400 mb-0.5">Leader</p>
              <p class="font-semibold text-stone-100">{leader?.profiles?.username ?? '—'}</p>
              {#if leader?.ticketName}<p class="text-xs text-amber-400">{leader.ticketName}</p>{/if}
            </div>
            <span class="text-stone-400 text-xl">+</span>
            <div>
              <p class="text-xs text-stone-400 mb-0.5">Follower</p>
              <p class="font-semibold text-stone-100">{follower?.profiles?.username ?? '—'}</p>
              {#if follower?.ticketName}<p class="text-xs text-amber-400">{follower.ticketName}</p>{/if}
            </div>
          </div>
          <div class="flex gap-2">
            <form method="POST" action="?/approvePair" use:enhance={() => {
              return async ({ update }) => { await update(); clearPair(); };
            }}>
              <input type="hidden" name="leader_id" value={pairedLeaderId} />
              <input type="hidden" name="follower_id" value={pairedFollowerId} />
              <button type="submit" class="py-2 px-5 bg-green-700 hover:bg-green-600 text-white text-sm font-bold rounded-xl transition">
                ✅ Approve pair
              </button>
            </form>
            <button on:click={clearPair} class="py-2 px-4 bg-stone-700 hover:bg-stone-600 text-stone-300 text-sm rounded-xl transition">
              Clear
            </button>
          </div>
        </div>
      {/if}

      {#if pairError}
        <p class="text-sm text-red-400 mb-3">{pairError}</p>
      {/if}

      <div class="grid grid-cols-2 gap-4">
        <!-- Leaders -->
        <div>
          <h3 class="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
            Leaders
            <span class="text-stone-500 font-normal">{singleLeaders.length}</span>
          </h3>
          {#if singleLeaders.length === 0}
            <div class="bg-stone-800/50 rounded-xl border border-stone-700 border-dashed p-6 text-center text-stone-600 text-sm">
              No leaders pending
            </div>
          {:else}
            <div class="space-y-2">
              {#each singleLeaders as p (p.id)}
                <div
                  draggable="true"
                  on:dragstart={() => onDragStart(p.id, 'leader')}
                  on:dragover|preventDefault
                  on:drop={() => onDrop(p.id, 'leader')}
                  class="bg-stone-800 rounded-xl border p-4 cursor-grab active:cursor-grabbing transition
                    {pairedLeaderId === p.id ? 'border-green-600 bg-green-900/20' : 'border-stone-700 hover:border-blue-700/50'}"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-semibold text-stone-100 text-sm">{p.profiles?.username ?? '—'}</span>
                        <span class="px-1.5 py-0.5 rounded text-xs bg-blue-900/40 text-blue-300 border border-blue-800">leader</span>
                      </div>
                      <div class="text-xs text-stone-400 space-y-0.5">
                        {#if p.wsdcLevel}<span class="mr-2">{p.wsdcLevel}</span>{/if}
                        {#if p.wsdcID}<span class="mr-2">#{p.wsdcID}</span>{/if}
                        {#if p.country}<span class="mr-2">📍{p.country}</span>{/if}
                        {#if p.ticketName}<div class="text-amber-400">🎟 {p.ticketName}</div>{/if}
                        <div class="text-stone-600">{formatDate(p.created_at)}</div>
                      </div>
                    </div>
                    <form method="POST" action="?/approveSingle" use:enhance={() => {
                        approvingId = p.id;
                        return async ({ update, result }) => { await update(); approvingId = null; if (result.type === 'success') location.reload();};
                        }}>
                        <input type="hidden" name="participant_id" value={p.id} />
                        <button type="submit" disabled={approvingId === p.id}
                            class="ml-2 px-3 py-1.5 text-xs bg-stone-700 hover:bg-green-700 text-stone-300 hover:text-white rounded-lg transition disabled:opacity-50 whitespace-nowrap">
                            {approvingId === p.id ? '…' : '✅ Approve solo'}
                        </button>
                    </form>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Followers -->
        <div>
          <h3 class="text-sm font-semibold text-pink-400 mb-3 flex items-center gap-2">
            Followers
            <span class="text-stone-500 font-normal">{singleFollowers.length}</span>
          </h3>
          {#if singleFollowers.length === 0}
            <div class="bg-stone-800/50 rounded-xl border border-stone-700 border-dashed p-6 text-center text-stone-600 text-sm">
              No followers pending
            </div>
          {:else}
            <div class="space-y-2">
              {#each singleFollowers as p (p.id)}
                <div
                  draggable="true"
                  on:dragstart={() => onDragStart(p.id, 'follower')}
                  on:dragover|preventDefault
                  on:drop={() => onDrop(p.id, 'follower')}
                  class="bg-stone-800 rounded-xl border p-4 cursor-grab active:cursor-grabbing transition
                    {pairedFollowerId === p.id ? 'border-green-600 bg-green-900/20' : 'border-stone-700 hover:border-pink-700/50'}"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-semibold text-stone-100 text-sm">{p.profiles?.username ?? '—'}</span>
                        <span class="px-1.5 py-0.5 rounded text-xs bg-pink-900/40 text-pink-300 border border-pink-800">follower</span>
                      </div>
                      <div class="text-xs text-stone-400 space-y-0.5">
                        {#if p.wsdcLevel}<span class="mr-2">{p.wsdcLevel}</span>{/if}
                        {#if p.wsdcID}<span class="mr-2">#{p.wsdcID}</span>{/if}
                        {#if p.country}<span class="mr-2">📍{p.country}</span>{/if}
                        {#if p.ticketName}<div class="text-amber-400">🎟 {p.ticketName}</div>{/if}
                        <div class="text-stone-600">{formatDate(p.created_at)}</div>
                      </div>
                    </div>
                    <form method="POST" action="?/approveSingle" use:enhance={() => {
                        approvingId = p.id;
                        return async ({ update, result }) => { await update(); approvingId = null; if (result.type === 'success') location.reload();};
                        }}>
                        <input type="hidden" name="participant_id" value={p.id} />
                        <button type="submit" disabled={approvingId === p.id}
                            class="ml-2 px-3 py-1.5 text-xs bg-stone-700 hover:bg-green-700 text-stone-300 hover:text-white rounded-lg transition disabled:opacity-50 whitespace-nowrap">
                            {approvingId === p.id ? '…' : '✅ Approve solo'}
                        </button>
                    </form>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </section>

    <!-- ── APPROVED ────────────────────────────────────────────────────────── -->
    <section>
      <button on:click={() => showApproved = !showApproved}
        class="flex items-center gap-2 text-sm font-semibold text-stone-400 hover:text-stone-100 transition">
        <span>{showApproved ? '▼' : '▶'}</span>
        ✅ Approved ({approved.length})
      </button>

      {#if showApproved}
        <div class="mt-3 space-y-2">
          {#each approved as p (p.id)}
            <div class="bg-stone-800/50 rounded-xl border border-stone-700 px-4 py-3 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="font-medium text-stone-200 text-sm">{p.profiles?.username ?? '—'}</span>
                <span class="px-1.5 py-0.5 rounded text-xs {roleColor(p.role)}">{p.role}</span>
                {#if p.partner_name}
                  <span class="text-xs text-stone-500">with {p.partner_name}</span>
                {/if}
                {#if p.ticketName}
                  <span class="text-xs text-amber-400">{p.ticketName}</span>
                {/if}
              </div>
              <span class="text-xs text-stone-600">{formatDate(p.created_at)}</span>
            </div>
          {/each}
        </div>
      {/if}
    </section>

  </div>
</div>

<!-- ── REASSIGN MODAL ──────────────────────────────────────────────────────── -->
{#if reassigning}
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-stone-800 rounded-2xl border border-stone-700 w-full max-w-md shadow-2xl">
      <div class="flex items-center justify-between px-6 py-4 border-b border-stone-700">
        <h3 class="text-lg font-bold text-stone-100">Find partner</h3>
        <button on:click={() => reassigning = null} class="text-stone-400 hover:text-stone-100 text-2xl">&times;</button>
      </div>
      <div class="p-6 space-y-4">
        <input
          type="text"
          bind:value={reassignSearch}
          placeholder="Search by username…"
          class="w-full px-4 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 text-sm"
          autofocus
        />
        <div class="space-y-2 max-h-64 overflow-y-auto">
          {#each reassignCandidates as candidate (candidate.id)}
            <form method="POST" action="?/approveCouple" use:enhance={() => {
              return async ({ update }) => { await update(); reassigning = null; };
            }}>
              <input type="hidden" name="primary_id" value={reassigning} />
              <input type="hidden" name="match_id" value={candidate.id} />
                <button
                type="button"
                on:click={() => {
                    // Find the item being reassigned and update it locally
                    const idx = couplesQueue.findIndex(c => c.primary.id === reassigning);
                    if (idx !== -1) {
                    couplesQueue[idx] = {
                        type: 'pair',
                        primary: couplesQueue[idx].primary,
                        match: candidate,
                        confidence: 'manual',
                        totalDist: 0
                    };
                    couplesQueue = [...couplesQueue]; // trigger reactivity
                    }
                    reassigning = null;
                }}
                class="w-full text-left px-4 py-3 bg-stone-900 hover:bg-stone-700 rounded-xl border border-stone-700 transition"
                >
                    <div class="flex items-center justify-between">
                        <div>
                        <span class="font-medium text-stone-100 text-sm">{candidate.profiles?.username ?? '—'}</span>
                        <span class="ml-2 px-1.5 py-0.5 rounded text-xs {roleColor(candidate.role)}">{candidate.role}</span>
                        </div>
                        <span class="text-xs text-amber-400">Pair →</span>
                    </div>
                    <div class="text-xs text-stone-500 mt-0.5">
                        {#if candidate.wsdcLevel}{candidate.wsdcLevel} · {/if}
                        {#if candidate.country}{candidate.country}{/if}
                    </div>
                </button>
            </form>
          {/each}
          {#if reassignCandidates.length === 0 && reassignSearch.length > 0}
            <p class="text-sm text-stone-500 text-center py-4">No matches found</p>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}