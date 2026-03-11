<script>
  import JsonTree from '$lib/components/jsonTree.svelte';

  let results = null;
  let error = null;
  let loading = false;
  let wsdcId = "10074";

  async function testLookup() {
    loading = true;
    error = null;
    results = null;
    try {
      const response = await fetch(`/api/wsdc?num=${wsdcId}`);
      results = await response.json();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div style="font-family: monospace; padding: 1rem;">
  <input bind:value={wsdcId} placeholder="WSDC ID" />
  <button on:click={testLookup}>Lookup</button>

  {#if loading}<p>Loading...</p>{/if}
  {#if error}<pre style="color:red">{error}</pre>{/if}
  {#if results}
    <div style="margin-top: 1rem;">
      <JsonTree data={results} />
    </div>
  {/if}
</div>