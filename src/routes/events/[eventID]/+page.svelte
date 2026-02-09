<script lang="ts">
    import { page } from '$app/stores';

    // The data object comes from the load function (src/routes/events/[eventID]/+page.ts)
    export let data;

    console.log('🎉 [Event Detail Page] Loaded event data:', data);

    const event = data.event;
    const error = data.error;

    console.log('🎉 [Event Detail Page] Loaded event data:', event);

    // Helper function for consistent date formatting
    function formatDate(dateString: string | undefined): string {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        } catch {
            return dateString;
        }
    }
</script>

<div class="min-h-screen bg-gray-50 py-16">
    <!-- Reverted max-width to 3xl to prevent spanning too wide -->
    <div class="max-w-3xl mx-auto px-6"> 
        <h1 class="text-5xl font-extrabold text-gray-900 mb-10 text-center drop-shadow-md">Event Details</h1>

        {#if error}
            <div class="p-6 rounded-xl bg-red-100 border border-red-400 text-red-800 text-center shadow-lg">
                <p class="font-bold mb-2">Error Loading Event</p>
                <p>{error}</p>
                <p class="mt-4 text-sm">Event ID: {$page.params.eventID}</p>
            </div>
        {:else if !event}
            <div class="p-6 rounded-xl bg-yellow-100 border border-yellow-400 text-yellow-800 text-center shadow-lg">
                <p class="font-bold">Loading...</p>
            </div>
        {:else}
            <!-- Event Detail Card -->
            <div class="bg-white rounded-3xl shadow-2xl overflow-hidden border-t-8 border-blue-600 transition-all duration-300">
                
                <div class="p-10"> <!-- Increased padding around content -->
                    <!-- Title -->
                    <h2 class="text-5xl font-extrabold text-blue-800 mb-6 leading-tight tracking-tight">
                        {event.title}
                    </h2>

                    <!-- Dates and Info Block -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8"> <!-- Increased gap between date blocks -->
                        
                        <!-- Start Date -->
                        <!-- Increased padding and set large rounded corners -->
                        <div class="p-6 bg-green-50 rounded-xl border-l-4 border-green-500 shadow-md"> 
                            <p class="text-sm font-bold uppercase text-green-700 mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                                </svg>
                                Start Date
                            </p>
                            <p class="text-2xl font-extrabold text-gray-800">{formatDate(event.start_date)}</p>
                        </div>

                        <!-- End Date -->
                        <!-- Increased padding and set large rounded corners -->
                        <div class="p-6 bg-red-50 rounded-xl border-l-4 border-red-500 shadow-md">
                            <p class="text-sm font-bold uppercase text-red-700 mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                                </svg>
                                End Date
                            </p>
                            <p class="text-2xl font-extrabold text-gray-800">{formatDate(event.end_date)}</p>
                        </div>
                    </div>

                    <!-- Placeholder for Detailed Description / Organizer / Location -->
                    <div class="mt-10 p-6 bg-gray-100 rounded-xl border border-gray-300 shadow-inner">
                        <p class="text-xl font-bold text-gray-700 mb-4">About This Event</p>
                        <p class="text-gray-600 leading-relaxed">
                            This is where the full event description, location details, and additional information will go. It now has more visual space and better separation from the date blocks above.
                        </p>
                    </div>

                    <!-- Main Call to Action -->
                    <div class="mt-12 pt-6 border-t border-gray-200">
                        <a href={`/events/${event.id}/register`}
                           class="block text-center w-full py-4 bg-blue-600 text-white text-xl font-bold rounded-xl shadow-xl hover:bg-blue-700 transition duration-300 transform hover:scale-[1.005]"
                           role="button"
                        >
                            Register for {event.title}
                        </a>
                    </div>
                </div>
            </div>
            <!-- End Event Detail Card -->
        {/if}
    </div>
</div>
