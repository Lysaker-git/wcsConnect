    <script>
        export let profile;
    </script>
    
    <section class="mb-8 p-6 rounded-lg bg-white shadow">
      <div class="flex items-center gap-4">
        <img src={profile?.avatar_url} alt="avatar" class="w-16 h-16 rounded-full object-cover" />
        <div>
          <h2 class="text-2xl font-bold mb-1">{profile?.username ?? user.email}</h2>
          <p class="text-sm text-gray-500">{profile?.role ?? 'follower'}</p>
          {#if profile?.userRole && profile.userRole.length}
            <div class="mt-2 flex flex-wrap gap-2">
              {#each profile.userRole as r}
                <span class="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full border">{r}</span>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </section>