<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';


    export let data: { 
        participantId?: string; 
        eventID?: string;
        event?: { id: string; name: string };
        participant?: any; 
        participantUsername?: string;
        participantProducts?: any[]; 
        total?: number 
    };

    const { participantId, eventID, event, participant, participantUsername, participantProducts = [], total = 0 } = data;

    console.log('Loaded success page with data:', data);
    async function goBack() {
        await goto('/profile');
    }
</script>

<div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
    <div class="max-w-2xl mx-auto px-6">
        <!-- Success Header -->
        <div class="text-center mb-12">
            <div class="flex justify-center mb-4">
                <div class="bg-green-100 rounded-full p-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            </div>
            <h1 class="text-4xl font-extrabold text-gray-900 mb-2">Registration Successful!</h1>
            <p class="text-lg text-gray-600">Your event registration has been received</p>
        </div>

        <!-- Receipt Card -->
        <div class="bg-white rounded-3xl shadow-2xl overflow-hidden p-8 sm:p-10 border-t-8 border-green-500 mb-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">Registration Receipt</h2>

        <!-- Receipt Details -->
            <div class="space-y-6">
                <div class="border-b pb-4">
                    <p class="text-sm text-gray-600 mb-1">Event</p>
                    <p class="text-lg font-semibold text-gray-900">{event?.title || 'N/A'}</p>
                </div>

                <div class="border-b pb-4">
                    <p class="text-sm text-gray-600 mb-1">Participant ID</p>
                    <p class="text-lg font-semibold text-gray-900 break-all">{participantId || 'N/A'}</p>
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
                        <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                        <p class="text-lg font-semibold text-green-600">
                            {participant?.status === 'pending_couples_registration' ? 'Pending Approval (Couples)' : 'Pending Approval'}
                        </p>
                    </div>
                </div>

                <!-- Order Items Section -->
                {#if participantProducts.length > 0}
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

                    <!-- Total Section -->
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <p class="text-lg font-semibold text-gray-800">Order Total</p>
                            <p class="text-2xl font-bold text-blue-600">
                                {parseFloat(total.toString()).toFixed(2)} 
                                {participantProducts[0]?.currency_type || 'EUR'}
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

            <!-- Action Buttons -->
            <div class="mt-8 space-y-3 sm:flex sm:gap-4 sm:space-y-0">
                <button 
                    on:click={goBack}
                    class="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-300 text-center"
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
        </div>

        <!-- Info Box -->
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
