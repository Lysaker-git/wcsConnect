<script lang="ts">
  const competitions = [
    {
      id: 'lysaker-open-2026',
      name: 'Lysaker Open 2026',
      event: 'Norwegian Open WCS',
      date: '2026-09-13',
      location: 'Oslo, Norway',
      status: 'registration_open',
      divisions: ['Newcomer J&J', 'Novice J&J', 'Intermediate J&J', 'Advanced J&J', 'All-Star J&J'],
      registrations: 48,
    },
  ];

  const statusMeta = {
    upcoming:          { label: 'Upcoming',          color: 'bg-stone-700 text-stone-300' },
    registration_open: { label: 'Registration Open', color: 'bg-green-900/60 text-green-300' },
    live:              { label: 'Live',               color: 'bg-amber-600 text-white' },
    completed:         { label: 'Completed',          color: 'bg-stone-700 text-stone-400' },
  };
</script>

<div class="min-h-screen bg-stone-900 py-14 px-6">
  <div class="max-w-4xl mx-auto">

    <div class="mb-10">
      <h1 class="text-4xl font-extrabold text-stone-100">Competitions</h1>
      <p class="text-stone-400 mt-2">Mock Jack &amp; Jill competitions — register, draw heats, and score live.</p>
    </div>

    <div class="space-y-4">
      {#each competitions as comp}
        {@const meta = statusMeta[comp.status] ?? statusMeta.upcoming}
        <a
          href="/competition/{comp.id}"
          class="block bg-stone-800 rounded-2xl border border-stone-700 hover:border-stone-500 transition p-6 group"
        >
          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full {meta.color}">{meta.label}</span>
                <span class="text-xs text-stone-500">{comp.event}</span>
              </div>
              <h2 class="text-xl font-bold text-stone-100 group-hover:text-amber-400 transition">{comp.name}</h2>
              <p class="text-sm text-stone-400 mt-1">
                {new Date(comp.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                · {comp.location}
              </p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-2xl font-bold text-stone-100">{comp.registrations}</p>
              <p class="text-xs text-stone-500 mt-0.5">registered</p>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            {#each comp.divisions as div}
              <span class="text-xs px-2 py-1 bg-stone-900 border border-stone-700 rounded-lg text-stone-400">{div}</span>
            {/each}
          </div>
        </a>
      {/each}

      {#if competitions.length === 0}
        <div class="text-center py-16 text-stone-500">No competitions yet.</div>
      {/if}
    </div>

  </div>
</div>
