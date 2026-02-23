<script lang="ts">
  import { page } from '$app/stores';
  import SiFacebook from '@icons-pack/svelte-simple-icons/icons/SiFacebook';
  import SiInstagram from '@icons-pack/svelte-simple-icons/icons/SiInstagram';
  import SiTiktok from '@icons-pack/svelte-simple-icons/icons/SiTiktok';
  import { onMount, onDestroy } from 'svelte';

  export let data;
  console.log(data)

  const event = data.event;
  const error = data.error;
  const user = data.user ?? null;
  const isAuthenticated = data.isAuthenticated ?? false;
  const eventDetails = data.eventDetails ?? null;

  function formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch { return dateString; }
  }

  // Countdown logic
  const registrationOpens: Date | null = event?.registration_opens
    ? new Date(event.registration_opens)
    : null;

  let now = new Date();
  let interval: ReturnType<typeof setInterval>;

  $: registrationOpen = !registrationOpens || now >= registrationOpens;

  $: timeLeft = (() => {
    if (!registrationOpens || registrationOpen) return null;
    const diff = registrationOpens.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds };
  })();

  onMount(() => {
    if (registrationOpens && !registrationOpen) {
      interval = setInterval(() => { now = new Date(); }, 1000);
    }
  });

  onDestroy(() => { if (interval) clearInterval(interval); });

  function normalizeSocialLinks(sl: any) {
    if (!sl) return [];
    if (Array.isArray(sl)) return sl.filter(Boolean).map((u) => ({ url: u, label: u }));
    if (typeof sl === 'string') {
      try {
        const parsed = JSON.parse(sl);
        if (Array.isArray(parsed)) return parsed.map((u: any) => ({ url: u, label: u }));
        if (typeof parsed === 'object') return Object.values(parsed).map((u: any) => ({ url: u, label: u }));
      } catch (e) {
        // not JSON — fall back to comma-split
        return sl.split(',').map((u) => ({ url: u.trim(), label: u.trim() })).filter((x) => x.url);
      }
    }
    if (typeof sl === 'object') return Object.values(sl).map((u: any) => ({ url: u, label: u }));
    return [];
  }

</script>

