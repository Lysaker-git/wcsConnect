<script lang="ts">
  export let data: { myEvents?: Array<{ id: string; title: string; start_date?: string; end_date?: string }> };
  const myEvents = data?.myEvents ?? [];
  function formatDate(d?: string) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString(); } catch { return d; }
  }
</script>

<div class="max-w-3xl mx-auto py-8 px-4">
  <h1 class="text-2xl font-bold mb-6">Admin — My Events</h1>

  {#if myEvents.length > 0}
    <ul class="space-y-4">
      {#each myEvents as event}
        <li class="p-4 rounded-lg border bg-white shadow-sm flex justify-between items-center">
          <div>
            <a href={`/admin/events/${event.id}`} class="text-lg font-semibold text-[var(--color-blue-700)] hover:underline">{event.title}</a>
            <div class="text-sm text-gray-500">{formatDate(event.start_date)} — {formatDate(event.end_date)}</div>
          </div>
          <div>
            <a href={`/admin/events/${event.id}`} class="px-3 py-1 text-sm text-white bg-[var(--color-blue-700)] rounded">Manage</a>
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="p-6 bg-white rounded shadow-sm text-gray-600">You are not an Event Director for any events.</div>
  {/if}
</div>
