<script lang="ts">
    import Roadmap from "$lib/components/roadmap.svelte";
    export let data;

    // Define the data for the four feature cards (neumorphism styling applied below)
    const featureCards = [
        {
            title: 'Global Events',
            description: 'Find, register, and plan your next major WCS weekend.',
            icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
            href: '/events'
        },
        {
            title: 'Local Classes',
            description: 'Weekly sessions and workshops in your area to grow your skills.',
            icon: 'M3 5a2 2 0 012-2h10a2 2 0 012 2v2M9 1v2m-4 0h14',
            href: '/classes'
        },
        {
            title: 'Mock Competitions',
            description: 'Track your heats, view results, and compete in all divisions.',
            icon: 'M9 19V6l2-2h5l2 2v13a2 2 0 01-2 2H9a2 2 0 01-2-2z',
            href: '/competition'
        },
        {
            title: 'Learning Portal',
            description: 'Educational resources, course streams, and technique videos.',
            icon: 'M14 10l-2 1m0 0l-2-1m2 1v2.5M10 7h4M6 15h2m0 0h3m-3 0v4',
            href: '/wcs-education'
        }
    ];

    // Map server-provided events into items for the table
    // Support both array responses and a single-event object (e.g. when data.events.is_published === false)
    $: upcomingItems = (() => {
        if (!data?.events) return [];
        const eventsArray = Array.isArray(data.events) ? data.events : [data.events];
        // Only show events explicitly marked live
        const liveEvents = eventsArray.filter((e: any) => e?.is_published === true);
        return liveEvents.map((e: any) => ({
            type: e.event_details?.event_type ?? 'Event',
            title: e.title ?? 'Untitled',
            date:
                e.start_date && e.end_date
                    ? `${new Date(e.start_date).toLocaleDateString()} - ${new Date(e.end_date).toLocaleDateString()}`
                    : e.start_date
                    ? new Date(e.start_date).toLocaleDateString()
                    : '',
            location: e.location ?? e.venue ?? e.city ?? '',
            link: `/events/${e.id}`
        }));
    })();

    function getTypeColor(type: string): string {
        switch (type) {
            case 'WSDC Event':
                return 'bg-amber-800 text-amber-200 ring-amber-600';
            case 'Class':
                return 'bg-amber-700 text-amber-100 ring-amber-500';
            case 'Competition':
                return 'bg-amber-900 text-amber-200 ring-amber-700';
            case 'Learning':
                return 'bg-amber-800 text-amber-100 ring-amber-600';
            default:
                return 'bg-stone-800 text-stone-200 ring-stone-600';
        }
    }
</script>

