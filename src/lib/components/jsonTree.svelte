<script>
  export let data;
  export let depth = 0;

  let collapsed = depth > 1; // auto-collapse past depth 1
  const isObject = typeof data === 'object' && data !== null;
  const isArray = Array.isArray(data);
  const keys = isObject ? Object.keys(data) : [];
  const preview = isArray ? `[ ${data.length} items ]` : `{ ${keys.length} keys }`;
</script>

{#if !isObject}
  <!-- Primitive value -->
  <span class="value {typeof data}">{JSON.stringify(data)}</span>

{:else}
  <span class="toggle" on:click={() => collapsed = !collapsed}>
    {collapsed ? '▶' : '▼'} <span class="preview">{preview}</span>
  </span>

  {#if !collapsed}
    <div class="indent">
      {#each keys as key}
        <div class="row">
          <span class="key">{key}:</span>
          <svelte:self data={data[key]} depth={depth + 1} />
        </div>
      {/each}
    </div>
  {/if}
{/if}

<style>
  .indent { padding-left: 1.2rem; border-left: 1px solid #ddd; margin-left: 0.3rem; }
  .row { margin: 2px 0; display: flex; gap: 6px; flex-wrap: wrap; align-items: flex-start; }
  .toggle { cursor: pointer; user-select: none; color: #555; }
  .toggle:hover { color: #000; }
  .preview { color: #888; font-size: 0.85em; }
  .key { color: #881391; font-weight: bold; white-space: nowrap; }
  .value { }
  .string { color: #c41a16; }
  .number { color: #1c00cf; }
  .boolean { color: #aa0d91; }
  .null { color: #aaa; }
</style>