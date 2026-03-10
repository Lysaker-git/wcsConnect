<script lang="ts">
  import { page } from '$app/stores';

  // Mock — replace with load() once backend exists
  const competition = {
    id: 'lysaker-open-2026',
    name: 'Lysaker Open 2026',
    event: 'Norwegian Open WCS',
    date: '2026-09-13',
    location: 'Oslo, Norway',
    venue: 'Radisson Blu Scandinavia Hotel',
    status: 'registration_open',
    description: 'A mock Jack & Jill competition for the Norwegian Open WCS weekend. Open to all levels.',
    divisions: [
      { id: 'newcomer',     label: 'Newcomer J&J',     leaders: 6,  followers: 7,  maxPerRole: 20, heatsDrawn: false },
      { id: 'novice',       label: 'Novice J&J',       leaders: 12, followers: 11, maxPerRole: 30, heatsDrawn: false },
      { id: 'intermediate', label: 'Intermediate J&J', leaders: 9,  followers: 8,  maxPerRole: 30, heatsDrawn: false },
      { id: 'advanced',     label: 'Advanced J&J',     leaders: 5,  followers: 5,  maxPerRole: 20, heatsDrawn: false },
      { id: 'allstar',      label: 'All-Star J&J',     leaders: 4,  followers: 3,  maxPerRole: 16, heatsDrawn: false },
    ],
  };

  $: tab = $page.url.searchParams.get('tab') ?? 'overview';

  const tabs = [
    { key: 'overview',      label: 'Overview' },
    { key: 'participants',  label: 'Participants' },
    { key: 'heats',         label: 'Heats' },
    { key: 'results',       label: 'Results' },
  ];

  const statusMeta = {
    upcoming:          { label: 'Upcoming',          color: 'bg-stone-700 text-stone-300' },
    registration_open: { label: 'Registration Open', color: 'bg-green-900/60 text-green-300' },
    live:              { label: 'Live',               color: 'bg-amber-600 text-white' },
    completed:         { label: 'Completed',          color: 'bg-stone-700 text-stone-400' },
  };

  $: meta = statusMeta[competition.status] ?? statusMeta.upcoming;
</script>

<div class="min-h-screen bg-stone-900 py-10 px-6">
  <div class="max-w-4xl mx-auto space-y-6">

    <!-- Back -->
    <a href="/competition" class="text-sm text-stone-500 hover:text-stone-300 transition">← All competitions</a>

    <!-- Header card -->
    <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full {meta.color}">{meta.label}</span>
            <span class="text-xs text-stone-500">{competition.event}</span>
          </div>
          <h1 class="text-3xl font-extrabold text-stone-100">{competition.name}</h1>
          <p class="text-stone-400 mt-1 text-sm">
            {new Date(competition.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            · {competition.venue}, {competition.location}
          </p>
          {#if competition.description}
            <p class="text-stone-400 text-sm mt-3 max-w-xl">{competition.description}</p>
          {/if}
        </div>

        {#if competition.status === 'registration_open'}
          <a
            href="/competition/{competition.id}/register"
            class="shrink-0 px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition text-sm"
          >
            Register →
          </a>
        {/if}
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 bg-stone-800 rounded-xl p-1 border border-stone-700 w-fit">
      {#each tabs as t}
        <a
          href="?tab={t.key}"
          class="px-4 py-2 rounded-lg text-sm font-medium transition {tab === t.key
            ? 'bg-stone-700 text-stone-100'
            : 'text-stone-400 hover:text-stone-200'}"
        >
          {t.label}
        </a>
      {/each}
    </div>

    <!-- Tab content -->
    {#if tab === 'overview'}
      <div class="space-y-3">
        <h2 class="text-sm font-semibold text-stone-500 uppercase tracking-widest">Divisions</h2>
        {#each competition.divisions as div}
          <div class="bg-stone-800 rounded-xl border border-stone-700 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p class="font-semibold text-stone-100">{div.label}</p>
              <p class="text-xs text-stone-500 mt-0.5">Max {div.maxPerRole} per role</p>
            </div>
            <div class="flex items-center gap-6 text-sm">
              <div class="text-center">
                <p class="font-bold text-stone-100">{div.leaders}</p>
                <p class="text-xs text-stone-500">Leaders</p>
              </div>
              <div class="text-center">
                <p class="font-bold text-stone-100">{div.followers}</p>
                <p class="text-xs text-stone-500">Followers</p>
              </div>
              <div class="text-center">
                <p class="font-bold text-stone-100">{div.leaders + div.followers}</p>
                <p class="text-xs text-stone-500">Total</p>
              </div>
              {#if div.heatsDrawn}
                <span class="text-xs px-2 py-0.5 rounded-full bg-green-900/60 text-green-300">Heats drawn</span>
              {:else}
                <span class="text-xs px-2 py-0.5 rounded-full bg-stone-700 text-stone-400">Pending draw</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>

    {:else if tab === 'participants'}
      <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6 text-center text-stone-500 text-sm">
        Participant list will appear here once backend is connected.
      </div>

    {:else if tab === 'heats'}
      <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6 text-center text-stone-500 text-sm">
        Heats will be drawn and displayed here once backend is connected.
      </div>

    {:else if tab === 'results'}
      <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6 text-center text-stone-500 text-sm">
        Results will appear here after judging is complete.
      </div>
    {/if}

  </div>
</div>
