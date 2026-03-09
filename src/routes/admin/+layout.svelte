<script lang="ts">
  import { page } from '$app/stores';

  const navLinks = [
    { href: '/admin/events',      label: 'Events',      icon: '📅' },
    { href: '/admin/users',       label: 'Users',       icon: '👥' },
    { href: '/admin/mail',        label: 'Mail',        icon: '✉️' },
    { href: '/admin/competition', label: 'Competition', icon: '🏆' },
  ];

  $: currentPath = $page.url.pathname;

  function isActive(href: string): boolean {
    if (href === '/admin') return currentPath === '/admin';
    return currentPath.startsWith(href);
  }
</script>

<div class="min-h-screen bg-stone-900 flex">

  <!-- Sidebar -->
  <aside class="w-56 shrink-0  flex flex-col bg-gradient-to-b from-stone-900 via-stone-800/50 to-stone-950 [box-shadow:4px_0_16px_-2px_rgba(0,0,0,0.4)]">
    <div class="p-5 border-b border-stone-700">
      <a href="/admin" class="text-xs font-semibold tracking-widest uppercase text-stone-500 hover:text-stone-300 transition">
        Admin
      </a>
    </div>

    <nav class="flex flex-col gap-1 p-3 flex-1">
      {#each navLinks as link}
        <a
          href={link.href}
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition {isActive(link.href)
            ? 'bg-stone-700 text-stone-100'
            : 'text-stone-400 hover:text-stone-200 hover:bg-stone-700/50'}"
        >
          <span class="text-base leading-none">{link.icon}</span>
          {link.label}
        </a>
      {/each}
    </nav>
  </aside>

  <!-- Content -->
  <main class="flex-1 min-w-0 p-8">
    <slot />
  </main>

</div>
