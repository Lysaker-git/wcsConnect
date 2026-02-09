
<script lang="ts">
	export let data: {
		registrationID?: string;
		participant?: any;
		event?: { id: string; title: string };
		accommodationProducts?: any[];
	};

	let selectedProductId = '';
	let checkIn = '';
	let checkOut = '';
	let roommates = '';
	let amount = 0;
	let numberOfNights = 1;
	let error = '';

	// Pre-fill name/email if available
	let name = data.participant?.name || '';
	let email = data.participant?.email || '';

	// Calculate price and nights
	$: selectedProduct = data.accommodationProducts?.find(p => p.id === selectedProductId);
	$: pricePerNight = selectedProduct ? parseFloat(selectedProduct.price) : 0;
	$: amount = pricePerNight * numberOfNights;
	$: upfront = amount * 0.2;

	function handleProductChange(e: Event) {
		selectedProductId = (e.target as HTMLSelectElement).value;
	}
	function handleCheckInChange(e: Event) {
		checkIn = (e.target as HTMLInputElement).value;
		updateNights();
	}
	function handleCheckOutChange(e: Event) {
		checkOut = (e.target as HTMLInputElement).value;
		updateNights();
	}
	function updateNights() {
		if (checkIn && checkOut) {
			const inDate = new Date(checkIn);
			const outDate = new Date(checkOut);
			const diff = (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24);
			numberOfNights = Math.max(1, Math.round(diff));
		} else {
			numberOfNights = 1;
		}
	}
	function handleSubmit(e: Event) {
		e.preventDefault();
		// Placeholder for booking logic
		if (!selectedProductId || !name || !email || !checkIn || !checkOut) {
			error = 'Please fill out all required fields.';
			return;
		}
		error = '';
		alert('Booking submitted! (not yet implemented)');
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12">
	<div class="max-w-xl mx-auto px-6">
		<div class="text-center mb-10">
			<h1 class="text-3xl font-extrabold text-gray-900 mb-2">Book Event Hotel</h1>
			<p class="text-lg text-gray-600">Reserve your accommodation for <span class="font-semibold">{data.event?.title}</span></p>
		</div>
		<form class="bg-white rounded-3xl shadow-2xl p-8 border-t-8 border-blue-500 space-y-6" on:submit={handleSubmit}>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">Accommodation Option</label>
				<select class="w-full rounded-lg border-gray-300 p-3" bind:value={selectedProductId} on:change={handleProductChange} required>
					<option value="" disabled selected>Select a room option</option>
					{#each data.accommodationProducts as product}
						<option value={product.id}>{product.name} ({parseFloat(product.price).toFixed(2)} {product.currency_type || 'EUR'} per night)</option>
					{/each}
				</select>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Check In</label>
					<input type="date" class="w-full rounded-lg border-gray-300 p-3" bind:value={checkIn} on:change={handleCheckInChange} required />
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
					<input type="date" class="w-full rounded-lg border-gray-300 p-3" bind:value={checkOut} on:change={handleCheckOutChange} required />
				</div>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">Roommates (optional)</label>
				<input type="text" class="w-full rounded-lg border-gray-300 p-3" bind:value={roommates} placeholder="Names of roommates" />
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
					<input type="text" class="w-full rounded-lg border-gray-300 p-3" bind:value={name} required />
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
					<input type="email" class="w-full rounded-lg border-gray-300 p-3" bind:value={email} required />
				</div>
			</div>
			<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<span class="text-gray-700 font-medium">Nights</span>
					<span class="font-semibold">{numberOfNights}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-gray-700 font-medium">Total Price</span>
					<span class="font-bold text-blue-700">{amount.toFixed(2)} {selectedProduct?.currency_type || 'EUR'}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-gray-700 font-medium">Upfront Payment (20%)</span>
					<span class="font-bold text-green-600">{upfront.toFixed(2)} {selectedProduct?.currency_type || 'EUR'}</span>
				</div>
			</div>
			{#if error}
				<div class="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">{error}</div>
			{/if}
			<button type="submit" class="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition text-lg">Pay {upfront.toFixed(2)} {selectedProduct?.currency_type || 'EUR'} (20% Upfront)</button>
		</form>
	</div>
</div>
