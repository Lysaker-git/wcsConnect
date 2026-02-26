<script lang="ts">
  import { page } from '$app/stores';

  const errorConfig: Record<number, { emoji: string; title: string; description: string; suggestion: string }> = {
    401: {
      emoji: '🔐',
      title: 'Not authenticated',
      description: 'You need to be signed in to access this page.',
      suggestion: 'Sign in to continue'
    },
    403: {
      emoji: '🚫',
      title: 'Access denied',
      description: "You don't have permission to view this page.",
      suggestion: 'Go back to safety'
    },
    404: {
      emoji: '🕳️',
      title: 'Page not found',
      description: "The page you're looking for doesn't exist or has been moved.",
      suggestion: 'Go back to safety'
    },
    429: {
      emoji: '⏱️',
      title: 'Too many requests',
      description: "You've made too many requests. Please wait a moment before trying again.",
      suggestion: 'Try again later'
    },
    500: {
      emoji: '⚙️',
      title: 'Server error',
      description: 'Something went wrong on our end. This has been noted and we\'re looking into it.',
      suggestion: 'Go back to safety'
    },
    503: {
      emoji: '🔧',
      title: 'Service unavailable',
      description: 'The service is temporarily unavailable. Please try again in a few minutes.',
      suggestion: 'Try again later'
    }
  };

  $: status = $page.status;
  $: message = $page.error?.message ?? 'An unexpected error occurred';
  $: config = errorConfig[status] ?? {
    emoji: '❓',
    title: 'Something went wrong',
    description: message,
    suggestion: 'Go back to safety'
  };

  $: isAuthError = status === 401;
</script>

<svelte:head>
  <title>{status} — {config.title} · DancePoint</title>
</svelte:head>

<div class="min-h-screen bg-stone-900 flex items-center justify-center px-6 py-16">
  <div class="w-full max-w-lg">

    <!-- Decorative top bar -->
    <div class="h-1 w-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 rounded-full mb-12 opacity-60"></div>

    <div class="text-center">

      <!-- Emoji -->
      <div class="text-7xl mb-6 select-none" role="img" aria-label={config.title}>
        {config.emoji}
      </div>

      <!-- Status code badge -->
      <div class="inline-flex items-center gap-2 px-3 py-1 bg-stone-800 border border-stone-700 rounded-full mb-6">
        <span class="w-2 h-2 rounded-full {status >= 500 ? 'bg-red-500' : status >= 400 ? 'bg-amber-500' : 'bg-blue-500'} animate-pulse"></span>
        <span class="text-xs font-mono text-stone-400">Error {status}</span>
      </div>

      <!-- Title -->
      <h1 class="text-3xl font-extrabold text-stone-100 mb-3 tracking-tight">
        {config.title}
      </h1>

      <!-- Description -->
      <p class="text-stone-400 text-base leading-relaxed mb-3">
        {config.description}
      </p>

      <!-- Technical message (only if different from description) -->
      {#if message && message !== config.description}
        <div class="mt-4 mb-6 p-3 bg-stone-800 border border-stone-700 rounded-xl text-left">
          <p class="text-xs font-mono text-stone-500 leading-relaxed break-all">{message}</p>
        </div>
      {/if}

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
        {#if isAuthError}
          <a href="/signin"
            class="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition text-sm">
            Sign in
          </a>
          <a href="/"
            class="w-full sm:w-auto px-6 py-3 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-100 font-semibold rounded-xl transition text-sm">
            Go home
          </a>
        {:else}
          <button on:click={() => history.back()}
            class="w-full sm:w-auto px-6 py-3 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-100 font-semibold rounded-xl transition text-sm">
            ← Go back
          </button>
          <a href="/"
            class="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition text-sm">
            {config.suggestion}
          </a>
        {/if}
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-16 text-center">
      <p class="text-xs text-stone-600">
        DancePoint · <a href="mailto:events@dancepoint.no" class="hover:text-stone-400 transition">events@dancepoint.no</a>
      </p>
    </div>

    <!-- Decorative bottom bar -->
    <div class="h-px w-full bg-gradient-to-r from-transparent via-stone-700 to-transparent mt-8"></div>

  </div>
</div>