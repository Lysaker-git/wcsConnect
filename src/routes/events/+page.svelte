<script lang="ts">
  export let data;
  console.log('📅 [Events Page] Loaded events data:', data);
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-10">
  <div class="max-w-2xl mx-auto">
    <h1 class="text-4xl font-extrabold text-blue-700 mb-8 text-center drop-shadow">Events Overview</h1>
    {#if data && data.events && data.events.length > 0}
      <ul class="space-y-6">
        {#each data.events as event}
          <li class="relative">
                <!-- Entire card is now a clickable link with enhanced styling -->
                <a href={`/events/${event.id}`} 
                    class="block p-6 rounded-xl border border-gray-200 bg-white shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-blue-500 transform hover:-translate-y-0.5">
                    
                    <!-- Event Title -->
                    <h2 class="text-2xl font-bold text-gray-800 mb-3 border-b pb-2 border-blue-500/20">{event.title}</h2>
                    
                    <!-- Date Range -->
                    <div class="flex flex-wrap gap-4 text-sm">
                        <!-- Start Date -->
                        <div class="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                            <!-- Calendar Icon (SVG for better control) -->
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                            </svg>
                            <span>Starts: {new Date(event.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <!-- End Date -->
                        <div class="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                            <!-- Calendar Icon -->
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                            </svg>
                            <span>Ends: {new Date(event.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                    </div>
                    
                    <!-- Subtle Call to action hint -->
                    <p class="mt-4 text-sm text-blue-600 font-bold tracking-wider pt-2 border-t border-gray-100">
                        Tap to View Event Details $\rightarrow$
                    </p>
                </a>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-center text-gray-500 mt-12">No upcoming events available.</p>
    {/if}
  </div>
</div>
