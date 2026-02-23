<script lang="ts">
  export let data: { myEvents?: Array<{ id: string; title: string; start_date?: string; end_date?: string }> };
  const myEvents = data?.myEvents ?? [];
  function formatDate(d?: string) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString(); } catch { return d; }
  }
</script>

<div class="max-w-3xl mx-auto py-8 px-4">
  <h1 class="text-2xl font-bold mb-6 text-stone-100">Admin — My Events</h1>

  {#if myEvents.length > 0}
    <ul class="space-y-4">
      {#each myEvents as event}
        <li class="p-4 rounded-lg border bg-stone-800 shadow-sm flex justify-between items-center">
          <div>
            <a href={`/admin/events/${event.id}`} class="text-lg font-semibold text-stone-100 hover:underline">{event.title}</a>
            <div class="text-sm text-stone-400">{formatDate(event.start_date)} — {formatDate(event.end_date)}</div>
          </div>
          <div>
            <a href={`/admin/events/${event.id}`} class="px-3 py-1 text-sm text-amber-100 bg-amber-800 rounded">Manage</a>
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="p-6 bg-stone-800 rounded shadow-sm text-stone-400">You are not an Event Director for any events.</div>
  {/if}
</div>
