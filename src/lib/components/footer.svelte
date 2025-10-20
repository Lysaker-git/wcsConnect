<script lang="ts">
  const year = new Date().getFullYear();
  // Sitemap derived from current routes (admin intentionally excluded)
  const sitemap = [
    { title: 'Home', href: '/' },
    { title: 'Events', href: '/events' },
    { title: 'Competition', href: '/competition' },
    { title: 'Education', href: '/education' },
    { title: 'About', href: '/about' }
  ];
</script>

<footer class="w-full bg-gray-50 border-t border-gray-200 text-gray-700">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-8">
      <div class="flex items-start gap-3">
        <svg class="w-10 h-10 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <rect x="1" y="1" width="22" height="22" rx="5" fill="currentColor" opacity="0.08" />
          <path d="M6 12c1.333-2.667 4-4 6-4s4.667 1.333 6 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="12" cy="12" r="2.4" fill="currentColor" />
        </svg>
        <div>
          <div class="text-lg font-semibold text-gray-900">LysakerWCS</div>
          <div class="text-sm text-gray-500">West Coast Swing events & learning</div>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-6">
        <div>
          <h4 class="text-sm font-semibold text-gray-900 mb-3">Sitemap</h4>
          <ul class="space-y-2">
            {#each sitemap as link}
              <li>
                <a href={link.href} class="text-sm text-gray-600 hover:text-blue-600">{link.title}</a>
              </li>
            {/each}
          </ul>
        </div>

        <div>
          <h4 class="text-sm font-semibold text-gray-900 mb-3">Resources</h4>
          <ul class="space-y-2 text-sm text-gray-600">
            <li><a href="/about" class="hover:text-blue-600">About the project</a></li>
            <li><a href="/login" class="hover:text-blue-600">Sign in</a></li>
            <li><a href="/contact" class="hover:text-blue-600">Contact</a></li>
          </ul>
        </div>

        <div>
          <h4 class="text-sm font-semibold text-gray-900 mb-3">Legal</h4>
          <ul class="space-y-2 text-sm text-gray-600">
            <li><a href="/terms" class="hover:text-blue-600">Terms</a></li>
            <li><a href="/privacy" class="hover:text-blue-600">Privacy</a></li>
          </ul>
        </div>
      </div>
    </div>

    <div class="mt-8 border-t border-gray-100 pt-6 text-sm text-gray-500 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
      <div>© {year} LysakerWCS. All rights reserved.</div>
      <div class="text-gray-400">Built with ❤️ for the WCS community.</div>
    </div>
  </div>
</footer>
