<script lang="ts">
	import { goto } from '$app/navigation';

	export let data: {
		registrationID?: string;
		event?: { id: string; title: string };
		participant?: any;
		participantUsername?: string;
		participantProducts?: any[];
		total?: number;
		hasAccommodationProduct?: boolean;
		stripe_fee_model?: string;
	};

	const { 
		registrationID, 
		event, 
		participant, 
		participantUsername, 
		participantProducts = [], 
		total = 0, 
		hasAccommodationProduct = false,
		stripe_fee_model = 'on_top'
	} = data;

	const pendingProducts = participantProducts.filter((p: any) => (p.payment_status ?? p.status ?? '').toLowerCase() !== 'paid');
	const paidProducts = participantProducts.filter((p: any) => (p.payment_status ?? p.status ?? '').toLowerCase() === 'paid');

	const outstandingTotal = pendingProducts.reduce((sum: number, item: any) => {
		const val = item?.subtotal ? parseFloat(item.subtotal.toString()) : 0;
		return sum + (isNaN(val) ? 0 : val);
	}, 0);

	const paidTotal = paidProducts.reduce((sum: number, item: any) => {
		const val = item?.subtotal ? parseFloat(item.subtotal.toString()) : 0;
		return sum + (isNaN(val) ? 0 : val);
	}, 0);

	const serviceFee = outstandingTotal * 0.01;
	const stripeFee = stripe_fee_model === 'on_top' ? outstandingTotal * 0.035 : 0;
	const chargeTotal = outstandingTotal + serviceFee + stripeFee;

	const receiptDate = new Date().toLocaleDateString('en-GB', {
		day: '2-digit', month: 'long', year: 'numeric'
	});

	const currencyType = participantProducts[0]?.currency_type || 'EUR';

	function goBack() { goto('/profile'); }

	function printReceipt() {
		window.print();
	}

	async function payWithStripe() {
		if (!registrationID) return alert('Missing registration ID');
		try {
			const res = await fetch('/api/stripe/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ participant_id: registrationID })
			});
			const data = await res.json();
			if (!res.ok) {
				alert(data.error ?? 'Something went wrong starting checkout');
				return;
			}
			window.location.href = data.url;
		} catch (e) {
			alert('Network error, please try again');
		}
	}
</script>

<!-- ═══════════════════════════════════════════════
     PRINT-ONLY RECEIPT (hidden on screen)
