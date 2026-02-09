<script lang="ts">
  export let data;
  console.log('📅 [Events Page] Loaded events data:', data);

  let query = '';
  const events = data?.events ?? [];

  $: filteredEvents = query
    ? events.filter((e: any) => (e.title ?? '').toLowerCase().includes(query.toLowerCase()))
    : events;
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-8">
  <div class="max-w-6xl mx-auto px-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-extrabold text-blue-700">Events Overview</h1>
      <div class="w-full max-w-md ml-4">
        <label for="search" class="sr-only">Search events</label>
        <div class="relative">
          <input id="search" type="search" bind:value={query} placeholder="Search events by title..." class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
          <svg class="absolute left-3 top-2.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
        </div>
      </div>
    </div>

    {#if filteredEvents && filteredEvents.length > 0}
      <ul class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {#each filteredEvents as event}
          <li>
            <a href={`/events/${event.id}`} class="block p-4 rounded-lg border border-gray-100 bg-white shadow-sm hover:shadow-md transition-transform transform hover:-translate-y-0.5">
              <h2 class="text-lg font-semibold text-gray-800 truncate">{event.title}</h2>
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Starts: {new Date(event.start_date).toLocaleDateString()}</span>
                <span class="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Ends: {new Date(event.end_date).toLocaleDateString()}</span>
              </div>
            </a>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-center text-gray-500 mt-12">No events match your search.</p>
    {/if}
  </div>
</div>
