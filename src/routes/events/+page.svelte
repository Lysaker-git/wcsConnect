<script lang="ts">
  import eventImage from '$lib/images/placeholders/eventPlaceholder.jpg';
  import eventImageTwo from '$lib/images/placeholders/eventPlaceholderTwo.jpg';
  export let data;

  let query = '';
  const events = data?.events ?? [];

  $: queryLower = String(query ?? '').trim().toLowerCase();
  let today: Date;

  // searchMatches filters events by title, tags, or event_type
  $: searchMatches = events.filter((e: any) => {
    if (!queryLower) return true;
    const title = (e.title ?? '').toLowerCase();
    if (title.includes(queryLower)) return true;

    const etype = ((e.event_type ?? e.eventType) ?? '').toString().toLowerCase();
    if (etype.includes(queryLower)) return true;

    const tagList = normalizeTags(e.tags ?? e.tags ?? e.tags);
    for (const t of tagList) {
      if ((t ?? '').toLowerCase().includes(queryLower)) return true;
    }

    return false;
  });

  // split by start_date into upcoming and past
  $: {
    today = new Date();
    today.setHours(0,0,0,0);
  }

  $: upcoming = searchMatches.filter((e: any) => {
    if (!e?.start_date) return true; // keep if no date
    const sd = new Date(e.start_date);
    sd.setHours(0,0,0,0);
    return sd >= today;
  });

  $: pastEvents = searchMatches.filter((e: any) => {
    if (!e?.start_date) return false;
    const sd = new Date(e.start_date);
    sd.setHours(0,0,0,0);
    return sd < today;
  });

  // Deterministic-ish size generator so cards feel varied but stable across renders
  function seedFromId(id: any) {
    const s = String(id ?? '');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    return Math.abs(h);
  }

  function truncate(s: any, n = 25) {
    if (!s && s !== 0) return '';
    const str = String(s).trim();
    return str.length > n ? str.slice(0, n).trim() + '…' : str;
  }

  function normalizeTags(tags: any) {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.filter(Boolean);
    if (typeof tags === 'string') return tags.split(',').map((t) => t.trim()).filter(Boolean);
    return [];
  }

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

  function getPlaceholder(event: any) {
    const idx = seedFromId(event.id ?? event.title ?? Math.random()) % 2;
    return idx === 0 ? eventImage : eventImageTwo;
  }

  function bannerSrc(event: any, detail: any) {
    return (event?.banner_image_url || detail?.banner_image_url) || getPlaceholder(event);
  }
</script>