<div class="min-h-screen bg-stone-900 text-stone-100 font-sans">

    <!-- 1. Hero Section (dark) -->
    <section class="py-20 md:py-32 bg-stone-950/20">
        <div class="max-w-6xl mx-auto px-6 text-center">
            <h1 class="text-6xl md:text-8xl font-black mb-4 tracking-tighter text-white">
                Dance Point
            </h1>
            <p class="text-lg md:text-xl mb-10 max-w-2xl mx-auto text-stone-300">
                Your centralized portal for all things West Coast Swing: events, competitions, local classes, and learning.
            </p>

            <div class="flex flex-col sm:flex-row justify-center gap-4">
                {#if data.user}
                    <a href="/events" class="px-7 py-3 text-lg font-bold rounded-xl text-white neu-btn neu-hero-primary">
                        Events
                    </a>
                    <a href="/classes" class="px-7 py-3 text-lg font-semibold rounded-xl bg-transparent text-slate-200 neu-btn neu-hero-secondary">
                        Classes
                    </a>
                {:else}
                    <a href="/signup" class="px-7 py-3 text-lg font-bold rounded-xl text-white neu-btn neu-hero-primary">
                        Sign Up
                    </a>
                    <a href="/profile" class="px-7 py-3 text-lg font-semibold rounded-xl bg-transparent text-slate-200 neu-btn neu-hero-secondary">
                        Sign In
                    </a>
                {/if}
            </div>
        </div>
    </section>

    <!-- 2. Feature Cards Section (Neumorphism) -->
    <section class="py-16 bg-stone-900/20 border-t border-b border-stone-800">
        <div class="max-w-6xl mx-auto px-6">
            <h2 class="text-3xl md:text-4xl font-bold mb-8 text-center text-slate-100">Dance Point Ecosystem</h2>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                {#each featureCards as card}
                    <a href={card.href} class="no-underline">
                        <div class="p-6 h-full rounded-xl transition-transform transform hover:-translate-y-1" style="background: linear-gradient(180deg,#101410 0%, #0f1212 100%); border-radius:12px; box-shadow: 6px 6px 14px rgba(2,6,23,0.7), -5px -5px 10px rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.02);">
                            <div class="mb-4 w-12 h-12 flex items-center justify-center rounded-full text-white" style="background:linear-gradient(180deg,#3b2a0b,#b78f2e);">
                                {#if card.title === 'Global Events'}
                                    <span class="text-2xl">🌍</span>
                                {:else if card.title === 'Local Classes'}
                                    <span class="text-2xl">💡</span>
                                {:else if card.title === 'Mock Competitions'}
                                    <span class="text-2xl">🎯</span>
                                {:else if card.title === 'Learning Portal'}
                                    <span class="text-2xl">🧠</span>
                                {:else}
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d={card.icon} />
                                    </svg>
                                {/if}
                            </div>

                            <h3 class="text-xl font-bold text-stone-100 mb-2">
                                {card.title}
                            </h3>
                            <p class="text-stone-300 text-sm">
                                {card.description}
                            </p>
                        </div>
                    </a>
                {/each}
            </div>
        </div>
    </section>

    <!-- 3. Upcoming Events Table (uses server data) -->
    <section class="py-16 bg-stone-950/50 border-b border-stone-800">
        <div class="max-w-6xl mx-auto px-6">
                <div class="flex justify-between items-end mb-8">
                <h2 class="text-2xl md:text-4xl font-bold text-stone-100">Upcoming WCS Opportunities</h2>
                <a href="/events" class="text-amber-400 font-semibold hover:text-amber-300 transition">View All Events &rarr;</a>
            </div>

            <div class="bg-stone-900 rounded-xl overflow-hidden border border-stone-700" style="box-shadow: 6px 6px 20px rgba(2,6,23,0.7), -5px -5px 12px rgba(255,255,255,0.02);">
                <table class="min-w-full">
                    <thead>
                        <tr class="bg-stone-950/40 text-stone-400 text-xs uppercase tracking-wider">
                            <th class="px-6 py-4 text-left">Type</th>
                            <th class="px-6 py-4 text-left">Title</th>
                            <th class="px-6 py-4 text-left">Date</th>
                            <th class="px-6 py-4 text-left hidden sm:table-cell">Location</th>
                            <th class="px-6 py-4 text-right"> </th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each upcomingItems as item, i}
                            <tr class="border-t {i % 2 === 0 ? 'bg-stone-950/10' : ''} border-stone-700 hover:bg-stone-800 transition duration-100" style="transition:background-color .12s ease;">
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ring-1 ring-inset ${getTypeColor(item.type)}`}>
                                        {item.type}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-100">
                                    {item.title}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-300">
                                    {item.date}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-300 hidden sm:table-cell">
                                    {item.location}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <a href={item.link} aria-label="View {item.date}" class="inline-flex items-center justify-center w-9 h-9 rounded-md bg-stone-800 hover:bg-stone-700 text-amber-300" style="box-shadow: inset 2px 2px 6px rgba(2,6,23,0.6), -2px -2px 6px rgba(255,255,255,0.01);">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fill-rule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                                        </svg>
                                    </a>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <div class="mt-8 p-4 text-center bg-stone-800 border border-stone-700 rounded-lg text-stone-300" style="box-shadow: inset 1px 1px 6px rgba(2,6,23,0.55);">
                <p class="text-sm font-semibold">
                    <span class="font-bold">Heads up:</span> Please <a href="/signin" class="underline text-amber-300">Sign In</a> or <a href="/signup" class="underline text-amber-300">Sign Up</a> to register for events, classes, and competitions.
                </p>
            </div>
        </div>
      </section>
      
    <Roadmap />

</div>

<style>
    .neu-btn {
        border-radius: 12px;
        transition: box-shadow .18s ease, background-color .18s ease, transform .12s ease;
    }
    .neu-hero-primary {
        box-shadow: 8px 8px 18px rgba(2,6,23,0.75), -6px -6px 12px rgba(255,255,255,0.03);
        background: linear-gradient(180deg,#170202 0%, #101410 100%);
        border:1px solid rgba(255,255,255,0.02);
    }
    .neu-hero-secondary {
        box-shadow: 6px 6px 14px rgba(2,6,23,0.7), -4px -4px 10px rgba(255,255,255,0.02);
        background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(0,0,0,0.18));
        border:1px solid rgba(255,255,255,0.02);
    }
    .neu-btn:hover {
        box-shadow: inset 6px 6px 12px rgba(2,6,23,0.75), inset -4px -4px 8px rgba(255,255,255,0.02);
        transform: none;
    }
    .neu-btn:active {
        box-shadow: inset 8px 8px 14px rgba(2,6,23,0.8), inset -6px -6px 10px rgba(255,255,255,0.02);
    }
</style>
