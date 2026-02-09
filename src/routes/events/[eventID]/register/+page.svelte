<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';

    export let data: { user?: { id?: string; email?: string } | null; profile?: any; products?: any[] };
    let { profile, products = [] } = data;

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

    // Group products by type
    $: productsByType = products
        .filter(product => product.product_type !== 'accommodation')
        .reduce((acc: Record<string, any[]>, product) => {
            const type = product.product_type || 'Other';
            if (!acc[type]) acc[type] = [];
            acc[type].push(product);
            return acc;
        }, {});



    // Count selected products
    $: selectedCount = (selectedTicket ? 1 : 0) + Object.values(selectedProducts).filter(q => q > 0).length + Object.values(selectedIntensives).filter(s => s).length;

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

            const res = await fetch('?/register', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();
            console.log('Registration result:', result);

            const parsedData = JSON.parse(result.data);
            const participantId = parsedData[2]
            console.log('Extracted participant ID:', participantId);

            if (parsedData?.partial) {
                isLoading = false;
                soldOutProducts = parsedData.soldOutProducts || [];
                showSoldOutModal = true;
            } else if (result.status === 200) {
                await goto(`/events/${$page.params.eventID}/register/success?participantId=${participantId}`);
            } else if (result.error) {
                isLoading = false;
                errorMessage = result.error.message || 'Registration failed';
            }
        } catch (err) {
            console.error('Registration error:', err);
            isLoading = false;
            errorMessage = 'An error occurred during registration';
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

<div class="min-h-screen bg-gray-50 py-12">
    <div class="max-w-2xl mx-auto px-6">
        <h1 class="text-4xl font-extrabold text-gray-900 mb-8 text-center drop-shadow">Event Registration</h1>
        
        <!-- Registration Card -->
        <div class="bg-white rounded-3xl shadow-2xl overflow-hidden p-8 sm:p-10 border-t-8 border-blue-500 relative">
            
            <!-- Go Back Button -->
            <button on:click={goBack} 
                    class="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition duration-150 rounded-full hover:bg-gray-100"
                    aria-label="Go Back"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>

            <h2 class="text-3xl font-bold text-blue-800 mb-6">Confirm Your Details</h2>
            <p class="text-gray-600 mb-8">Please review your information and select the products you'd like to register for.</p>

            {#if errorMessage}
                <div class="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    {errorMessage}
                </div>
            {/if}

            <form on:submit={handleRegister} class="space-y-8">

                <!-- PARTICIPANT DETAILS SECTION -->
                <div class="border-b pb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Your Details</h3>

                    <!-- Username -->
                    <div class="mb-4">
                        <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
                        <input id="username" type="text" bind:value={username} required 
                               class="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3" />
                    </div>

                    <!-- Role (Leader/Follower Select) -->
                    <div class="mb-4">
                        <label for="role" class="block text-sm font-medium text-gray-700">Role</label>
                        <select id="role" bind:value={role} required
                                class="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 bg-white">
                            <option value="leader">Leader</option>
                            <option value="follower">Follower</option>
                        </select>
                    </div>

                    <!-- Partner Autocomplete -->
                    <div class="mb-4 relative">
                        <label for="partner" class="block text-sm font-medium text-gray-700">Partner (Optional)</label>
                        <p class="text-xs text-gray-500 mb-1">You can search for a partner and connect your registrations if your partner has a profile on the site. Start typing their name to see suggestions.</p>
                        <div class="flex items-center gap-2">
                            <input id="partner" type="text" bind:value={partner} placeholder="Enter your partner's name or ID"
                                   class="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3"
                                   on:input={handlePartnerInput} autocomplete="off" />
                            {#if isPartnerSearching}
                                <span class="ml-1 animate-spin">
                                    <svg class="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </span>
                            {/if}
                        </div>
                        {#if showPartnerDropdown}
                            <ul class="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 shadow-lg">
                                {#each partnerSuggestions as suggestion}
                                    <li class="px-4 py-2 cursor-pointer hover:bg-blue-100 flex justify-between items-center"
                                        on:click={() => selectPartnerSuggestion(suggestion)}>
                                        <span>{suggestion.username}</span>
                                        <span class="text-xs text-gray-500">WSDC ID: {suggestion.wsdcID}</span>
                                    </li>
                                {/each}
                            </ul>
                        {/if}
                        <div class="mt-2">
                            <label for="partnerWsdcID" class="block text-xs text-gray-500">Partner WSDC ID</label>
                            <input id="partnerWsdcID" type="text" bind:value={partnerWsdcID} class="block w-full rounded-lg border border-gray-200 p-2 text-xs" placeholder="Enter or select WSDC ID" />
                        </div>
                    </div>

                    <!-- WSDC Details Group -->
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label for="wsdcID" class="block text-sm font-medium text-gray-700">WSDC ID</label>
                            <input id="wsdcID" type="text" bind:value={wsdcID} disabled 
                                   class="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm bg-gray-100 text-gray-500 p-3" />
                        </div>

                        <div>
                            <label for="wsdcLevel" class="block text-sm font-medium text-gray-700">WSDC Level</label>
                            <select id="wsdcLevel" bind:value={wsdcLevel}
                                    class="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 bg-white">
                                {#each wsdcLevels as level}
                                    <option value={level}>{level}</option>
                                {/each}
                            </select>
                        </div>
                    </div>

                    <!-- Country & Age Group -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="country" class="block text-sm font-medium text-gray-700">Country</label>
                            <input id="country" type="text" bind:value={country} required 
                                   class="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3" />
                        </div>

                        <div>
                            <label for="age" class="block text-sm font-medium text-gray-700">Age</label>
                            <input id="age" type="text" bind:value={age} disabled 
                                   class="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm bg-gray-100 text-gray-500 p-3" />
                        </div>
                    </div>
                </div>

                <!-- PRODUCTS SECTION -->
                <div class="border-b pb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Select Products</h3>
                    
                    {#if products.length === 0}
                        <div class="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg">
                            No products available for this event.
                        </div>
                    {:else}
                        {#each Object.entries(productsByType) as [type, typeProducts]}
                            <div class="mb-6">
                                <h4 class="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <span>{productTypeIcons[type] || '📦'}</span>
                                    {type}
                                </h4>
                                
                                <div class="space-y-3">
                                    {#each typeProducts as product}
                                        <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                                            <div class="flex items-start justify-between mb-2">
                                                <div class="flex-1">
                                                    <h5 class="font-semibold text-gray-800">{product.name}</h5>
                                                    {#if product.description}
                                                        <p class="text-sm text-gray-600 mt-1">{product.description}</p>
                                                    {/if}
                                                </div>
                                                <div class="text-right ml-4">
                                                    <div class="text-lg font-bold text-blue-600">
                                                        {parseFloat(product.price).toFixed(2)} {product.currency_type || 'EUR'}
                                                    </div>
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
                                                        class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                    />
                                                    <label for="ticket-{product.id}" class="text-sm font-medium text-gray-700 cursor-pointer">
                                                        Select this ticket
                                                    </label>
                                                </div>
                                            {:else if type === 'intensive'}
                                                <div class="flex items-center gap-3 mt-4">
                                                    <input 
                                                        id="intensive-{product.id}"
                                                        type="checkbox" 
                                                        bind:checked={selectedIntensives[product.id]}
                                                        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <label for="intensive-{product.id}" class="text-sm font-medium text-gray-700 cursor-pointer">
                                                        Include this intensive
                                                    </label>
                                                </div>
                                            {:else}
                                                <div class="flex items-center gap-3 mt-4">
                                                    <label for="qty-{product.id}" class="text-sm font-medium text-gray-700">Qty:</label>
                                                    <input 
                                                        id="qty-{product.id}"
                                                        type="number" 
                                                        min="0" 
                                                        bind:value={selectedProducts[product.id]}
                                                        class="w-16 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
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

                <!-- PRODUCTS SELECTED SUMMARY
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div class="flex items-center justify-between">
                        <span class="text-gray-700 text-lg font-medium">Products Selected:</span>
                        <span class="font-semibold text-lg text-blue-600">{selectedCount}</span>
                    </div>
                </div> -->

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
