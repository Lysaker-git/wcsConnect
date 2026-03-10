<script lang="ts">
  import { page } from '$app/stores';

  export let data: { userRoles: string[] };

  const eventLinks = [
    { href: '/admin/events',      label: 'Events',      icon: '📅' },
    { href: '/admin/mail',        label: 'Mail',        icon: '✉️' },
    { href: '/admin/competition', label: 'Competition', icon: '🏆' },
  ];

  const adminLinks = [
    { href: '/admin/users',     label: 'Users',    icon: '👥' },
    { href: '/admin/settings',  label: 'Settings', icon: '⚙️' },
  ];

  $: currentPath = $page.url.pathname;
  $: isAdminUser = (data.userRoles ?? []).some(r => ['Super User', 'Owner'].includes(r));

  let sidebarOpen = false;

  function closeNav() {
    sidebarOpen = false;
  }
</script>

<div class="min-h-screen bg-stone-900 flex relative">

  <!-- Mobile backdrop -->
  {#if sidebarOpen}
    <button
      type="button"
      class="lg:hidden fixed inset-0 z-40 bg-black/50"
      aria-label="Close menu"
      on:click={closeNav}
    />
  {/if}

  <!-- Sidebar -->
  <aside class="
    shrink-0 flex flex-col
    bg-gradient-to-b from-stone-900 via-stone-800 to-stone-950
    [box-shadow:4px_0_16px_-2px_rgba(0,0,0,0.4)]
    transition-transform duration-200
    fixed lg:static top-0 bottom-0 left-0 z-50
    w-56
    {sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
  ">
    <div class="p-5 border-b border-stone-700 flex items-center justify-between">
      <a href="/admin" on:click={closeNav} class="text-xs font-semibold tracking-widest uppercase text-stone-500 hover:text-stone-300 transition">
        Admin
      </a>
      <!-- Close button (mobile only) -->
      <button type="button" class="lg:hidden text-stone-500 hover:text-stone-300 p-1" aria-label="Close sidebar" on:click={closeNav}>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <nav class="flex flex-col gap-5 p-3 flex-1 pt-4">

      <!-- Event Actions -->
      <div>
        <p class="px-3 mb-1.5 text-[10px] font-semibold tracking-widest uppercase text-stone-600">Event Actions</p>
        <div class="flex flex-col gap-1">
          {#each eventLinks as link}
            <a
              href={link.href}
              on:click={closeNav}
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition {currentPath === link.href || currentPath.startsWith(link.href + '/')
                ? 'bg-stone-700 text-stone-100'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-700/50'}"
            >
              <span class="text-base leading-none">{link.icon}</span>
              {link.label}
            </a>
          {/each}
        </div>
      </div>

      <!-- Admin Actions (Super User / Owner only) -->
      {#if isAdminUser}
        <div>
          <p class="px-3 mb-1.5 text-[10px] font-semibold tracking-widest uppercase text-stone-600">Admin Actions</p>
          <div class="flex flex-col gap-1">
            {#each adminLinks as link}
              <a
                href={link.href}
                on:click={closeNav}
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition {currentPath === link.href || currentPath.startsWith(link.href + '/')
                  ? 'bg-stone-700 text-stone-100'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-700/50'}"
              >
                <span class="text-base leading-none">{link.icon}</span>
                {link.label}
              </a>
            {/each}
          </div>
        </div>
      {/if}

    </nav>
  </aside>

  <!-- Mobile toggle tab (left edge, only when sidebar is closed) -->
  {#if !sidebarOpen}
    <button
      type="button"
      class="lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-50
             bg-stone-700 hover:bg-stone-600 text-stone-300
             rounded-r-xl px-1 py-4 shadow-lg transition"
      aria-label="Open admin menu"
      on:click={() => sidebarOpen = true}
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  {/if}

  <!-- Content -->
  <main class="flex-1 min-w-0 p-6 lg:p-8">
    <slot />
  </main>

</div>
