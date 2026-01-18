<script lang="ts">
	import Roadmap from "$lib/components/roadmap.svelte";

    // Define the data for the four feature cards
    const featureCards = [
        { 
            title: 'Global Events', 
            description: 'Find, register, and plan your next major WCS weekend.', 
            icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', // Clock/Timer
            href: '/events' 
        },
        { 
            title: 'Local Classes', 
            description: 'Weekly sessions and workshops in your area to grow your skills.', 
            icon: 'M3 5a2 2 0 012-2h10a2 2 0 012 2v2M9 1v2m-4 0h14', // Book/Open
            href: '/classes' 
        },
        { 
            title: 'Mock Competitions', 
            description: 'Track your heats, view results, and compete in all divisions.', 
            icon: 'M9 19V6l2-2h5l2 2v13a2 2 0 01-2 2H9a2 2 0 01-2-2z', // Trophy
            href: '/competition' 
        },
        { 
            title: 'Learning Portal', 
            description: 'Educational resources, course streams, and technique videos.', 
            icon: 'M14 10l-2 1m0 0l-2-1m2 1v2.5M10 7h4M6 15h2m0 0h3m-3 0v4', // Graduation Cap/Learning
            href: '/wcs-education' 
        }
    ];

    // Dummy data for upcoming events table
    // You will replace this with actual data fetched in +page.server.ts
    const upcomingItems = [
        { type: 'Event', title: 'Oslo WCS Weekend', date: 'Nov 15 - 17, 2025', location: 'Oslo, Norway', link: '/events/oslo-wcs' },
        { type: 'Class', title: 'Beginner Footwork Series', date: 'Nov 4, 2025', location: 'Local Studio', link: '/classes/footwork-series' },
        { type: 'Competition', title: 'Nordic Open Classic', date: 'Nov 22 - 24, 2025', location: 'Copenhagen, Denmark', link: '/competition/nordic-open' },
        { type: 'Learning', title: 'Musicality Deep Dive Workshop', date: 'Nov 9, 2025', location: 'Online', link: '/wcs-education/musicality' },
        { type: 'Event', title: 'Paris Flashmob Practice', date: 'Dec 1, 2025', location: 'Paris, France', link: '/events/paris-flash' },
    ];

    // Helper function to get color based on item type
    function getTypeColor(type: string): string {
        switch (type) {
            case 'Event':
                return 'bg-blue-100 text-blue-800 ring-blue-500';
            case 'Class':
                return 'bg-green-100 text-green-800 ring-green-500';
            case 'Competition':
                return 'bg-purple-100 text-purple-800 ring-purple-500';
            case 'Learning':
                return 'bg-yellow-100 text-yellow-800 ring-yellow-500';
            default:
                return 'bg-gray-100 text-gray-800 ring-gray-500';
        }
    }
</script>

<div class="min-h-screen bg-gray-50 font-sans">
    
    <!-- 1. Hero Section -->
    <section class="py-20 md:py-32 bg-gradient-to-br from-blue-700 to-indigo-800 text-white shadow-xl">
        <div class="max-w-6xl mx-auto px-6 text-center">
            <h1 class="text-6xl md:text-8xl font-black mb-4 tracking-tighter drop-shadow-lg">
                WCS Connect
            </h1>
            <p class="text-xl md:text-2xl mb-10 max-w-2xl mx-auto text-indigo-200">
                Your centralized portal for all things West Coast Swing: events, competitions, local classes, and a dedicated learning platform.
            </p>

            <!-- Main CTAs -->
            <div class="flex flex-col sm:flex-row justify-center gap-4">
                <a href="/signup" class="px-8 py-3 text-lg font-bold rounded-xl bg-pink-500 text-white shadow-2xl hover:bg-pink-600 transition duration-300 transform hover:scale-105">
                    Sign Up Now!
                </a>
                <a href="/profile" class="px-8 py-3 text-lg font-semibold rounded-xl bg-transparent border-2 border-indigo-400 text-indigo-200 hover:bg-indigo-700 transition duration-300 transform hover:scale-105">
                    Sign In
                </a>
            </div>
        </div>
    </section>

    <!-- 2. Feature Cards Section -->
    <section class="py-16 bg-white">
        <div class="max-w-6xl mx-auto px-6">
            <h2 class="text-4xl font-bold text-gray-800 mb-12 text-center">The WCS Ecosystem</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                {#each featureCards as card}
                    <a href={card.href} class="no-underline group">
                        <div class="p-6 h-full bg-white rounded-xl border border-gray-200 shadow-lg 
                                    hover:shadow-xl hover:border-blue-500 transition duration-300 transform hover:-translate-y-1">
                            
                            <div class="mb-4 w-12 h-12 flex items-center justify-center bg-blue-500 rounded-full text-white shadow-md group-hover:bg-blue-600">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d={card.icon} />
                                </svg>
                            </div>

                            <h3 class="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600">
                                {card.title}
                            </h3>
                            <p class="text-gray-600 text-sm">
                                {card.description}
                            </p>
                        </div>
                    </a>
                {/each}
            </div>
        </div>
    </section>

    <!-- 3. Upcoming Events Table -->
    <section class="py-16 bg-gray-100">
        <div class="max-w-6xl mx-auto px-6">
            <div class="flex justify-between items-end mb-8">
                <h2 class="text-4xl font-bold text-gray-800">Upcoming WCS Opportunities</h2>
                <a href="/events" class="text-blue-600 font-semibold hover:text-blue-800 transition">View All Events & Classes &rarr;</a>
            </div>

            <div class="bg-white rounded-xl shadow-xl overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                            <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Title</th>
                            <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                            <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Location</th>
                            <th scope="col" class="relative px-6 py-4">
                                <span class="sr-only">Action</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        {#each upcomingItems as item}
                            <tr class="hover:bg-gray-50 transition duration-100">
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ring-1 ring-inset {getTypeColor(item.type)}">
                                        {item.type}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {item.title}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.date}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                                    {item.location}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <a href={item.link} class="text-indigo-600 hover:text-indigo-900 transition">View Details</a>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- Login Remark -->
            <div class="mt-8 p-4 text-center bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                <p class="text-sm font-semibold">
                    <span class="font-bold">Heads up:</span> Please <a href="/signin" class="underline hover:text-yellow-900">Sign In</a> or <a href="/signup" class="underline hover:text-yellow-900">Sign Up</a> to register for events, classes, and competitions.
                </p>
            </div>
        </div>
      </section>
      
    <Roadmap />

</div>
