<script lang="ts">
	import { goto } from '$app/navigation';
    // import QrCode from 'svelte-qrcode';

	export let data: {
		registrationID?: string;
		event?: { id: string; title: string };
		participant?: any;
		participantUsername?: string;
		participantProducts?: any[];
		total?: number;
		hasAccommodationProduct?: boolean;
	};
	console.log(data)
	const { registrationID, event, participant, participantUsername, participantProducts = [], total = 0, hasAccommodationProduct = false } = data;

	// Split products into pending (outstanding) and paid
	const pendingProducts = participantProducts.filter((p: any) => (p.payment_status ?? p.status ?? '').toLowerCase() !== 'paid');
	const paidProducts = participantProducts.filter((p: any) => (p.payment_status ?? p.status ?? '').toLowerCase() === 'paid');

	const outstandingTotal = pendingProducts.reduce((sum: number, item: any) => {
		const val = item?.subtotal ? parseFloat(item.subtotal.toString()) : 0;
		return sum + (isNaN(val) ? 0 : val);
	}, 0);

	function goBack() { goto('/profile'); }

	// Placeholder for Stripe checkout initiation — integrate server-side flow later
	async function payWithStripe() {
		if (!registrationID) return alert('Missing registration ID');
		// TODO: implement server-side Checkout Session creation and redirect here
		alert('Stripe checkout not implemented yet. This will start the Stripe flow for registration ' + registrationID);
		console.log('Would initiate Stripe checkout for', registrationID, { pendingProducts });
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12">
	<div class="max-w-2xl mx-auto px-6">
		<div class="text-center mb-12">
			<div class="flex justify-center mb-4">
				<div class="bg-indigo-100 rounded-full p-4">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</div>
			</div>
			<h1 class="text-4xl font-extrabold text-gray-900 mb-2">Registration Details</h1>
			<p class="text-lg text-gray-600">Complete summary of your registration</p>
		</div>

		<div class="bg-white rounded-3xl shadow-2xl overflow-hidden p-8 sm:p-10 border-t-8 border-indigo-500 mb-8">
			<h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">Registration Receipt</h2>

			<div class="space-y-6">
				<div class="border-b pb-4">
					<p class="text-sm text-gray-600 mb-1">Event</p>
					<p class="text-lg font-semibold text-gray-900">{event?.title || 'N/A'}</p>
				</div>

				<div class="border-b pb-4">
					<p class="text-sm text-gray-600 mb-1">Registration ID</p>
					<p class="text-lg font-semibold text-gray-900 break-all">{registrationID || 'N/A'}</p>
				</div>

				<div class="border-b pb-4">
					<p class="text-sm text-gray-600 mb-1">Participant Name</p>
					<p class="text-lg font-semibold text-gray-900">{participantUsername || 'N/A'}</p>
				</div>

				{#if participant?.partner_name}
					<div class="border-b pb-4">
						<p class="text-sm text-gray-600 mb-1">Partner Name</p>
						<p class="text-lg font-semibold text-gray-900">{participant.partner_name}</p>
					</div>
				{/if}

				<div class="border-b pb-4">
					<p class="text-sm text-gray-600 mb-1">Registration Status</p>
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-indigo-500 rounded-full"></div>
						<p class="text-lg font-semibold text-indigo-600">
							{participant?.status === 'pending_couples_registration' ? 'Pending Approval (Couples)' : (participant?.status ? participant.status : 'Pending Approval')}
						</p>
					</div>
				</div>

				{#if participantProducts.length > 0}

                    {#if participant.status !== 'approved'}
                        <div class="border-b pb-4">
                            <p class="text-sm text-gray-600 mb-3 font-semibold">Order Items</p>
                            <div class="space-y-2">
                                {#each participantProducts as product (product.id)}
                                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div class="flex-1">
                                            <p class="font-medium text-gray-800">{product.product_name}</p>
                                            <p class="text-sm text-gray-600">{product.product_type}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-sm text-gray-600">
                                                {product.quantity_ordered} × {parseFloat(product.unit_price).toFixed(2)} {product.currency_type}
                                            </p>
                                            <p class="font-semibold text-gray-800">
                                                {parseFloat(product.subtotal).toFixed(2)} {product.currency_type}
                                            </p>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}

					<!-- Outstanding / Paid sections -->
					{#if pendingProducts.length > 0 && participant.status === 'approved'}
						<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm text-gray-600 mb-1 font-semibold">Outstanding Balance</p>
									<p class="text-lg font-bold text-gray-800">{parseFloat(outstandingTotal.toString()).toFixed(2)} {pendingProducts[0]?.currency_type || 'EUR'}</p>
								</div>
								<div>
									{#if participant?.status === 'approved'}
										<button on:click={payWithStripe} class="px-4 py-2 bg-green-600 text-white rounded-md font-medium">Pay with Stripe</button>
									{/if}
								</div>
							</div>

							<div class="mt-4 space-y-2">
								{#each pendingProducts as p (p.id)}
									<div class="flex items-center justify-between p-3 bg-white rounded-lg">
										<div>
											<p class="font-medium text-gray-800">{p.product_name}</p>
											<p class="text-sm text-gray-600">{p.product_type}</p>
										</div>
										<div class="text-right">
											<p class="text-sm text-gray-600">{p.quantity_ordered} × {parseFloat(p.unit_price).toFixed(2)} {p.currency_type}</p>
											<p class="font-semibold text-gray-800">{parseFloat(p.subtotal).toFixed(2)} {p.currency_type}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if paidProducts.length > 0}
						<div class="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
							<p class="text-sm text-gray-600 mb-3 font-semibold">Paid Items</p>
							<div class="space-y-2">
								{#each paidProducts as p (p.id)}
									<div class="flex items-center justify-between p-3 bg-white rounded-lg">
										<div>
											<p class="font-medium text-gray-800">{p.product_name}</p>
											<p class="text-sm text-gray-600">{p.product_type}</p>
										</div>
										<div class="text-right">
											<p class="font-semibold text-gray-800">{parseFloat(p.subtotal).toFixed(2)} {p.currency_type}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<div class="flex items-center justify-between">
							<p class="text-lg font-semibold text-gray-800">Order Total</p>
							<p class="text-2xl font-bold text-blue-600">
								{parseFloat(total.toString()).toFixed(2)} {participantProducts[0]?.currency_type || 'EUR'}
							</p>
						</div>
					</div>
				{/if}

				<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<p class="text-sm text-gray-600 mb-2">What happens next?</p>
					<ul class="space-y-2 text-gray-700">
						<li class="flex items-start gap-2">
							<span class="text-blue-600 font-bold mt-0.5">•</span>
							<span>Your registration is pending approval from the event organizers</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-blue-600 font-bold mt-0.5">•</span>
							<span>You will receive a confirmation email once your registration is approved</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-blue-600 font-bold mt-0.5">•</span>
							<span>A separate payment portal will be available once approved</span>
						</li>
					</ul>
				</div>
			</div>

			<div class="mt-8 space-y-3 sm:flex sm:gap-4 sm:space-y-0">
				<button 
					on:click={goBack}
					class="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-300 text-center"
				>
					Back to Profile
				</button>
				<button 
					on:click={() => window.print()}
					class="flex-1 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition duration-300 text-center"
				>
					Print Confirmation
				</button>
			</div>

			{#if hasAccommodationProduct}
				<div class="mt-6 flex justify-start">
					<a href={`/profile/${registrationID}/accommodation`} class="inline-block px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow hover:bg-blue-600 transition">
						Book Event Hotel
					</a>
				</div>
			{/if}
		</div>

		<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
			<p class="text-sm text-gray-600 mb-1">Need Help?</p>
			<p class="text-gray-700">Please contact the event organizers if you have any questions about your registration</p>
		</div>
	</div>
</div>

<style>
	@media print {
		.bg-gradient-to-br {
			background: white;
		}
		button {
			display: none;
		}
		.bg-yellow-50 {
			display: none;
		}
	}
</style>