<div class="bg-stone-900 py-8">
  <div class="max-w-6xl mx-auto px-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-extrabold text-stone-300">Events Overview</h1>
      <div class="w-full max-w-md ml-4">
        <label for="search" class="sr-only">Search events</label>
        <div class="relative">
          <input id="search" type="search" bind:value={query} placeholder="Search by title, tags or location..." class="w-full pl-10 bg-stone-700 pr-4 py-2 rounded-lg border border-stone-600 text-sm text-stone-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
          <svg class="absolute left-3 top-2.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
        </div>
      </div>
    </div>

    {#if upcoming && upcoming.length > 0}
      <ul class="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-stretch">
        {#each upcoming as event}
          {#key event.id}
            {@const detail = (event.details && event.details[0]) ?? {}}
            <li>
              <a href={`/events/${event.id}`} class="block neomorph-card overflow-hidden">
                <div class="w-full h-48 bg-gray-800 relative overflow-hidden">
                  <img src={bannerSrc(event, detail)} alt={event.title} class="w-full h-full object-cover" class:placeholder-img={! (event.banner_image_url || detail.banner_image_url)} />
                  {#if !(event.banner_image_url || detail.banner_image_url)}
                    <div class="absolute inset-0 bg-black/30"></div>
                    <div class="absolute left-4 bottom-3 text-sm text-stone-200">{truncate(event.title, 40)}</div>
                  {/if}
                </div>

                <div class="p-5 bg-stone-800 text-stone-100">
                  <h2 class="text-lg font-extrabold truncate">{event.title}</h2>

                  {#if event.description || detail.description}
                    <p class="mt-2 text-sm text-stone-200">{truncate(event.description ?? detail.description, 25)}</p>
                  {/if}

                  <div class="mt-3 text-sm text-stone-300 space-y-1">
                    {#if event.venue || event.hotel || detail.venue || detail.hotel}
                      {@const v = event.venue ?? detail.venue}
                      {@const h = event.hotel ?? detail.hotel}
                      {#if v && h && v !== h}
                        <div><strong class="font-semibold text-stone-100">Venue:</strong> {v}</div>
                        <div><strong class="font-semibold text-stone-100">Hotel:</strong> {h}</div>
                      {:else}
                        <div><strong class="font-semibold text-stone-100">Location:</strong> {v || h}</div>
                      {/if}
                    {/if}

                    {#if event.event_type || detail.event_type}
                      <div><strong class="font-semibold text-stone-100">Type:</strong> {event.event_type ?? detail.event_type}</div>
                    {/if}

                    {#if event.organizer_name || detail.organizer_name}
                      <div><strong class="font-semibold text-stone-100">Organizer:</strong> {event.organizer_name ?? detail.organizer_name}</div>
                    {/if}

                    {#if event.social_links || detail.social_links}
                      {@const socials = normalizeSocialLinks(event.social_links ?? detail.social_links)}
                      {#if socials.length}
                        <div class="flex gap-2 mt-1">
                          {#each socials as s}
                            <a href={s.url} class="text-xs text-blue-200 hover:underline" rel="noopener noreferrer" target="_blank">{truncate(s.label, 18)}</a>
                          {/each}
                        </div>
                      {/if}
                    {/if}
                  </div>

                  {#if normalizeTags(event.tags ?? detail.tags).length}
                    <div class="mt-4 flex flex-wrap gap-2">
                      {#each normalizeTags(event.tags ?? detail.tags) as t}
                        <span class="px-2 py-0.5 text-xs bg-stone-700 text-stone-200 rounded-full">{t}</span>
                      {/each}
                    </div>
                  {/if}

                  <div class="mt-4 flex items-center justify-between text-xs text-stone-400">
                    <div>Starts: {new Date(event.start_date).toLocaleDateString()}</div>
                    <div>Ends: {new Date(event.end_date).toLocaleDateString()}</div>
                  </div>
                </div>
              </a>
            </li>
          {/key}
        {/each}
      </ul>
    {:else}
      <p class="text-center text-gray-400 mt-6">No upcoming events match your search.</p>
    {/if}

    {#if pastEvents && pastEvents.length > 0}
      <details class="mt-8 bg-stone-800 rounded-lg p-3">
        <summary class="cursor-pointer text-stone-300 font-semibold">Past events ({pastEvents.length})</summary>

        <div class="mt-3 overflow-auto">
          <table class="w-full text-sm text-stone-200">
            <thead class="text-xs text-stone-400 border-b border-stone-700">
              <tr>
                <th class="py-2 text-left">Event</th>
                <th class="py-2 text-left">Dates</th>
                <th class="py-2 text-left">Type</th>
                <th class="py-2 text-left">Tags</th>
              </tr>
            </thead>
            <tbody>
              {#each pastEvents as e}
                <tr class="border-b border-stone-700 hover:bg-stone-700">
                  <td class="py-2">
                    <a href={`/events/${e.id}`} class="text-stone-100 hover:underline">{e.title}</a>
                  </td>
                  <td class="py-2 text-stone-300">{e.start_date ? new Date(e.start_date).toLocaleDateString() : '-'} — {e.end_date ? new Date(e.end_date).toLocaleDateString() : '-'}</td>
                  <td class="py-2 text-stone-300">{e.event_type ?? '-'}</td>
                  <td class="py-2">
                    {#if normalizeTags(e.tags ?? e.tags).length}
                      <div class="flex flex-wrap gap-2">
                        {#each normalizeTags(e.tags ?? e.tags) as t}
                          <span class="px-2 py-0.5 text-xs bg-stone-700 text-stone-200 rounded-full">{t}</span>
                        {/each}
                      </div>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </details>
    {:else}
      <p class="text-center text-gray-500 mt-12">No events match your search.</p>
    {/if}
  </div>
</div>


<style>
  .neomorph-card {
    box-shadow:
      5px 5px 18px rgba(2,6,23,0.5),
      -5px -5px 12px rgba(255,255,255,0.08);
    border-radius: 1rem;
    border: 1px solid rgba(255,255,255,0.1);
  }

  /* Pressed (inset) effect on hover/focus - inverted neomorphism */
  .neomorph-card:hover,
  .neomorph-card:focus {
    /* Remove or soften the border to enhance the "sunken" look */
    border: 1px solid rgba(255, 255, 255, 0.05);
    outline: none; /* Clean focus state */
    
    /* The Magic: Inset Shadows */
    box-shadow:
      inset 5px 5px 12px rgba(2, 6, 23, 0.3),     /* Top-left dark inner shadow */
      inset -5px -5px 10px rgba(255, 255, 255, 0.1); /* Bottom-right light inner glow */
      
    /* Optional: slightly shrink the card to add to the "pressed" feel */
    transition: all 0.2s ease-in-out;
  }

    /* placeholder treatment */
    .placeholder-img {
      filter: blur(3px) brightness(0.55) saturate(0.9);
      transform: scale(1.02);
      transition: filter 180ms ease, transform 180ms ease;
    }
</style>