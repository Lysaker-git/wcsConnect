<script lang="ts">
  export let data: { users?: any[] };
  let users = data?.users ?? [];
  console.log('Admin Users Page - users:', users);

  const ALL_ROLES = ['Owner','Super User','Event director','Local Teacher','Dancer','Scorer'];

  // local editable copy of roles
  let rolesMap: Record<string, string[]> = {};
  for (const u of users) {
    // userRole column is jsonb; normalize to array
    const r = u.userRole ?? u.roles ?? [];
    rolesMap[u.id] = Array.isArray(r) ? r : [];
  }

  async function save(id: string) {
    const roles = rolesMap[id] ?? [];
    try {
      const res = await fetch('/api/admin/set-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: id, roles })
      });
      const json = await res.json();
      if (!res.ok) throw json;
      alert('Saved');
    } catch (err) {
      console.error(err);
      alert('Save failed');
    }
  }
</script>

<div>
  <h2 class="text-xl font-semibold mb-4">Users</h2>
  <table class="w-full border-collapse">
    <thead>
      <tr class="border-b">
        <th class="p-2 text-left">User ID</th>
        <th class="p-2 text-left">Name</th>
        <th class="p-2 text-left">Roles</th>
      </tr>
    </thead>
    <tbody>
      {#each users as u}
        <tr class="border-b">
          <td class="p-2 text-sm">{u.id}</td>
          <td class="p-2">{u.username ?? u.email ?? '—'}</td>
          <td class="p-2">
            <div class="flex flex-wrap gap-2">
              {#each ALL_ROLES as r}
                <label class="inline-flex items-center gap-2 bg-gray-100 px-2 py-1 rounded">
                  <input type="checkbox" checked={(rolesMap[u.id] ?? []).includes(r)} on:change={(e) => {
                    const checked = (e.currentTarget as HTMLInputElement).checked;
                    const arr = rolesMap[u.id] ?? [];
                    if (checked) {
                      if (!arr.includes(r)) arr.push(r);
                    } else {
                      rolesMap[u.id] = arr.filter(x => x !== r);
                    }
                  }} />
                  <span class="text-sm">{r}</span>
                </label>
              {/each}
            </div>
            <div class="mt-2">
              <button class="px-3 py-1 bg-blue-600 text-white rounded" on:click={() => save(u.id)}>Save</button>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
