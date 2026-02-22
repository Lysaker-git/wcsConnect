<script lang="ts">
  import { enhance } from '$app/forms';

  export let data: { profiles: any[] };

  const AVAILABLE_ROLES = ['Owner', 'Super User', 'member'];

  let search = '';
  let successMessage = '';

  $: filtered = data.profiles.filter(p =>
    !search ||
    p.username?.toLowerCase().includes(search.toLowerCase())
  );

  function hasRole(profile: any, role: string): boolean {
    return (profile.userRole ?? []).includes(role);
  }

  function getRoleBadgeColor(role: string): string {
    if (role === 'Owner') return 'bg-stone-800 text-stone-100';
    if (role === 'Super User') return 'bg-stone-700 text-stone-100';
    return 'bg-stone-500 text-stone-100';
  }
</script>

<div class="max-w-5xl mx-auto py-10 px-6">
  <div class="mb-8">
    <a href="/admin" class="text-sm text-indigo-200 hover:underline">← Back to admin</a>
    <h1 class="text-3xl font-bold text-stone-300 mt-2">User Management</h1>
    <p class="text-stone-400 text-sm mt-1">Manage user roles across the platform.</p>
  </div>

  {#if successMessage}
    <div class="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
      {successMessage}
    </div>
  {/if}

  <!-- Search -->
  <div class="mb-6">
    <input
      type="text"
      bind:value={search}
      placeholder="Search by username..."
      class="w-full max-w-sm px-4 py-2 border border-stone-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-stone-800 text-stone-100"
    />
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-3 gap-4 mb-8">
    <div class="p-4 neomorph-card">
      <p class="text-xs text-stone-400 uppercase">Total Users</p>
      <p class="text-2xl font-bold text-stone-200">{data.profiles.length}</p>
    </div>
    <div class="p-4 neomorph-card">
      <p class="text-xs text-stone-400 uppercase">Super Users</p>
      <p class="text-2xl font-bold text-stone-200">
        {data.profiles.filter(p => hasRole(p, 'Super User')).length}
      </p>
    </div>
    <div class="p-4 neomorph-card">
      <p class="text-xs text-stone-400 uppercase">Stripe Connected</p>
      <p class="text-2xl font-bold text-stone-200">
        {data.profiles.filter(p => p.stripe_onboarding_complete).length}
      </p>
    </div>
  </div>

  <!-- User table -->
  <div class="overflow-hidden neomorph-card">
    <table class="w-full text-sm">
      <thead class="bg-stone-800 text-stone-200 uppercase text-xs">
        <tr>
          <th class="px-6 py-3 text-left">User</th>
          <th class="px-6 py-3 text-left">Current Roles</th>
          <th class="px-6 py-3 text-left">Stripe</th>
          <th class="px-6 py-3 text-right">Update Role</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-stone-700">
        {#each filtered as profile (profile.id)}
          <tr class="hover:bg-stone-800 transition-colors">
            <!-- User info -->
            <td class="px-6 py-4">
              <p class="font-medium text-stone-200">{profile.username ?? 'No username'}</p>
              <p class="text-xs text-stone-400">{profile.country ?? ''}</p>
              <p class="text-xs text-stone-300">{profile.id}</p>
            </td>

            <!-- Current roles -->
            <td class="px-6 py-4">
              <div class="flex flex-wrap gap-1">
                {#each (profile.userRole ?? ['member']) as role}
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium {getRoleBadgeColor(role)}">
                    {role}
                  </span>
                {/each}
              </div>
            </td>

            <!-- Stripe status -->
            <td class="px-6 py-4">
              {#if profile.stripe_onboarding_complete}
                <span class="text-green-200 text-xs font-medium">✅ Connected</span>
              {:else if profile.stripe_account_id}
                <span class="text-yellow-200 text-xs font-medium">⏳ Incomplete</span>
              {:else}
                <span class="text-stone-400 text-xs">—</span>
              {/if}
            </td>

            <!-- Role update form -->
            <td class="px-6 py-4">
              <form
                method="POST"
                action="?/updateRole"
                use:enhance={() => {
                  return async ({ result, update }) => {
                    if (result.type === 'success') {
                      successMessage = `Updated roles for ${profile.username}`;
                      setTimeout(() => successMessage = '', 3000);
                    }
                    await update();
                  };
                }}
                class="flex flex-col items-end gap-2"
              >
                <input type="hidden" name="profile_id" value={profile.id} />

                <div class="flex flex-col gap-1">
                  {#each AVAILABLE_ROLES.filter(r => r !== 'member') as role}
                    <label class="flex items-center gap-2 text-xs text-stone-400 cursor-pointer">
                      <input
                        type="checkbox"
                        name="roles"
                        value={role}
                        checked={hasRole(profile, role)}
                        class="rounded border-stone-300 checked:bg-stone-800"
                      />
                      {role}
                    </label>
                  {/each}
                </div>

                <button
                  type="submit"
                  class="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition duration-300"
                >
                  Save
                </button>
              </form>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="4" class="px-6 py-8 text-center text-stone-400">No users found</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
    .neomorph-card {
    box-shadow:
      5px 5px 18px rgba(2,6,23,0.5),
      -5px -5px 12px rgba(255,255,255,0.08);
    border-radius: 1.25rem;
    border: none;
    border: 2px solid rgba(255,255,255,0.02);
  }
</style>