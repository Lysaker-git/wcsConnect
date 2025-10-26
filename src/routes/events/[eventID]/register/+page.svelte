<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/stores'; // <-- IMPORTED: For accessing URL parameters

    // The data object comes from the parent route's load function (passed through the layout)
    export let data: { user?: { id?: string; email?: string } | null; profile?: any };
    let { profile } = data;

    // --- Age Calculation Helper (Reused from Profile Page) ---
    function calculateAge(birthDate: string | undefined): number | string {
        if (!birthDate || birthDate.length < 10) return 'N/A';
        try {
            const today = new Date();
            const birth = new Date(birthDate);
            let age = today.getFullYear() - birth.getFullYear();
            const monthDifference = today.getMonth() - birth.getMonth();
            
            // Adjust age if the birthday hasn't occurred yet this year
            if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) {
                age--;
            }
            return age;
        } catch {
            return 'N/A';
        }
    }

    // --- State Initialization ---
    // Pre-calculate age for the form field
    const calculatedAge = calculateAge(profile?.age);

    // Form inputs pre-filled with profile data
    let username = profile?.username ?? '';
    let role = profile?.role ?? 'follower'; // Select input
    let wsdcID = profile?.wsdcID ?? '';
    let wsdcLevel = profile?.wsdcLevel ?? profile?.wsdcLevel ?? 'Newcomer'; // Select input (using known levels)
    let country = profile?.country ?? '';
    let age = calculatedAge; // Displayed as the calculated age
    
    // New field
    let partner = ''; 

    // --- Event Handlers ---
    async function goBack() {
        // Go back to the previous event detail page
        await goto('.'); 
    }

    function handleRegister(e: Event) {
        e.preventDefault();
        
        // 1. Get the dynamic event ID from the route parameters
        const eventID = $page.params.eventID; 

        // 2. Get the user/profile ID
        const profileId = profile?.id; // Assuming profile object contains the ID

        // 3. Construct the registration payload
        const registrationPayload = {
            // Required IDs and Status
            eventID: eventID,
            profileId: profileId,
            status: 'pending', // Default status
            
            // Form Data
            username: username,
            role: role,
            wsdcID: wsdcID,
            wsdcLevel: wsdcLevel,
            country: country,
            age: age,
            partner: partner,
        };

        // ** Console log the object as requested **
        console.log('--- Event Registration Payload ---');
        console.log(registrationPayload);
    }

    // WSDC Levels for the select dropdown
    const wsdcLevels = ['Newcomer', 'Novice', 'Intermediate', 'Advanced', 'All-Star', 'Champion'];

</script>

<div class="min-h-screen bg-gray-50 py-12">
    <div class="max-w-xl mx-auto px-6">
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
            <p class="text-gray-600 mb-8">Please review and confirm your profile information for this event registration. Your WSDC data is pre-filled.</p>

            <form on:submit={handleRegister} class="space-y-6">

                <!-- Username -->
                <div>
                    <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
                    <input id="username" type="text" bind:value={username} required 
                           class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3" />
                </div>

                <!-- Role (Leader/Follower Select) -->
                <div>
                    <label for="role" class="block text-sm font-medium text-gray-700">Role</label>
                    <select id="role" bind:value={role} required
                            class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 bg-white">
                        <option value="leader">Leader</option>
                        <option value="follower">Follower</option>
                    </select>
                </div>

                <!-- Partner -->
                <div>
                    <label for="partner" class="block text-sm font-medium text-gray-700">Partner (Optional)</label>
                    <input id="partner" type="text" bind:value={partner} placeholder="Enter your partner's name or ID"
                           class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3" />
                </div>

                <!-- WSDC Details Group -->
                <div class="grid grid-cols-2 gap-4 pt-2">
                    <!-- WSDC ID -->
                    <div>
                        <label for="wsdcID" class="block text-sm font-medium text-gray-700">WSDC ID</label>
                        <input id="wsdcID" type="text" bind:value={wsdcID} disabled 
                               class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm bg-gray-100 text-gray-500 p-3" />
                    </div>

                    <!-- WSDC Level -->
                    <div>
                        <label for="wsdcLevel" class="block text-sm font-medium text-gray-700">WSDC Level</label>
                        <select id="wsdcLevel" bind:value={wsdcLevel}
                                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 bg-white">
                            {#each wsdcLevels as level}
                                <option value={level}>{level}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <!-- Country & Age Group -->
                <div class="grid grid-cols-2 gap-4">
                    <!-- Country -->
                    <div>
                        <label for="country" class="block text-sm font-medium text-gray-700">Country</label>
                        <input id="country" type="text" bind:value={country} required 
                               class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3" />
                    </div>

                    <!-- Age (Calculated) -->
                    <div>
                        <label for="age" class="block text-sm font-medium text-gray-700">Age</label>
                        <input id="age" type="text" bind:value={age} disabled 
                               class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm bg-gray-100 text-gray-500 p-3" />
                    </div>
                </div>

                <!-- Register Button -->
                <div class="pt-6">
                    <button type="submit" 
                            class="w-full py-3 bg-green-600 text-white text-lg font-bold rounded-lg shadow-lg hover:bg-green-700 transition duration-300 transform hover:scale-[1.005]">
                        Register
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
