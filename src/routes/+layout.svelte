<script lang="ts">
  import '../app.css';
  import Header from '$lib/components/header.svelte';
  import Footer from '$lib/components/footer.svelte';
  import CookieBanner from '$lib/components/CookieBanner.svelte';
  const props = $props();
  let data: { user?: { id?: string; email?: string } | null; statusBanner?: string | null } = props.data ?? {};
  let { children } = props;
</script>

<Header user={data?.user ?? null} />

{#if data.statusBanner}
  <div class="w-full bg-amber-800/90 text-amber-100 text-sm text-center px-4 py-2.5 font-medium tracking-wide">
    {data.statusBanner}
  </div>
{/if}

  {@render children()}
<Footer />
<CookieBanner />