════════════════════════════════════════════════ -->
<div class="print-receipt" aria-hidden="true">
	<div class="receipt-header">
		<div class="receipt-logo-area">
			<!-- Replace with your actual logo if available -->
			<div class="receipt-logo-text">{event?.title || 'Event'}</div>
		</div>
		<div class="receipt-meta">
			<h1>Payment Receipt</h1>
			<table class="receipt-meta-table">
				<tbody>
					<tr>
						<td>Receipt No.</td>
						<td><strong>{registrationID || 'N/A'}</strong></td>
					</tr>
					<tr>
						<td>Date Issued</td>
						<td><strong>{receiptDate}</strong></td>
					</tr>
					<tr>
						<td>Status</td>
						<td><strong>PAID</strong></td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<div class="receipt-divider"></div>

	<div class="receipt-parties">
		<div class="receipt-party">
			<p class="receipt-party-label">Issued To</p>
			<p class="receipt-party-name">{participantUsername || 'N/A'}</p>
			{#if participant?.partner_name}
				<p class="receipt-party-sub">Partner: {participant.partner_name}</p>
			{/if}
		</div>
		<div class="receipt-party receipt-party-right">
			<p class="receipt-party-label">Event</p>
			<p class="receipt-party-name">{event?.title || 'N/A'}</p>
			<p class="receipt-party-sub">Registration ID: {registrationID || 'N/A'}</p>
		</div>
	</div>

	<div class="receipt-divider"></div>

	<!-- Line items — paid products only for accounting receipt -->
	<table class="receipt-items">
		<thead>
			<tr>
				<th class="col-desc">Description</th>
				<th class="col-type">Type</th>
				<th class="col-qty">Qty</th>
				<th class="col-unit">Unit Price</th>
				<th class="col-total">Amount</th>
			</tr>
		</thead>
		<tbody>
			{#each paidProducts as p (p.id)}
				<tr>
					<td>{p.product_name}</td>
					<td>{p.product_type}</td>
					<td class="center">{p.quantity_ordered}</td>
					<td class="right">{parseFloat(p.unit_price).toFixed(2)} {p.currency_type}</td>
					<td class="right">{parseFloat(p.subtotal).toFixed(2)} {p.currency_type}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<div class="receipt-totals">
		<table>
			<tbody>
				<tr>
					<td>Subtotal</td>
					<td class="right">{paidTotal.toFixed(2)} {currencyType}</td>
				</tr>
				<tr>
					<td>Service Fee (1%)</td>
					<td class="right">{(paidTotal * 0.01).toFixed(2)} {currencyType}</td>
				</tr>
				<tr class="total-row">
					<td>Total Paid</td>
					<td class="right">{(paidTotal + paidTotal * 0.01).toFixed(2)} {currencyType}</td>
				</tr>
			</tbody>
		</table>
	</div>

	<div class="receipt-divider"></div>

	<div class="receipt-footer">
		<p>This receipt is issued for services rendered at the above event. It is valid as a supporting document for expense reimbursement and accounting purposes.</p>
		<p class="receipt-footer-small">Generated on {receiptDate} · Registration #{registrationID}</p>
	</div>
</div>

<!-- ═══════════════════════════════════════════════
     SCREEN UI (hidden on print)
════════════════════════════════════════════════ -->
<div class="screen-only min-h-screen bg-stone-950/90 py-12">
	<div class="max-w-2xl mx-auto px-6">
		<div class="text-center mb-12">
			<div class="flex justify-center mb-4">
				<div class="bg-stone-700 rounded-full p-4 neomorph-card">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-stone-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</div>
			</div>
			<h1 class="text-4xl font-extrabold text-stone-300 mb-2">Registration Details</h1>
			<p class="text-lg text-stone-400">Complete summary of your registration</p>
		</div>

		<div class="bg-stone-800 rounded-3xl shadow-2xl overflow-hidden p-8 sm:p-10 border-t-8 mb-8 neomorph-card">
			<h2 class="text-2xl font-bold text-stone-300 mb-6 text-center">Registration Receipt</h2>

			<div class="space-y-6">
				<div class="border-b border-stone-700 pb-4">
					<p class="text-sm text-stone-400 mb-1">Event</p>
					<p class="text-lg font-semibold text-stone-300">{event?.title || 'N/A'}</p>
				</div>

				<div class="border-b border-stone-700 pb-4">
					<p class="text-sm text-stone-400 mb-1">Registration ID</p>
					<p class="text-lg font-semibold text-stone-300 break-all">{registrationID || 'N/A'}</p>
				</div>

				<div class="border-b border-stone-700 pb-4">
					<p class="text-sm text-stone-400 mb-1">Participant Name</p>
					<p class="text-lg font-semibold text-stone-300">{participantUsername || 'N/A'}</p>
				</div>

				{#if participant?.partner_name}
					<div class="border-b border-stone-700 pb-4">
						<p class="text-sm text-stone-400 mb-1">Partner Name</p>
						<p class="text-lg font-semibold text-stone-300">{participant.partner_name}</p>
					</div>
				{/if}

				<div class="pb-4">
					<p class="text-sm text-stone-400 mb-1">Registration Status</p>
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-amber-500 rounded-full"></div>
						<p class="text-lg font-semibold text-amber-500">
							{participant?.status === 'pending_couples_registration' ? 'Pending Approval (Couples)' : (participant?.status ? participant.status : 'Pending Approval')}
						</p>
					</div>
				</div>

				{#if participantProducts.length > 0}

					{#if participant.status !== 'approved'}
						<div class="pb-4">
							<p class="text-sm text-stone-400 mb-3 font-semibold">Order Items</p>
							<div class="space-y-2">
								{#each participantProducts as product (product.id)}
									<div class="flex items-center justify-between p-3 bg-stone-700 rounded-lg">
										<div class="flex-1">
											<p class="font-medium text-stone-300">{product.product_name}</p>
											<p class="text-sm text-stone-400">{product.product_type}</p>
										</div>
										<div class="text-right">
											<p class="text-sm text-stone-400">
												{product.quantity_ordered} × {parseFloat(product.unit_price).toFixed(2)} {product.currency_type}
											</p>
											<p class="font-semibold text-stone-300">
												{parseFloat(product.subtotal).toFixed(2)} {product.currency_type}
											</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if pendingProducts.length > 0 && participant.status === 'approved'}
						<div class="bg-stone-800 border border-stone-500 rounded-lg p-4 neomorph-card">
							<div class="space-y-2 mb-4">
								<div class="flex items-center justify-between text-sm text-stone-300">
									<span>Tickets subtotal</span>
									<span>{outstandingTotal.toFixed(2)} {pendingProducts[0]?.currency_type || 'EUR'}</span>
								</div>
								{#if stripe_fee_model === 'on_top'}
									<div class="flex items-center justify-between text-sm text-stone-300">
										<span>Payment handling fee (3.5%)</span>
										<span>{stripeFee.toFixed(2)} {pendingProducts[0]?.currency_type || 'EUR'}</span>
									</div>
								{/if}
								<div class="flex items-center justify-between text-sm text-stone-300">
									<span>Service fee (1%)</span>
									<span>{serviceFee.toFixed(2)} {pendingProducts[0]?.currency_type || 'EUR'}</span>
								</div>
								<div class="flex items-center justify-between border-t pt-2 border-stone-600">
									<p class="font-semibold text-stone-100">Total due</p>
									<p class="text-lg font-bold text-stone-100">{chargeTotal.toFixed(2)} {pendingProducts[0]?.currency_type || 'EUR'}</p>
								</div>
								<p class="text-xs text-stone-400">
									{#if stripe_fee_model === 'on_top'}
										Includes a 3.5% payment handling fee (covers card processing) and a 1% platform service fee. This is necessary to cover the costs of payment processing and platform maintenance, ensuring we can continue to offer a seamless registration experience. We appreciate your understanding and support!
									{:else}
										Includes a 1% platform service fee. Payment handling costs are included in ticket prices. This helps us cover the costs of platform maintenance, ensuring we can continue to offer a seamless registration experience. We appreciate your understanding and support!
									{/if}
								</p>
							</div>
							{#if participant?.status === 'approved'}
								<button on:click={payWithStripe} class="w-full px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700">
									Pay {chargeTotal.toFixed(2)} {pendingProducts[0]?.currency_type || 'EUR'} with Stripe
								</button>
							{/if}
							<div class="mt-4 space-y-2">
								{#each pendingProducts as p (p.id)}
									<div class="flex items-center justify-between p-3 bg-stone-700 rounded-lg">
										<div>
											<p class="font-medium text-stone-300">{p.product_name}</p>
											<p class="text-sm text-stone-400">{p.product_type}</p>
										</div>
										<div class="text-right">
											<p class="text-sm text-stone-400">{p.quantity_ordered} × {parseFloat(p.unit_price).toFixed(2)} {p.currency_type}</p>
											<p class="font-semibold text-stone-300">{parseFloat(p.subtotal).toFixed(2)} {p.currency_type}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if paidProducts.length > 0}
						<div class="bg-stone-800 border border-stone-500 rounded-lg p-4 mt-4 neomorph-card">
							<p class="text-sm text-stone-400 mb-3 font-semibold">Paid Items</p>
							<div class="space-y-2">
								{#each paidProducts as p (p.id)}
									<div class="flex items-center justify-between p-3 bg-stone-700 rounded-lg">
										<div>
											<p class="font-medium text-stone-300">{p.product_name}</p>
											<p class="text-sm text-stone-400">{p.product_type}</p>
										</div>
										<div class="text-right">
											<p class="font-semibold text-stone-300">{parseFloat(p.subtotal).toFixed(2)} {p.currency_type}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<div class="bg-stone-800 border border-stone-500 rounded-lg p-4 neomorph-card">
						<div class="flex items-center justify-between">
							<p class="text-lg font-semibold text-stone-300">Order Total</p>
							<p class="text-2xl font-bold text-stone-300">
								{parseFloat(total.toString()).toFixed(2)} {currencyType}
							</p>
						</div>
					</div>
				{/if}

				{#if participant?.status !== 'approved'}
					<div class="bg-stone-800 border border-stone-500 rounded-lg p-4 neomorph-card">
						<p class="text-sm text-stone-400 mb-2">What happens next?</p>
						<ul class="space-y-2 text-stone-400">
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
				{/if}
			</div>

			<div class="mt-8 space-y-3 sm:flex sm:gap-4 sm:space-y-0">
				<button
					on:click={goBack}
					class="flex-1 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition duration-300 text-center"
				>
					Back to Profile
				</button>
				{#if paidProducts.length > 0}
					<button
						on:click={printReceipt}
						class="flex-1 py-3 bg-stone-600 text-stone-100 font-semibold rounded-lg hover:bg-stone-500 transition duration-300 text-center flex items-center justify-center gap-2"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
						</svg>
						Download Receipt
					</button>
				{/if}
			</div>

			{#if hasAccommodationProduct}
				<div class="mt-6 flex justify-start">
					<a href={`/profile/${registrationID}/accommodation`} class="inline-block px-6 py-3 bg-stone-800 text-white font-semibold rounded-lg shadow hover:bg-stone-700 transition border-2 border-stone-700">
						Book Event Hotel
					</a>
				</div>
			{/if}
		</div>

		<div class="bg-stone-800 border border-stone-500 rounded-lg p-6 text-center neomorph-card">
			<p class="text-sm text-stone-400 mb-1">Need Help?</p>
			<p class="text-stone-400">Please contact the event organizers if you have any questions about your registration</p>
		</div>
	</div>
</div>

<style>
	/* ── Screen ── */
	.print-receipt { display: none; }
	.screen-only { display: block; }

	/* ── Print ── */
	@media print {
		.screen-only { display: none !important; }

		@page {
			margin: 0;
		}

		.print-receipt {
			display: block;
			font-family: 'Helvetica Neue', Arial, sans-serif;
			color: #111;
			background: #fff;
			padding: 56px 64px;
			max-width: 720px;
			margin: 0 auto;
			font-size: 13px;
			line-height: 1.6;
		}

		/* Header */
		.receipt-header {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			margin-bottom: 24px;
		}

		.receipt-logo-text {
			font-size: 22px;
			font-weight: 800;
			letter-spacing: -0.5px;
			color: #111;
			max-width: 260px;
		}

		.receipt-meta h1 {
			font-size: 20px;
			font-weight: 700;
			margin: 0 0 8px 0;
			text-align: right;
			color: #111;
			letter-spacing: 0.5px;
			text-transform: uppercase;
		}

		.receipt-meta-table {
			border-collapse: collapse;
			text-align: right;
			margin-left: auto;
		}

		.receipt-meta-table td {
			padding: 2px 0 2px 16px;
			color: #555;
		}

		.receipt-meta-table td:first-child {
			color: #888;
			font-size: 11px;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}

		/* Divider */
		.receipt-divider {
			border: none;
			border-top: 1.5px solid #ddd;
			margin: 20px 0;
		}

		/* Parties */
		.receipt-parties {
			display: flex;
			justify-content: space-between;
			margin-bottom: 8px;
		}

		.receipt-party-label {
			font-size: 10px;
			text-transform: uppercase;
			letter-spacing: 0.8px;
			color: #999;
			margin: 0 0 4px 0;
		}

		.receipt-party-name {
			font-size: 15px;
			font-weight: 700;
			margin: 0 0 2px 0;
			color: #111;
		}

		.receipt-party-sub {
			font-size: 12px;
			color: #666;
			margin: 0;
		}

		.receipt-party-right {
			text-align: right;
		}

		/* Items table */
		.receipt-items {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 0;
			font-size: 12.5px;
		}

		.receipt-items thead tr {
			border-bottom: 2px solid #111;
		}

		.receipt-items th {
			padding: 8px 6px;
			text-align: left;
			font-size: 10px;
			text-transform: uppercase;
			letter-spacing: 0.6px;
			color: #555;
			font-weight: 600;
		}

		.receipt-items th.col-qty,
		.receipt-items th.col-unit,
		.receipt-items th.col-total {
			text-align: right;
		}

		.receipt-items tbody tr {
			border-bottom: 1px solid #eee;
		}

		.receipt-items tbody td {
			padding: 9px 6px;
			color: #222;
			vertical-align: top;
		}

		.receipt-items td.center { text-align: center; }
		.receipt-items td.right  { text-align: right; }

		/* Totals */
		.receipt-totals {
			display: flex;
			justify-content: flex-end;
			margin-top: 16px;
		}

		.receipt-totals table {
			border-collapse: collapse;
			min-width: 260px;
		}

		.receipt-totals td {
			padding: 5px 6px;
			color: #444;
			font-size: 13px;
		}

		.receipt-totals td.right {
			text-align: right;
			min-width: 100px;
		}

		.receipt-totals .total-row td {
			border-top: 2px solid #111;
			font-weight: 700;
			font-size: 15px;
			color: #111;
			padding-top: 10px;
		}

		/* Footer */
		.receipt-footer {
			margin-top: 36px;
			padding-top: 16px;
			border-top: 1px solid #ddd;
			color: #777;
			font-size: 11px;
			line-height: 1.6;
		}

		.receipt-footer-small {
			margin-top: 8px;
			font-size: 10px;
			color: #bbb;
		}
	}

	/* ── Shared screen styles ── */
	.neomorph-card {
		box-shadow:
			5px 5px 18px rgba(2,6,23,0.5),
			-5px -5px 12px rgba(255,255,255,0.08);
		border-radius: 1.25rem;
		border: 2px solid rgba(255,255,255,0.02);
	}
</style>