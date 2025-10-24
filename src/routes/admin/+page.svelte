<script lang="ts">
  export let data: { profiles?: any[] };
  let profiles = data?.profiles ?? [];

  // available roles
  const ALL_ROLES = ['Owner','Super User','Event director','Local Teacher','Dancer','Scorer'];

  // local editable state: map id -> Set of roles
  let roleMap: Record<string, string[]> = {};
  for (const p of profiles) {
    roleMap[p.id] = Array.isArray(p.roles) ? p.roles : [];
  }

  async function saveRoles(id: string) {
    const roles = roleMap[id] ?? [];
    try {
      const res = await fetch('/api/admin/set-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: id, roles })
      });
      const json = await res.json();
      if (!res.ok) throw json;
      alert('Roles updated');
    } catch (err) {
      console.error('Failed to update roles', err);
      alert('Failed to update roles: ' + (err?.error ?? JSON.stringify(err)));
    }
  }
</script>

<div class="p-6 max-w-5xl mx-auto">
  <h1 class="text-2xl font-bold mb-4">Admin — Manage Roles</h1>
  {#if !profiles || profiles.length === 0}
    <p>No profiles found.</p>
  {:else}
    <table class="w-full table-auto border-collapse">
      <thead>
        <tr class="text-left border-b">
          <th class="p-2">Name / Email</th>
          <th class="p-2">Roles</th>
          <th class="p-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each profiles as p}
          <tr class="border-b">
            <td class="p-2">
              <div class="font-medium">{p.username ?? p.email ?? p.id}</div>
              <div class="text-sm text-gray-500">{p.email ?? ''}</div>
            </td>
            <td class="p-2">
              <div class="flex flex-wrap gap-2">
                {#each ALL_ROLES as r}
                  <label class="inline-flex items-center gap-2 bg-gray-100 px-2 py-1 rounded">
                    <input type="checkbox" on:change={(e) => {
                      const checked = (e.currentTarget as HTMLInputElement).checked;
                      const arr = roleMap[p.id] ?? [];
                      if (checked) {
                        if (!arr.includes(r)) arr.push(r);
                      } else {
                        roleMap[p.id] = arr.filter(x => x !== r);
                      }
                    }} checked={(roleMap[p.id] ?? []).includes(r)} />
                    <span class="text-sm">{r}</span>
                  </label>
                {/each}
              </div>
            </td>
            <td class="p-2">
              <button class="px-3 py-1 bg-blue-600 text-white rounded" on:click={() => saveRoles(p.id)}>Save</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
