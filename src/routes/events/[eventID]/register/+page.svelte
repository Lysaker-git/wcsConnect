<script lang="ts">
    // Route for /events/[eventID]/register showing the registration form and handling submission
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';

    export let form: any = null;

    export let data: { user?: { id?: string; email?: string } | null; profile?: any; products?: any[]; stripe_fee_model?: string };
    let { profile, products = [], stripe_fee_model = 'on_top' } = data;

    // --- Age Calculation Helper ---
    function calculateAge(birthDate: string | undefined): number | string {
        if (!birthDate || birthDate.length < 10) return 'N/A';
        try {
            const today = new Date();
            const birth = new Date(birthDate);
            let age = today.getFullYear() - birth.getFullYear();
            const monthDifference = today.getMonth() - birth.getMonth();
            
            if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) {
                age--;
            }
            return age;
        } catch {
            return 'N/A';
        }
    }

    // --- State Initialization ---
    const calculatedAge = calculateAge(profile?.age);

    let username = profile?.username ?? '';
    let role = profile?.role ?? 'follower';
    let wsdcID = profile?.wsdcID ?? '';
    let wsdcLevel = profile?.wsdcLevel ?? 'Newcomer';
    let country = profile?.country ?? '';
    let age = calculatedAge;
    let partner = '';
    let partnerWsdcID = '';
    let partnerSuggestions: Array<{ username: string; wsdcID: string }> = [];
    let showPartnerDropdown = false;
    let partnerSearchTimeout: any = null;
    let isPartnerSearching = false;

    // Product selection state
    let selectedProducts: Record<string, number> = {};
    let selectedIntensives: Record<string, boolean> = {};
    let selectedTicket = '';
    let isSubmitting = false;
    let errorMessage = '';
    let showSoldOutModal = false;
    let soldOutProducts: string[] = [];
    let isLoading = false;

    // Promo code
    let promoCode = '';
    let promoInput = '';
    let promoDiscount = 0;
    let promoError = '';
    let promoChecking = false;

    

    const wsdcDisabled = wsdcID === '' ? false : true;
    const ageDisabled = typeof age === 'number' ? true : false;

    // Group products by type
    $: productsByType = products
        .filter(product => product.product_type !== 'accommodation')
        .reduce((acc: Record<string, any[]>, product) => {
            const type = product.product_type || 'Other';
            if (!acc[type]) acc[type] = [];
            acc[type].push(product);
            return acc;
        }, {});



    // Update cart calculations to include promo discount on tickets
    $: ticketProduct = selectedTicket ? products.find(p => p.id === selectedTicket) : null;
    $: ticketPrice = ticketProduct ? parseFloat(ticketProduct.price) : 0;
    $: discountedTicketPrice = promoDiscount > 0
        ? ticketPrice * (1 - promoDiscount / 100)
        : ticketPrice;
    $: ticketSaving = ticketPrice - discountedTicketPrice;

    $: cartSubtotal = [
        ...(selectedTicket ? [{ price: ticketPrice }] : []),
        ...products
            .filter(p => selectedIntensives[p.id])
            .map(p => ({
                price: p.discount_percent
                    ? parseFloat(p.price) * (1 - p.discount_percent / 100)
                    : parseFloat(p.price)
            })),
        ...products
            .filter(p => selectedProducts[p.id] > 0)
            .map(p => ({
                price: (p.discount_percent
                    ? parseFloat(p.price) * (1 - p.discount_percent / 100)
                    : parseFloat(p.price)) * (selectedProducts[p.id] || 0)
            }))
    ].reduce((sum, p) => sum + p.price, 0);

    $: stripeFeePreview = stripe_fee_model === 'on_top' ? (cartSubtotal - ticketSaving) * 0.035 : 0;
    $: previewServiceFee = (cartSubtotal - ticketSaving) * 0.01;
    $: previewTotal = cartSubtotal - ticketSaving + stripeFeePreview + previewServiceFee;
    $: selectedCount = 
        (selectedTicket ? 1 : 0) +
        Object.values(selectedIntensives).filter(Boolean).length +
        Object.values(selectedProducts).reduce((sum, qty) => sum + (qty > 0 ? qty : 0), 0);

    async function goBack() {
        await goto('.');
    }
    async function handleRegister(e: Event) {
        e.preventDefault();
        

        if (selectedCount === 0) {
            errorMessage = 'Please select at least one product';
            return;
        }

        isSubmitting = true;
        isLoading = true;
        errorMessage = '';

        try {
            const formData = new FormData();
            formData.append('role', role);
            formData.append('wsdcID', wsdcID);
            formData.append('wsdcLevel', wsdcLevel);
            formData.append('country', country);
            formData.append('age', age.toString());
            formData.append('partner', partner);
            formData.append('partner_wsdcID', partnerWsdcID);


            // Add selected ticket
            if (selectedTicket) {
                formData.append(`product_${selectedTicket}`, '1');
            }
            // Add selected products
            Object.entries(selectedProducts).forEach(([productId, quantity]) => {
                if (quantity > 0) {
                    formData.append(`product_${productId}`, quantity.toString());
                }
            });
            // Add selected intensives
            Object.entries(selectedIntensives).forEach(([productId, selected]) => {
                if (selected) {
                    formData.append(`product_${productId}`, '1');
                }
            });
            // Add promo code if valid
            if (promoCode) {
                formData.append('promo_code', promoCode);
                formData.append('promo_discount', promoDiscount.toString());
            }

            const res = await fetch('?/register', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();
            const parsedData = JSON.parse(result.data);

            if (parsedData?.partial) {
                isLoading = false;
                soldOutProducts = parsedData.soldOutProducts || [];
                showSoldOutModal = true;
            } else if (result.status === 200) {
                const indexMap = parsedData.find((x: any) => typeof x === 'object' && x !== null) ?? {};
                const participantId = parsedData[indexMap.participantId];
                await goto(`/events/${$page.params.eventID}/register/success?participantId=${participantId}`);
            } else {
                // Catches ALL failure cases including 400, 500
                isLoading = false;
                isSubmitting = false;
                const errorData = parsedData.find((x: any) => typeof x === 'object' && x !== null) ?? {};
                errorMessage = errorData.message || 'Registration failed. Please try again.';
            }
        } catch (err) {
            console.error('Registration error:', err);
            isLoading = false;
            isSubmitting = false;
            errorMessage = 'An error occurred during registration. Please try again.';
        } finally {
            isSubmitting = false;
        }
    }

    async function searchPartnerProfiles(query: string) {
        if (query.length < 3) {
            partnerSuggestions = [];
            showPartnerDropdown = false;
            isPartnerSearching = false;
            return;
        }
        // Debounce
        if (partnerSearchTimeout) clearTimeout(partnerSearchTimeout);
        isPartnerSearching = true;
        partnerSearchTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search-profiles?query=${encodeURIComponent(query)}`);
                const result = await res.json();
                partnerSuggestions = result.profiles || [];
                showPartnerDropdown = partnerSuggestions.length > 0;
            } catch (err) {
                partnerSuggestions = [];
                showPartnerDropdown = false;
            } finally {
                isPartnerSearching = false;
            }
        }, 300);
    }
    function handlePartnerInput(e: Event) {
        partner = (e.target as HTMLInputElement).value;
        partnerWsdcID = '';
        searchPartnerProfiles(partner);
    }
    function selectPartnerSuggestion(suggestion: { username: string; wsdcID: string }) {
        partner = suggestion.username;
        partnerWsdcID = suggestion.wsdcID;
        showPartnerDropdown = false;
    }

    function closeSoldOutModal() {
        showSoldOutModal = false;
    }

    const wsdcLevels = ['Newcomer', 'Novice', 'Intermediate', 'Advanced', 'All-Star', 'Champion'];
    const productTypeIcons: Record<string, string> = {
        'ticket': '🎟️',
        'intensive': '🎓',
        'Merchandise': '👕',
        'Accommodation': '🏨',
        'Other': '📦'
    };

    async function handleValidatePromo() {
        if (!promoInput) return;
        promoChecking = true;
        promoError = '';

        try {
            const formData = new FormData();
            formData.append('code', promoInput);

            const res = await fetch('?/validatePromo', {
            method: 'POST',
            body: formData
            });

            
            const result = await res.json();
            const parsed = JSON.parse(result.data);
            
            // SvelteKit fail() returns status 400, success returns 200
            if (result.status === 200) {
                const indexMap = parsed.find((x: any) => typeof x === 'object' && x !== null) ?? {};
                promoCode = parsed[indexMap.promoCode] ?? '';
                promoDiscount = parseFloat(parsed[indexMap.promoDiscount]) || 0;
                promoError = '';
            } else {
                const indexMap = parsed.find((x: any) => typeof x === 'object' && x !== null) ?? {};
                promoError = parsed[indexMap.promoError] ?? 'Invalid or expired promo code';
            }
        } catch (err) {
            promoError = 'Failed to validate promo code';
        } finally {
            promoChecking = false;
        }
    }



</script>

<!-- Loading Modal -->
{#if isLoading}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl p-8 max-w-sm mx-4 text-center">
            <div class="mb-4">
                <div class="inline-block">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </div>
            <h3 class="text-lg font-semibold text-gray-800 mb-2">Processing Registration</h3>
            <p class="text-gray-600">Please wait while we complete your registration...</p>
        </div>
    </div>
{/if}

<!-- Sold Out Modal -->
{#if showSoldOutModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4">
            <h3 class="text-2xl font-bold text-red-600 mb-4">Products Sold Out</h3>
            <p class="text-gray-700 mb-6">
                The following products have reached their capacity and are no longer available:
            </p>
            <ul class="mb-6 space-y-2">
                {#each soldOutProducts as product}
                    <li class="flex items-center gap-2 text-gray-700">
                        <span class="text-red-500">✕</span>
                        <span>{product}</span>
                    </li>
                {/each}
            </ul>
            <button 
                on:click={closeSoldOutModal}
                class="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
                Close
            </button>
        </div>
    </div>
{/if}

<div class="min-h-screen bg-stone-800 py-12">
    <div class="max-w-2xl mx-auto px-6">
        <h1 class="text-4xl font-extrabold text-stone-100 mb-8 text-center drop-shadow">Event Registration</h1>
        
        <!-- Registration Card -->
        <div class="bg-stone-700 rounded-3xl shadow-2xl overflow-hidden p-8 sm:p-10 border-t-8 border-blue-500 relative neomorph-card">
            
            <!-- Go Back Button -->
            <button on:click={goBack} 
                    class="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition duration-150 rounded-full hover:bg-gray-100"
                    aria-label="Go Back"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>

            <h2 class="text-3xl font-bold text-stone-300 mb-6">Confirm Your Details</h2>
            <p class="text-stone-400 mb-8">Please review your information and select the products you'd like to register for.</p>

            {#if errorMessage}
                <div class="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    {errorMessage}
                </div>
            {/if}

            <form on:submit={handleRegister} class="space-y-8">

                <!-- PARTICIPANT DETAILS SECTION -->
                <div class="pb-6">
                    <h3 class="text-lg font-semibold text-stone-300 mb-4">Your Details</h3>

                    <!-- Username -->
                    <div class="mb-4">
                        <label for="username" class="block text-sm font-medium text-stone-300">Username</label>
                        <input id="username" type="text" bind:value={username} required 
                               class="mt-1 block w-full rounded-lg border border-stone-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 bg-stone-800 text-stone-100" />
                    </div>

                    <!-- Role (Leader/Follower Select) -->
                    <div class="mb-4">
                        <label for="role" class="block text-sm font-medium text-stone-300">Role</label>
                        <select id="role" bind:value={role} required
                                class="mt-1 block w-full rounded-lg border border-stone-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 bg-stone-800 text-stone-100">
                            <option value="leader">Leader</option>
                            <option value="follower">Follower</option>
                        </select>
                    </div>

                    <!-- Partner Autocomplete -->
                    <div class="mb-4 relative">
                        <label for="partner" class="block text-sm font-medium text-stone-300">Partner (Optional)</label>
                        <p class="text-xs text-stone-500 mb-1">You can search for a partner and connect your registrations if your partner has a profile on the site. Start typing their name to see suggestions.</p>
                        <div class="flex items-center gap-2">
                            <input id="partner" type="text" bind:value={partner} placeholder="Enter your partner's name"
                                   class="mt-1 block w-full rounded-lg border border-stone-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 bg-stone-800 text-stone-100"
                                   on:input={handlePartnerInput} autocomplete="off" />
                            {#if isPartnerSearching}
                                <span class="ml-1 animate-spin">
                                    <svg class="w-5 h-5 text-stone-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </span>
                            {/if}
                        </div>
                        {#if showPartnerDropdown}
                            <ul class="absolute z-10 left-0 right-0 bg-stone-800 border border-stone-600 rounded-lg mt-1 shadow-lg">
                                    {#each partnerSuggestions as suggestion}
                                        <li class="px-4 py-2 cursor-pointer hover:bg-stone-700 flex justify-between items-center"
                                            on:click={() => selectPartnerSuggestion(suggestion)}>
                                            <span class="text-stone-100">{suggestion.username}</span>
                                            <span class="text-xs text-stone-300">WSDC ID: {suggestion.wsdcID}</span>
                                        </li>
                                    {/each}
                            </ul>
                        {/if}
                        <div class="mt-2">
                            <label for="partnerWsdcID" class="block text-xs text-stone-500">Partner WSDC ID</label>
                            <input id="partnerWsdcID" type="text" bind:value={partnerWsdcID} class="block w-full rounded-lg border border-stone-600 p-2 text-xs bg-stone-800 text-stone-100" placeholder="Enter WSDC ID" />
                        </div>
                    </div>

                    <!-- WSDC Details Group -->
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label for="wsdcID" class="block text-sm font-medium text-stone-300">WSDC ID</label>
                            <input id="wsdcID" type="text" bind:value={wsdcID} disabled={wsdcDisabled}
                                   class="mt-1 block w-full rounded-lg border border-stone-600 shadow-sm bg-stone-800 text-stone-300 p-3" />
                        </div>

                        <div>
                            <label for="wsdcLevel" class="block text-sm font-medium text-stone-300">WSDC Level</label>
                            <select id="wsdcLevel" bind:value={wsdcLevel}
                                    class="mt-1 block w-full rounded-lg border border-stone-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 bg-stone-800 text-stone-100">
                                {#each wsdcLevels as level}
                                    <option value={level}>{level}</option>
                                {/each}
                            </select>
                        </div>
                    </div>

                    <!-- Country & Age Group -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="country" class="block text-sm font-medium text-stone-300">Country</label>
                            <input id="country" type="text" bind:value={country} required 
                                   class="mt-1 block w-full rounded-lg border border-stone-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 bg-stone-800 text-stone-100" />
                        </div>

                        <div>
                            <label for="age" class="block text-sm font-medium text-stone-300">Age</label>
                            <input id="age" type="text" bind:value={age} disabled={ageDisabled}
                                   class="mt-1 block w-full rounded-lg border border-stone-600 shadow-sm bg-stone-800 text-stone-500 p-3" />
                        </div>
                    </div>
                </div>

                <!-- PRODUCTS SECTION -->
                <div class=" pb-3">
                    <h3 class="text-lg font-semibold text-stone-300 mb-4">Select Products</h3>
                    
                    {#if products.length === 0}
                        <div class="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg">
                            No products available for this event.
                        </div>
                    {:else}
                        {#each Object.entries(productsByType) as [type, typeProducts]}
                            <div class="mb-6">
                                <h4 class="text-base font-semibold text-stone-300 mb-3 flex items-center gap-2 capitalize">
                                    <span>{productTypeIcons[type] || '📦'}</span>
                                    {type}
                                </h4>
                                
                                <div class="space-y-3">
                                    {#each typeProducts as product}
                                        <div class="border border-stone-600 rounded-lg p-4 hover:bg-stone-700 transition">
                                            <div class="flex items-start justify-between mb-2">
                                                <div class="flex-1">
                                                    <h5 class="font-semibold text-stone-300">{product.name}</h5>
                                                    {#if product.description}
                                                        <p class="text-sm text-stone-400 mt-1">{product.description}</p>
                                                    {/if}
                                                </div>
                                                <div class="text-right ml-4">
                                                    {#if product.discount_percent}
                                                        {@const discounted = parseFloat(product.price) * (1 - product.discount_percent / 100)}
                                                        <div class="text-sm line-through text-stone-500">{parseFloat(product.price).toFixed(2)} {product.currency_type || 'EUR'}</div>
                                                        <div class="text-lg font-bold text-amber-400">{discounted.toFixed(2)} {product.currency_type || 'EUR'}</div>
                                                        <div class="text-xs text-green-400">-{product.discount_percent}%</div>
                                                    {:else}
                                                        <div class="text-lg font-bold text-stone-200">
                                                            {parseFloat(product.price).toFixed(2)} {product.currency_type || 'EUR'}
                                                        </div>
                                                    {/if}
                                                </div>
                                            </div>

                                            <!-- Radio Button for Tickets, Checkbox for Intensives, Quantity Input for Others -->
                                            {#if type === 'ticket'}
                                                <div class="flex items-center gap-3 mt-4">
                                                    <input 
                                                        id="ticket-{product.id}"
                                                        type="radio" 
                                                        name="ticket"
                                                        value={product.id}
                                                        bind:group={selectedTicket}
                                                        class="w-4 h-4 text-blue-600 border-stone-600 focus:ring-blue-500"
                                                    />
                                                    <label for="ticket-{product.id}" class="text-sm font-medium text-stone-300 cursor-pointer">
                                                        Select this ticket
                                                    </label>
                                                </div>
                                            {:else if type === 'intensive'}
                                                <div class="flex items-center gap-3 mt-4">
                                                    <input 
                                                        id="intensive-{product.id}"
                                                        type="checkbox" 
                                                        bind:checked={selectedIntensives[product.id]}
                                                        class="w-4 h-4 text-blue-600 border-stone-600 rounded focus:ring-blue-500"
                                                    />
                                                    <label for="intensive-{product.id}" class="text-sm font-medium text-stone-300 cursor-pointer">
                                                        Include this intensive
                                                    </label>
                                                </div>
                                            {:else}
                                                <div class="flex items-center gap-3 mt-4">
                                                    <label for="qty-{product.id}" class="text-sm font-medium text-stone-300">Qty:</label>
                                                    <input 
                                                        id="qty-{product.id}"
                                                        type="number" 
                                                        min="0" 
                                                        bind:value={selectedProducts[product.id]}
                                                        class="w-16 px-3 py-2 border border-stone-600 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                                                    />
                                                </div>
                                            {/if}
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>

                <!-- Promo Code -->
                {#if selectedTicket}
                <div class="border-t border-stone-600 pt-6">
                <h3 class="text-sm font-semibold text-stone-300 mb-3">Promo Code</h3>
                {#if promoCode}
                    <div class="flex items-center gap-2 p-3 bg-green-900/30 border border-green-700 rounded-xl">
                    <span class="text-green-400 text-sm">✓ Code <strong>{promoCode}</strong> applied — {promoDiscount}% off your event pass</span>
                    <button
                        type="button"
                        on:click={() => { promoCode = ''; promoDiscount = 0; promoInput = ''; }}
                        class="ml-auto text-xs text-stone-400 hover:text-stone-200"
                    >
                        Remove
                    </button>
                    </div>
                {:else}
                    <div class="flex gap-2">
                    <input
                        type="text"
                        bind:value={promoInput}
                        placeholder="Enter promo code"
                        class="flex-1 px-4 py-2.5 rounded-xl bg-stone-800 border border-stone-600 text-stone-100 uppercase placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                        type="button"
                        disabled={promoChecking || !promoInput}
                        on:click={handleValidatePromo}
                        class="px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-stone-200 font-medium rounded-xl transition disabled:opacity-50"
                    >
                        {promoChecking ? '...' : 'Apply'}
                    </button>
                    </div>
                    {#if promoError}
                    <p class="text-red-400 text-xs mt-1">{promoError}</p>
                    {/if}
                {/if}
                </div>
                {/if}
                {#if selectedCount > 0}
                    <div class="bg-stone-800 border border-stone-600 rounded-lg p-4 space-y-2">
                        <p class="text-sm font-semibold text-stone-300 mb-2">Order Summary</p>
                        <div class="flex justify-between text-sm text-stone-400">
                        <span>Tickets subtotal</span>
                        <span>{cartSubtotal.toFixed(2)} {products[0]?.currency_type || 'EUR'}</span>
                        </div>
                        {#if promoDiscount > 0 && ticketSaving > 0}
                        <div class="flex justify-between text-sm text-green-400">
                            <span>Promo discount ({promoDiscount}%)</span>
                            <span>-{ticketSaving.toFixed(2)} {products[0]?.currency_type || 'EUR'}</span>
                        </div>
                        {/if}
                        {#if stripe_fee_model === 'on_top'}
                        <div class="flex justify-between text-sm text-stone-400">
                            <span>Payment handling fee (3.5%)</span>
                            <span>{stripeFeePreview.toFixed(2)} {products[0]?.currency_type || 'EUR'}</span>
                        </div>
                        {/if}
                        <div class="flex justify-between text-sm text-stone-400">
                        <span>Service fee (1%)</span>
                        <span>{previewServiceFee.toFixed(2)} {products[0]?.currency_type || 'EUR'}</span>
                        </div>
                        <div class="flex justify-between border-t pt-2 font-semibold text-stone-300">
                        <span>Estimated total</span>
                        <span class="text-blue-600">{previewTotal.toFixed(2)} {products[0]?.currency_type || 'EUR'}</span>
                        </div>
                    </div>
                {/if}

                <!-- Register Button -->
                <div class="pt-6">
                    <button 
                        type="submit"
                        disabled={selectedCount === 0 || isSubmitting}
                        class="w-full py-3 bg-green-600 text-white text-lg font-bold rounded-lg shadow-lg hover:bg-green-700 transition duration-300 transform hover:scale-[1.005] disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Registering...' : `Register (${selectedCount} items)`}
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<style>
        .neomorph-card {
        background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(2,6,23,0.06));
        box-shadow: 8px 8px 24px rgba(2,6,23,0.6), -8px -8px 18px rgba(255,255,255,0.03);
        border-radius: 1.25rem;
        border: 1px solid rgba(255,255,255,0.03);
    }

    /* Inset/pressed neomorph for About section */
    .neomorph-inset {
        background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(0,0,0,0.03));
        box-shadow: inset 6px 6px 16px rgba(2,6,23,0.5), inset -6px -6px 12px rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.02);
    }
</style>