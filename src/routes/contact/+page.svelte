
<script lang="ts">
	import { enhance } from '$app/forms';

	export let form: { success?: boolean; message?: string; detail?: string } | null = null;
	let isSubmitting = false;
	let successMessage = '';

	function onEnhance() {
		isSubmitting = true;
		return async ({ update }: any) => {
			await update();
			isSubmitting = false;
			if (form?.success) successMessage = 'Message sent — thank you!';
		};
	}
</script>

<div class="min-h-screen bg-stone-900 py-10 px-6">
	<div class="max-w-2xl mx-auto">
		<div class="neomorph-card bg-stone-800 rounded-2xl p-8 text-stone-100">
			<h1 class="text-2xl font-bold mb-2">Contact</h1>
			<p class="text-stone-400 text-sm mb-6">Have a question or feedback? Send us a message and we'll get back to you.</p>

			{#if successMessage}
				<div class="mb-4 p-3 bg-green-900/30 border border-green-700 text-green-300 rounded-lg text-sm">
					{successMessage}
				</div>
			{/if}

			{#if form?.message}
				<div class="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg text-sm">
					{form.message} {#if form.detail}<div class="text-xs text-stone-400 mt-1">{form.detail}</div>{/if}
				</div>
			{/if}

			<form method="POST" use:enhance={onEnhance} class="space-y-4">
				<div>
					<label class="block text-sm text-stone-300 mb-1">Your name</label>
					<input name="name" required class="w-full px-4 py-3 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none" />
				</div>

				<div>
					<label class="block text-sm text-stone-300 mb-1">Your email</label>
					<input name="email" type="email" required class="w-full px-4 py-3 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none" />
				</div>

				<div>
					<label class="block text-sm text-stone-300 mb-1">Message</label>
					<textarea name="message" rows="6" required class="w-full px-4 py-3 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none"></textarea>
				</div>

				<div class="flex justify-end">
					<button type="submit" class="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl disabled:opacity-50" disabled={isSubmitting}>
						{isSubmitting ? 'Sending…' : 'Send message'}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>

<style>
	.neomorph-card {
		box-shadow:
			8px 8px 24px rgba(2, 6, 23, 0.6),
			-8px -8px 18px rgba(255, 255, 255, 0.03);
	}
</style>

