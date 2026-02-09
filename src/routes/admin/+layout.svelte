<script lang="ts">
  // simple admin layout with internal navigation
</script>

<div class="min-h-screen bg-gray-50">
  <nav class="bg-white border-b">
    <div class="max-w-5xl mx-auto px-4 py-3 flex gap-4">
      <a href="/admin/events" class="text-sm font-medium text-gray-600">Events</a>
    </div>
  </nav>

  <main class="max-w-5xl mx-auto p-6">
    <slot />
  </main>
</div>