<div class="min-h-screen bg-stone-900 py-16">
    <!-- Reverted max-width to 3xl to prevent spanning too wide -->
    <div class="max-w-3xl mx-auto px-6"> 
        <h1 class="text-5xl font-light text-stone-100 mb-10 text-center drop-shadow-md">Event Details</h1>

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
            <div class="neomorph-card bg-stone-800 rounded-3xl overflow-hidden border-t-8 border-blue-600 transition-all duration-300">
                
                {#if eventDetails?.banner_image_url}
                    <div class="w-full h-64 bg-gray-800 relative overflow-hidden">
                        <img src={eventDetails.banner_image_url} alt="Event banner" class="w-full h-full object-cover" />
                        <div class="absolute inset-0 bg-black/30"></div>
                    </div>
                {/if}

                <div class="p-10"> <!-- Increased padding around content -->
                    <!-- Title -->
                    <h2 class="text-5xl font-extrabold text-stone-300 mb-6 leading-tight tracking-tight">
                        {event.title}
                    </h2>

                    <!-- Dates and Info Block -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8"> <!-- Increased gap between date blocks -->
                        
                        <!-- Start Date -->
                        <!-- Increased padding and set large rounded corners -->
                        <div class="p-6 bg-green-50 rounded-xl border-l-4 border-green-500 shadow-md neomorph-card"> 
                            <p class="text-sm font-bold uppercase text-green-400 mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                                </svg>
                                Start Date
                            </p>
                            <p class="text-2xl font-extrabold text-stone-300">{formatDate(event.start_date)}</p>
                        </div>

                        <!-- End Date -->
                        <!-- Increased padding and set large rounded corners -->
                        <div class="p-6 bg-red-50 rounded-xl border-l-4 border-red-500 shadow-md neomorph-card">
                            <p class="text-sm font-bold uppercase text-red-400 mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                                </svg>
                                End Date
                            </p>
                            <p class="text-2xl font-extrabold text-stone-300">{formatDate(event.end_date)}</p>
                        </div>
                    </div>

                    <!-- Detailed Description / Organizer / Location -->
                    <div class="mt-10 space-y-6">
                        <div class="p-6 neomorph-inset rounded-xl">
                            <p class="text-xl font-bold text-stone-100 mb-4">About This Event</p>
                            <p class="text-stone-200 leading-relaxed">{eventDetails?.description ?? event.description ?? 'No description available.'}</p>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <!-- Location -->
                            <div class="p-6 bg-stone-800 rounded-xl border border-stone-600 shadow-sm neomorph-card">
                                <p class="text-sm font-semibold text-stone-200 mb-3">Location</p>
                                {#if eventDetails?.address}
                                    <p class="text-stone-100">{eventDetails.address}</p>
                                {/if}
                                {#if eventDetails?.venue}
                                    <p class="mt-2 text-stone-200">Venue: <span class="font-medium text-stone-100">{eventDetails.venue}</span></p>
                                {/if}
                                {#if eventDetails?.hotel}
                                    <p class="mt-2 text-stone-200">Recommended hotel: <span class="font-medium text-stone-100">{eventDetails.hotel}</span></p>
                                {/if}
                                {#if eventDetails?.transportation}
                                    <p class="mt-2 text-stone-200">Transport: <span class="font-medium text-stone-100">{eventDetails.transportation}</span></p>
                                {/if}
                            </div>

                            <!-- Organizer -->
                            <div class="p-6 bg-stone-700 rounded-xl border border-stone-600 shadow-sm neomorph-card">
                                <p class="text-sm font-semibold text-stone-200 mb-3">Organizer</p>
                                {#if eventDetails?.organizer_name}
                                    <p class="text-stone-100 font-medium">{eventDetails.organizer_name}</p>
                                {/if}
                                {#if eventDetails?.organizer_email}
                                    <p class="mt-2 text-stone-200">Email: <a href={`mailto:${eventDetails.organizer_email}`} class="text-blue-400 underline">{eventDetails.organizer_email}</a></p>
                                {/if}
                                {#if eventDetails?.organizer_phone}
                                    <p class="mt-2 text-stone-200">Phone: <a href={`tel:${eventDetails.organizer_phone}`} class="text-blue-400">{eventDetails.organizer_phone}</a></p>
                                {/if}
                                {#if event.social_links || eventDetails.social_links}
                                {@const socials = normalizeSocialLinks(event.social_links ?? eventDetails.social_links)}
                                {#if socials.length}
                                    <div class="flex gap-2 mt-1">
                                    {#each socials as s}
                                        {#if s.label.toLowerCase().includes('facebook')}
                                        <a href={s.url} class="text-blue-500 hover:underline" rel="noopener noreferrer" target="_blank" aria-label="Facebook">
                                            <SiFacebook class="w-6 h-6"/>
                                        </a>
                                        {:else if s.label.toLowerCase().includes('instagram')}
                                        <a href={s.url} class="text-pink-500 hover:underline" rel="noopener noreferrer" target="_blank" aria-label="Instagram">
                                            <SiInstagram class="w-6 h-6"/>
                                        </a>
                                        {:else if s.label.toLowerCase().includes('tiktok')}
                                        <a href={s.url} class="text-black hover:underline" rel="noopener noreferrer" target="_blank" aria-label="TikTok">
                                            <SiTiktok class="w-6 h-6"/>
                                        </a>
                                        {/if}
                                    {/each}
                                    </div>
                                {/if}
                                {/if}
                            </div>

                            <!-- Event Info -->
                            <div class="p-6 bg-stone-700 rounded-xl border border-stone-600 shadow-sm neomorph-card">
                                <p class="text-sm font-semibold text-stone-200 mb-3">Event Tags</p>
                                {#if eventDetails?.event_type}
                                    <p class="text-stone-200">Type: <span class="font-medium text-stone-100">{eventDetails.event_type}</span></p>
                                {/if}
                                {#if eventDetails?.languages}
                                    <p class="mt-2 text-stone-200">Languages: <span class="font-medium text-stone-100">{eventDetails.languages}</span></p>
                                {/if}
                                {#if eventDetails?.accessibility}
                                    <p class="mt-2 text-stone-200">Accessibility: <span class="font-medium text-stone-100">{eventDetails.accessibility}</span></p>
                                {/if}
                                {#if eventDetails?.tags && eventDetails.tags.length}
                                    <div class="mt-4 flex flex-wrap gap-2">
                                        {#each eventDetails.tags as t}
                                            <span class="inline-flex items-center rounded-md bg-stone-600 px-2 py-1 text-xs font-medium text-stone-200 ring-1 ring-inset ring-stone-700">{t}</span>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <!-- Media / Extras -->
                        {#if eventDetails?.schedule_image_url || eventDetails?.promo_video_url}
                        <div class="p-6 bg-stone-700 rounded-xl border border-stone-600 shadow-sm neomorph-inset">
                            <p class="text-sm font-semibold text-stone-400 mb-3">Media</p>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

                                {#if eventDetails?.schedule_image_url}
                                    <div class="col-span-1 md:col-span-1">
                                        <img src={eventDetails.schedule_image_url} alt="Schedule" class="w-full h-32 object-cover rounded-md" />
                                        <p class="text-xs text-stone-500 mt-2">Schedule</p>
                                    </div>
                                {/if}

                                {#if eventDetails?.promo_video_url}
                                    <div class="col-span-1 md:col-span-1">
                                        <a href={eventDetails.promo_video_url} target="_blank" rel="noopener" class="block w-full h-32 bg-stone-600 rounded-md flex items-center justify-center border border-dashed border-stone-500 hover:bg-stone-700">
                                            <span class="text-sm text-blue-600">Watch Promo</span>
                                        </a>
                                        <p class="text-xs text-stone-500 mt-2">Promo video</p>
                                    </div>
                                {/if}
                            </div>
                        </div>
                        {/if}
                    </div>

                    <!-- Main Call to Action -->
                    <div class="mt-12 pt-6">
                    {#if !registrationOpen && timeLeft}
                        <!-- Countdown -->
                        <div class="p-6 bg-stone-800 rounded-xl border border-stone-600 text-center neomorph-inset">
                        <p class="text-stone-400 text-sm uppercase tracking-widest mb-4">Registration opens in</p>
                        <div class="grid grid-cols-4 gap-3 mb-4">
                            {#each [
                            { value: timeLeft.days, label: 'Days' },
                            { value: timeLeft.hours, label: 'Hours' },
                            { value: timeLeft.minutes, label: 'Minutes' },
                            { value: timeLeft.seconds, label: 'Seconds' }
                            ] as unit}
                            <div class="bg-stone-800 rounded-xl p-3 neomorph-card">
                                <p class="text-3xl font-extrabold text-amber-400 tabular-nums">
                                {String(unit.value).padStart(2, '0')}
                                </p>
                                <p class="text-xs text-stone-500 mt-1">{unit.label}</p>
                            </div>
                            {/each}
                        </div>
                        <p class="text-stone-500 text-xs">
                            Opens {registrationOpens?.toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'long', day: 'numeric', 
                            hour: '2-digit', minute: '2-digit' 
                            })}
                        </p>
                        </div>
                    {:else if isAuthenticated}
                        <a href={`/events/${event.id}/register`}
                        class="block text-center w-full py-4 bg-amber-600 text-white text-xl font-bold rounded-xl shadow-xl hover:bg-amber-700 transition duration-300"
                        role="button"
                        >
                        Register for {event.title}
                        </a>
                    {:else}
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <a href="/profile" class="block text-center w-full py-3 bg-amber-600 text-stone-900 text-lg font-bold rounded-xl shadow hover:bg-amber-700 transition duration-300">Sign In</a>
                        <a href="/signup" class="block text-center w-full py-3 border border-stone-700 text-stone-700 text-lg font-bold rounded-xl shadow hover:bg-stone-700 hover:text-stone-300 transition duration-300">Sign Up</a>
                        </div>
                    {/if}
                    </div>
                </div>
            </div>
            <!-- End Event Detail Card -->
        {/if}
    </div>
</div>

<style>
    .neomorph-card {
        background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(2,6,23,0.06));
        box-shadow: 8px 8px 24px rgba(2,6,23,0.6), -8px -8px 18px rgba(255,255,255,0.03);
        border-radius: 1.25rem;
        border: 1px solid rgba(255,255,255,0.03);
    }

    /* Inset/pressed neomorph for About section */
    .neomorph-inset {
        background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(0,0,0,0.03));
        box-shadow: inset 6px 6px 16px rgba(2,6,23,0.5), inset -6px -6px 12px rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.02);
    }
</style>
