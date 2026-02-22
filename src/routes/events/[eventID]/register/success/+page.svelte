<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';


    export let data: { 
        participantId?: string; 
        eventID?: string;
        event?: { id: string; title: string; stripe_fee_model?: string };
        participant?: any; 
        participantUsername?: string;
        participantProducts?: any[]; 
        total?: number;
        stripeFee?: number;
        serviceFee?: number;
        grandTotal?: number;
        stripe_fee_model?: string;
    };

const { participantId, eventID, event, participant, participantUsername, participantProducts = [], total = 0, stripeFee = 0, serviceFee = 0, grandTotal = 0, stripe_fee_model = 'on_top' } = data;
    console.log('Loaded success page with data:', data);
    async function goBack() {
        await goto('/profile');
    }
</script>

<div class="min-h-screen bg-stone-900 text-stone-100 py-12">
    <div class="max-w-3xl mx-auto px-6">
        <!-- Success Header -->
        <div class="text-center mb-8">
            <div class="flex justify-center mb-4">
                <div class="bg-stone-800 rounded-full p-4 neomorph-subcard">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            </div>
            <h1 class="text-4xl font-extrabold text-stone-100 mb-2">Registration Successful!</h1>
            <p class="text-lg text-stone-300">Your event registration has been received</p>
        </div>

        <!-- Receipt Card -->
        <div class="neomorph-card bg-stone-800 rounded-3xl overflow-hidden p-8 sm:p-10 border-t-4 border-emerald-600 mb-8">
            <h2 class="text-2xl font-bold text-stone-100 mb-6 text-center">Registration Receipt</h2>

            <!-- Receipt Details -->
            <div class="space-y-6">
                <div class="border-b border-stone-700 pb-4">
                    <p class="text-sm text-stone-400 mb-1">Event</p>
                    <p class="text-lg font-semibold text-stone-100">{event?.title || 'N/A'}</p>
                </div>

                <div class="border-b border-stone-700 pb-4">
                    <p class="text-sm text-stone-400 mb-1">Participant ID</p>
                    <p class="text-lg font-semibold text-stone-100 break-all">{participantId || 'N/A'}</p>
                </div>

                <div class="border-b border-stone-700 pb-4">
                    <p class="text-sm text-stone-400 mb-1">Participant Name</p>
                    <p class="text-lg font-semibold text-stone-100">{participantUsername || 'N/A'}</p>
                </div>
                {#if participant?.partner_name}
                    <div class="border-b border-stone-700 pb-4">
                        <p class="text-sm text-stone-400 mb-1">Partner Name</p>
                        <p class="text-lg font-semibold text-stone-100">{participant.partner_name}</p>
                    </div>
                {/if}

                <div class="border-b border-stone-700 pb-4">
                    <p class="text-sm text-stone-400 mb-1">Registration Status</p>
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <p class="text-lg font-semibold text-emerald-400">{participant?.status === 'pending_couples_registration' ? 'Pending Approval (Couples)' : 'Pending Approval'}</p>
                    </div>
                </div>

                <!-- Order Items Section -->
                {#if participantProducts.length > 0}
                    <div class="border-b border-stone-700 pb-4">
                        <p class="text-sm text-stone-400 mb-3 font-semibold">Order Items</p>
                        <div class="space-y-2">
                            {#each participantProducts as product (product.id)}
                                <div class="flex items-center justify-between p-3 bg-stone-700 rounded-lg">
                                    <div class="flex-1">
                                        <p class="font-medium text-stone-100">{product.product_name}</p>
                                        <p class="text-sm text-stone-400">{product.product_type}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-sm text-stone-400">{product.quantity_ordered} × {parseFloat(product.unit_price).toFixed(2)} {product.currency_type}</p>
                                        <p class="font-semibold text-stone-100">{parseFloat(product.subtotal).toFixed(2)} {product.currency_type}</p>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>

                    <!-- Total Section -->
                    <div class="bg-stone-700 border border-stone-600 rounded-lg p-4 space-y-2">
                        <div class="flex justify-between text-sm text-stone-400">
                            <span>Tickets subtotal</span>
                            <span>{parseFloat(total.toString()).toFixed(2)} {participantProducts[0]?.currency_type || 'EUR'}</span>
                        </div>
                        {#if stripe_fee_model === 'on_top'}
                            <div class="flex justify-between text-sm text-stone-400">
                                <span>Payment handling fee (3.5%)</span>
                                <span>{stripeFee.toFixed(2)} {participantProducts[0]?.currency_type || 'EUR'}</span>
                            </div>
                        {/if}
                        <div class="flex justify-between text-sm text-stone-400">
                            <span>Service fee (1%)</span>
                            <span>{serviceFee.toFixed(2)} {participantProducts[0]?.currency_type || 'EUR'}</span>
                        </div>
                        <div class="flex justify-between border-t border-stone-600 pt-2">
                            <p class="text-lg font-semibold text-stone-100">Total</p>
                            <p class="text-2xl font-bold text-amber-300">
                                {grandTotal.toFixed(2)} {participantProducts[0]?.currency_type || 'EUR'}
                            </p>
                        </div>
                        <p class="text-xs text-stone-500">
                            {#if stripe_fee_model === 'on_top'}
                                3.5% covers card processing · 1% platform service fee
                            {:else}
                                Payment handling included in ticket prices · 1% platform service fee
                            {/if}
                        </p>
                    </div>
                {/if}

                <div class="bg-stone-700 border border-stone-700 rounded-lg p-4">
                    <p class="text-sm text-stone-400 mb-2">What happens next?</p>
                    <ul class="space-y-2 text-stone-300">
                        <li class="flex items-start gap-2"><span class="text-amber-300 font-bold mt-0.5">•</span><span>Your registration is pending approval from the event organizers</span></li>
                        <li class="flex items-start gap-2"><span class="text-amber-300 font-bold mt-0.5">•</span><span>You will receive a confirmation email once your registration is approved</span></li>
                        <li class="flex items-start gap-2"><span class="text-amber-300 font-bold mt-0.5">•</span><span>A separate payment portal will be available once approved</span></li>
                    </ul>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="mt-8 space-y-3 sm:flex sm:gap-4 sm:space-y-0">
                <button on:click={goBack} class="flex-1 py-3 bg-amber-600 text-stone-900 font-semibold rounded-lg hover:bg-amber-700 transition duration-300 text-center">Back to Profile</button>
                <!-- <button on:click={() => window.print()} class="flex-1 py-3 bg-stone-700 text-stone-200 border border-stone-700 font-semibold rounded-lg hover:bg-stone-700/90 transition duration-300 text-center">Print Confirmation</button> -->
            </div>
        </div>

        <!-- Info Box -->
        <div class="bg-stone-800 border border-stone-700 rounded-lg p-6 text-center neomorph-subcard">
            <p class="text-sm text-stone-400 mb-1">Need Help?</p>
            <p class="text-stone-300">Please contact the event organizers if you have any questions about your registration</p>
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

        .neomorph-card {
        background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(2,6,23,0.06));
        box-shadow: 8px 8px 24px rgba(2,6,23,0.6), -8px -8px 18px rgba(255,255,255,0.03);
        border-radius: 1.25rem;
        border: 1px solid rgba(255,255,255,0.03);
    }
</style>
