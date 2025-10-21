<script lang="ts">
  export let data;
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-10">
  <div class="max-w-2xl mx-auto">
    <h1 class="text-4xl font-extrabold text-blue-700 mb-8 text-center drop-shadow">Events Overview</h1>
    {#if data && data.events && data.events.length > 0}
      <ul class="space-y-6">
        {#each data.events as event}
          <li class="p-6 rounded-2xl border border-blue-200 shadow-lg bg-white hover:shadow-2xl transition-shadow">
            <h2 class="text-2xl font-bold text-blue-800 mb-2">{event.title}</h2>
            <div class="flex gap-6 mb-2">
              <p class="bg-blue-50 px-3 py-1 rounded text-blue-600 text-sm font-medium"><strong>Start:</strong> {new Date(event.start_date).toLocaleDateString()}</p>
              <p class="bg-blue-50 px-3 py-1 rounded text-blue-600 text-sm font-medium"><strong>End:</strong> {new Date(event.end_date).toLocaleDateString()}</p>
            </div>
            <a href={`/events/${event.id}/register`} class="inline-block bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-600 transition-colors mt-2">Register</a>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-center text-gray-500 mt-12">No upcoming events available for registration.</p>
    {/if}
  </div>
</div>