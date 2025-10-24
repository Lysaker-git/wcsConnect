<script lang="ts">
  // `user` can be null (not signed in) or an object { id, username, avatarUrl }
  export let user: { id?: string; username?: string; avatarUrl?: string } | null = null;
  let mobileOpen = false;

  const navLinks = [
    { title: 'Events', href: '/events' },
    { title: 'Local Classes', href: '/classes' },
    { title: 'Competition', href: '/competition' },
    { title: 'Learning Portal', href: '/wcs-education' },
    { title: 'About', href: '/about' }
  ];

  import { invalidate } from '$app/navigation';

  async function logout() {
    try {
      const res = await fetch('/api/auth/signout', { method: 'POST' });
      if (res.ok) {
        // invalidate root so +layout.server.ts reloads and header gets updated user
        await invalidate('/');
      } else {
        console.error('Logout failed', await res.text());
      }
    } catch (err) {
      console.error('Logout error', err);
    }
  }
</script>

<header class="w-full bg-white/60 backdrop-blur-md border-b border-gray-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <a href="/" class="flex items-center gap-3 text-gray-900">
        <svg class="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 p-1 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="1" y="1" width="22" height="22" rx="5" fill="currentColor" opacity="0.12" />
          <path d="M6 12c1.333-2.667 4-4 6-4s4.667 1.333 6 4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="12" cy="12" r="2.4" fill="white" />
        </svg>
        <div class="leading-none">
          <div class="text-lg font-bold">WCS Connect</div>
          <div class="text-xs text-gray-500">Where WCS comes together</div>
        </div>
      </a>

      <!-- Desktop nav -->
      <nav class="hidden md:flex md:items-center md:space-x-4">
        {#each navLinks as link}
          <a href={link.href} class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">{link.title}</a>
        {/each}
      </nav>

      <!-- Right side (auth) + mobile toggle -->
      <div class="flex items-center gap-4">
        {#if user}
          <div class="inline-flex items-center gap-2">
            <a href="/profile" class="inline-flex items-center gap-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md">
            <!-- profile svg icon -->
            <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M4 20c0-3.314 2.686-6 6-6h4c3.314 0 6 2.686 6 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="hidden sm:inline">My Profile</span>
            </a>

            <!-- logout icon-only button -->
            <button on:click={logout} aria-label="Sign out" title="Sign out" class="ml-2 inline-flex items-center justify-center w-9 h-9 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M16 17l5-5-5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M21 12H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M9 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        {:else}
          <a href="/signup" class="text-sm font-medium text-gray-700 border border-gray-200 bg-white px-3 py-2 rounded-md hover:bg-gray-50">Sign Up</a>
          <a href="/profile" class="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md">Sign In</a>
        {/if}

        <!-- Mobile menu button -->
        <button class="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100" aria-label="Toggle menu" on:click={() => mobileOpen = !mobileOpen}>
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {#if !mobileOpen}
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            {:else}
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            {/if}
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile nav -->
    {#if mobileOpen}
      <div class="md:hidden mt-2 pb-4 border-t border-gray-100">
        <div class="flex flex-col px-1 space-y-1">
          {#each navLinks as link}
            <a href={link.href} class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">{link.title}</a>
          {/each}
          <div class="mt-2 px-3">
            {#if user}
              <a href="/profile" class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">My Profile</a>
              <button on:click={logout} class="mt-1 w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">Sign out</button>
            {:else}
              <a href="/signup" class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">Sign Up</a>
              <a href="/profile" class="mt-1 block px-3 py-2 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700">Sign In</a>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
</header>
