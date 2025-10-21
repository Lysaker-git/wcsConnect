<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/header.svelte';
	import Footer from '$lib/components/footer.svelte';

	const props = $props();
	let data: { user?: { id?: string; email?: string } | null } = props.data ?? {};
	let { children } = props;
</script>

<Header user={data?.user ?? null} />
{@render children()}
<Footer />
