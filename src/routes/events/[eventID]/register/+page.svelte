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

    // Product selection state
    let selectedProducts: Record<string, number> = {};
    let isSubmitting = false;
    let errorMessage = '';

    // Group products by type
    $: productsByType = products.reduce((acc: Record<string, any[]>, product) => {
        const type = product.product_type || 'Other';
        if (!acc[type]) acc[type] = [];
        acc[type].push(product);
        return acc;
    }, {});

    // Calculate total
    $: total = Object.entries(selectedProducts).reduce((sum, [productId, quantity]) => {
        const product = products.find(p => p.id === productId);
        if (product && quantity > 0) {
            return sum + (parseFloat(product.price) * quantity);
        }
        return sum;
    }, 0);

    // Count selected products
    $: selectedCount = Object.values(selectedProducts).filter(q => q > 0).length;

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
        errorMessage = '';

        try {
            const formData = new FormData();
            formData.append('role', role);
            formData.append('wsdcID', wsdcID);
            formData.append('wsdcLevel', wsdcLevel);
            formData.append('country', country);
            formData.append('age', age.toString());
            formData.append('partner', partner);

            // Add selected products
            Object.entries(selectedProducts).forEach(([productId, quantity]) => {
                if (quantity > 0) {
                    formData.append(`product_${productId}`, quantity.toString());
                }
            });

            const res = await fetch('?/register', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();

            if (result.success) {
                console.log('Registration successful! Order ID:', result.orderId);
                await goto(`/events/${$page.params.eventID}`);
            } else {
                errorMessage = result.message || 'Registration failed';
            }
        } catch (err) {
            console.error('Registration error:', err);
            errorMessage = 'An error occurred during registration';
        } finally {
            isSubmitting = false;
        }
    }

    const wsdcLevels = ['Newcomer', 'Novice', 'Intermediate', 'Advanced', 'All-Star', 'Champion'];
    const productTypeIcons: Record<string, string> = {
        'Event Ticket': '🎟️',
        'Intensives': '🎓',
        'Merchandise': '👕',
        'Accommodation': '🏨',
        'Other': '📦'
    };

</script>

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

                    <!-- Partner -->
                    <div class="mb-4">
                        <label for="partner" class="block text-sm font-medium text-gray-700">Partner (Optional)</label>
                        <input id="partner" type="text" bind:value={partner} placeholder="Enter your partner's name or ID"
                               class="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3" />
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
                                                        {parseFloat(product.price).toFixed(2)} {product.currency_type || 'NOK'}
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Quantity Input -->
                                            <div class="flex items-center gap-3 mt-4">
                                                <label for="qty-{product.id}" class="text-sm font-medium text-gray-700">Qty:</label>
                                                <input 
                                                    id="qty-{product.id}"
                                                    type="number" 
                                                    min="0" 
                                                    bind:value={selectedProducts[product.id]}
                                                    class="w-16 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                                                />
                                                
                                                {#if product.quantity_total && selectedProducts[product.id] > product.quantity_total}
                                                    <span class="text-sm text-red-600">
                                                        ({product.quantity_total} available)
                                                    </span>
                                                {/if}
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>

                <!-- ORDER SUMMARY -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-gray-700">Products Selected:</span>
                        <span class="font-semibold">{selectedCount}</span>
                    </div>
                    <div class="flex items-center justify-between text-2xl font-bold">
                        <span class="text-gray-800">Total:</span>
                        <span class="text-blue-600">{total.toFixed(2)} NOK</span>
                    </div>
                </div>

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
