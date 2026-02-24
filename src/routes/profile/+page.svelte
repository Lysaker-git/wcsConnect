<script lang="ts">
  import { invalidate } from '$app/navigation';
  import { enhance } from '$app/forms';
  import * as Icon from 'svelte-flag-icons';
  
  export let data: { user?: { id?: string; email?: string } | null; profile?: any; myEvents?: any[] };


  $: isSuperUser = (data.profile?.userRole ?? []).includes('Super User');
  $: stripeConnected = data.profile?.stripe_onboarding_complete === true;

  // Use static public URLs (moved to static/images/avatar/)
  const maleAvatar = '/images/avatar/male.png';
  const femaleAvatar = '/images/avatar/female.png';


  let user = data?.user ?? null;
  let profile = data?.profile ?? null;



  // --- NEW HELPER FUNCTIONS FOR DISPLAY ---

  // Helper function to calculate age from birthdate string ('YYYY-MM-DD')
  function calculateAge(birthdateString: string | undefined): number | null {
    if (!birthdateString) return null;
    try {
      const birthDate = new Date(birthdateString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDifference = today.getMonth() - birthDate.getMonth();
      // Adjust age if birthday hasn't occurred yet this year
      if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  }

  // Helper function to convert country name to a simple emoji flag (needs a full mapping for production)
  function getCountryFlag(countryName: string | undefined): string {
    if (!countryName) return '';
    // Simple mapping for common countries, or use a general fallback
    const flagMap: { [key: string]: string } = {
      'Norway': '🇳🇴',
      'United States': '🇺🇸',
      'United Kingdom': '🇬🇧',
      'Sweden': '🇸🇪',
      'Denmark': '🇩🇰'
    };
    return flagMap[countryName] || '🌐'; // Default to globe emoji
  }
  
  // Calculate age reactively when the profile data changes
  $: userAge = calculateAge(profile?.age);

  // Check if profile is incomplete
$: isProfileIncomplete = user && (!profile || (
    !profile.description ||
    !profile.avatar_url ||
    !profile.wsdcLevel ||
    !profile.country ||
    !profile.age
  ));

  // --- END HELPER FUNCTIONS ---

  // Sign-in form fields
  let signinEmail = '';
  let signinPassword = '';
  let signinMessage = '';
  let isSigningIn = false;
  let buttonPressed = false;

  // Create event fields
  let title = '';
  let start_date = '';
  let end_date = '';

  // Profile editing
  let editUsername = profile?.username ?? '';
  let editRole = profile?.role ?? 'follower';
  let editDescription = profile?.description ?? '';
  let editWsdcID = profile?.wsdcID ?? '';
  let editWsdcLevel = profile?.wsdcLevel ?? '';
  let editCountry = profile?.country ?? '';
  let editAge = profile?.age ?? '';
  // default to static male avatar so the image URL is valid
  let editAvatar = profile?.avatar_url ?? maleAvatar;
  let isSavingProfile = false;

  // Modal state
  let showModal = false;
  let showEventModal = false;
  let showDropdown = false;

  async function signIn(e: Event) {
    e.preventDefault();
    signinMessage = '';
    isSigningIn = true;
    const form = new FormData();
    form.set('email', signinEmail);
    form.set('password', signinPassword);

    const res = await fetch('/api/auth/signin', { method: 'POST', body: form, credentials: 'include' });


    // Check for the 303 redirect status sent by the server (success)
    if (res.status === 200) {
      window.location.href = '/profile';
      return; // Stop execution, the page is reloading
    }

    // If not a redirect, it's an error (400 or 500)
    let json;
    try {
    	json = await res.json();
    } catch (err) {
    	signinMessage = 'Sign in failed: Server returned unexpected response.';
    	console.error(err);
    	isSigningIn = false;
    	return;
    }
    
    // Handle API-reported errors
    signinMessage = 'Sign in failed: ' + (json?.error ?? JSON.stringify(json));
    isSigningIn = false;
  }

  async function handleProfileSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    console.log('Submitting profile update with data:', Object.fromEntries(formData.entries()));
    isSavingProfile = true;
    try {
      const res = await fetch('/profile?/updateProfile', {
        method: 'POST',
        body: formData,
        headers: {
          'accept': 'application/json'
        }
      });
      console.log('Profile update response:', res);
      const result = await res.json();
      console.log('Profile update result:', result);
      if (result.status === 200) {
        showModal = false;
        isSavingProfile = false;
        // Wait 2 seconds for database to sync before refreshing
        console.log('Wating for database sync...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        // Refresh all data
        location.reload();
      } else {
        isSavingProfile = false;
        alert('Failed to update profile: ' + (result.message || 'Unknown error'));
        location.reload();
      }
    } catch (err) {
      isSavingProfile = false;
      console.error('Profile update fetch error:', err);
      alert('Network error during profile update');
      location.reload();
    }
  }
</script>

<div class="bg-stone-900 text-stone-100">
  <div class="max-w-3xl mx-auto py-12 px-6">
  {#if user}
    {#if isProfileIncomplete}
      <div class="mb-6 p-4 bg-amber-900/20 border border-amber-700 text-amber-200 rounded-lg">
        <p class="font-semibold">Finish your profile</p>
        <p>Complete your profile to get the most out of the platform.</p>
        <button on:click={() => showModal = true} class="mt-3 px-4 py-2 bg-amber-600 text-white rounded-md font-semibold hover:bg-amber-700 transition">
          Complete my profile
        </button>
      </div>
    {/if}


    <!-- UPDATED PROFILE SECTION -->
    <section class="neomorph-card mb-8 p-6 rounded-lg bg-stone-800 shadow-xl">
      <div class="flex items-start gap-6">
        <!-- Avatar -->
        <img src={profile?.avatar_url ?? editAvatar} alt="avatar" class="w-20 h-20 rounded-full object-cover shadow-md ring-4 ring-amber-500" />
        
        <!-- Main Info -->
        <div>
          <h2 class="text-3xl font-extrabold text-stone-100 mb-1 leading-tight">
            {profile?.username ?? user.email}
          </h2>
          <p class="text-sm text-stone-100 font-mono">WSDC ID: {profile?.wsdcID ?? 'N/A'}</p>

          <!-- Status Badges -->
          <div class="mt-3 flex flex-wrap items-center gap-3">
            <!-- WSDC Level Badge -->
            {#if profile?.wsdcLevel}
              <span class="inline-flex items-center px-3 py-1 bg-amber-700 text-amber-100 text-xs font-semibold rounded-full shadow-md">
                Level: {profile.wsdcLevel}
              </span>
            {/if}

            <!-- Leader/Follower Role Badge (Original) -->
            {#if profile?.role}
              <span class="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full {profile.role === 'leader' ? 'bg-amber-800 text-amber-100' : 'bg-stone-700 text-stone-100'}">
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Country and Age Details -->
      <div class="mt-4 pt-4 border-t border-stone-700 flex flex-wrap gap-4 text-sm text-stone-300">
        
        {#if profile?.country}
          <div class="flex items-center gap-1 font-medium">
            {getCountryFlag(profile.country)} {profile.country}
          </div>
        {/if}
        
        {#if userAge !== null}
          <div class="text-stone-300">
            <span class="font-medium text-stone-100 font-black">{userAge}</span> years old
          </div>
        {/if}
      </div>


      <!-- Custom User Roles (Original) -->
      {#if profile?.userRole && profile.userRole.length}
        <div class="mt-4 flex flex-wrap gap-2 pt-4 border-t border-stone-700">
          {#each profile.userRole as r}
            <span class="inline-flex items-center rounded-md bg-stone-700/40 px-2 py-1 text-xs font-medium text-stone-100 ring-1 ring-inset ring-stone-600/30">{r}</span>
          {/each}
        </div>
      {/if}

      <!-- Profile Description -->
      {#if profile?.description}
        <p class="mt-4 text-stone-300 text-sm italic border-l-4 border-stone-700 pl-3">"{profile.description}"</p>
      {/if}
    </section>
    <!-- END UPDATED PROFILE SECTION -->

    <!-- My Events Section -->
    {#if data.myEvents && data.myEvents.length > 0}
      <section class="mb-8 p-6 rounded-lg bg-stone-800 shadow-xl neomorph-card" >
        <h2 class="text-2xl font-bold mb-4">My Events</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full table-auto">
            <thead>
              <tr class="bg-stone-800 border-b-3 border-stone-700">
                <th class="px-4 py-2 text-left text-xs font-medium text-stone-300 uppercase tracking-wider">Event</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-stone-300 uppercase tracking-wider">Start Date</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-stone-300 uppercase tracking-wider">End Date</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-stone-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-stone-800 divide-y divide-stone-700">
              {#each data.myEvents as event}
                <tr>
                  <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-stone-100">{event.title}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-stone-300">{new Date(event.start_date).toLocaleDateString()}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-stone-300">{new Date(event.end_date).toLocaleDateString()}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm font-medium">
                    <a href="/admin/events/{event.id}" class="text-amber-400 hover:text-amber-300">Admin Portal</a>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}

      <!-- My Registrations Section -->
      <section class="mb-8 p-6 rounded-lg bg-stone-800 shadow-xl neomorph-card">
        <h2 class="text-2xl font-light mb-4">My Registrations</h2>
        {#if data.myRegistrations && data.myRegistrations.length > 0}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {#each data.myRegistrations as reg}
              <div class="relative bg-stone-800 rounded-2xl flex flex-col justify-between p-6 neomorph-card">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <div>
                      <p class="text-sm text-stone-300">Event</p>
                      <p class="font-semibold text-lg text-stone-100">{reg.event?.title || reg.event_id}</p>
                      {#if reg.event?.start_date}
                        <p class="text-xs text-stone-300">{new Date(reg.event.start_date).toLocaleDateString()} - {new Date(reg.event.end_date).toLocaleDateString()}</p>
                      {/if}
                    </div>
                    <!-- Status Icon -->
                    <span class="ml-2">
                      {#if reg.status === 'pending' || reg.status === 'pending_couples_registration'}
                        <svg class="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
                      {:else if reg.status === 'approved'}
                        <svg class="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {:else if reg.status === 'rejected'}
                        <svg class="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      {:else}
                        <svg class="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /></svg>
                      {/if}
                    </span>
                  </div>
                </div>
                <div class="mt-6">
                    <a href={`/profile/${reg.id}`} class="inline-block w-full px-3 py-3 bg-amber-600 text-white rounded-lg font-semibold text-center shadow hover:bg-amber-700 transition">Manage my registration</a>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-sm text-stone-300">You have no registrations yet.</p>
        {/if}
      </section>

    <!-- Settings Dropdown -->
    <section class="mt-6 p-6 rounded-lg bg-stone-800 shadow relative neomorph-card">
      {#if isSuperUser}
        {#if stripeConnected}
          <div class="stripe-connect-banner p-2 mb-4 bg-stone-900/90 rounded-md text-sm text-center">
            <p class="italic">Stripe account connected.</p>
          </div>
            {:else}
          <a href="/api/stripe/connect" class="block mt-4 mb-2 px-4 py-2 bg-amber-600 text-white rounded-md font-semibold text-center shadow hover:bg-amber-700 transition">
                Connect with Stripe to sell tickets
          </a>
        {/if}
      {/if}
      <button on:click={() => showDropdown = !showDropdown} class="px-4 py-2 bg-stone-700 text-stone-100 rounded-md flex items-center gap-2">
        <span>⚙️</span> Actions
      </button>
      {#if showDropdown}
        <div class="absolute left-6 w-48 bg-stone-800 border border-stone-700 rounded-md shadow-lg z-10 overflow-hidden">
          <button on:click={() => { showModal = true; showDropdown = false; }} class="block w-full text-left px-4 py-2 text-stone-100 hover:bg-stone-900">Edit Profile</button>
          {#if user && (profile?.userRole?.includes('Owner') || profile?.userRole?.includes('Superuser') || profile?.userRole?.includes('EventDirector'))}
            <a href="/admin/events/createEvent" class="block w-full text-left px-4 py-2 text-stone-100 hover:bg-stone-700">Create Event</a>
          {/if}
        </div>
      {/if}

    </section>

    <!-- Modal -->
    {#if showModal}
    <div class="fixed inset-0 bg-black/30 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div class="bg-stone-800 rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] flex flex-col">
        <div class="p-6 overflow-y-auto flex-1 min-h-0">
            <h3 class="text-xl font-semibold mb-4 text-stone-100">Edit Profile</h3>
            <form on:submit|preventDefault={handleProfileSubmit} class="space-y-4">
              <div>
                <label for="edit-username" class="block text-sm font-medium text-stone-100">Full Name</label>
                <input id="edit-username" bind:value={editUsername} type="text" name="username" required class="mt-1 block w-full rounded-md border-gray-200 shadow-sm bg-stone-700 text-stone-100" />
              </div>

              <div>
                <label for="edit-role" class="block text-sm font-medium text-stone-100">Role</label>
                <select id="edit-role" bind:value={editRole} name="role" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm bg-stone-700 text-stone-100">
                  <option value="follower">Follower</option>
                  <option value="leader">Leader</option>
                </select>
              </div>

              <div>
                <label for="edit-description" class="block text-sm font-medium text-stone-100">Description</label>
                <textarea id="edit-description" bind:value={editDescription} name="description" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm bg-stone-700 text-stone-100" rows="3"></textarea>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="edit-wsdcID" class="block text-sm font-medium text-stone-100">WSDC ID</label>
                  <input id="edit-wsdcID" bind:value={editWsdcID} type="number" name="wsdcID" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm bg-stone-700 text-stone-100" maxlength="5" />
                </div>

                <div>
                  <label for="edit-wsdcLevel" class="block text-sm font-medium text-stone-100">WSDC Level</label>
                  <input id="edit-wsdcLevel" bind:value={editWsdcLevel} type="text" name="wsdcLevel" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm bg-stone-700 text-stone-100" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="edit-country" class="block text-sm font-medium text-stone-100">Country</label>
                  <input id="edit-country" bind:value={editCountry} type="text" name="country" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm bg-stone-700 text-stone-100" />
                </div>

                <div>
                  <label for="edit-age" class="block text-sm font-medium text-stone-100">Age (Birthdate)</label>
                  <input id="edit-age" bind:value={editAge} type="date" name="age" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm bg-stone-700 text-stone-100" />
                </div>
              </div>

              <fieldset class="mt-2">
                <legend class="block text-sm font-medium text-stone-100">Avatar</legend>
                <div class="mt-2 flex items-center gap-4">
                  <label class="inline-flex items-center gap-2">
                    <input id="edit-avatar-male" type="radio" bind:group={editAvatar} name="avatar" value="/images/avatar/male.png" />
                    <img src={maleAvatar} alt="male avatar" class="w-12 h-12 rounded-full" />
                  </label>
                  <label class="inline-flex items-center gap-2">
                    <input id="edit-avatar-female" type="radio" bind:group={editAvatar} name="avatar" value="/images/avatar/female.png" />
                    <img src={femaleAvatar} alt="female avatar" class="w-12 h-12 rounded-full" />
                  </label>
                </div>
              </fieldset>

              <div class="flex justify-end gap-2 pt-4">
                <button type="button" on:click={() => showModal = false} class="px-4 py-2 bg-stone-700 text-stone-100 rounded-md">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isSavingProfile}
                  class="px-4 py-2 bg-amber-600 text-white rounded-md transition-all duration-200 font-semibold {isSavingProfile ? 'bg-amber-500 cursor-not-allowed flex items-center gap-2' : 'hover:bg-amber-700 active:scale-95'}"
                >
                  {#if isSavingProfile}
                    <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  {:else}
                    Save
                  {/if}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    {/if}

    <!-- Event Creation Modal removed; now handled in /admin/events/createEvent -->

    <!-- Signing In Modal -->
    {#if isSigningIn}
      <div class="fixed inset-0 bg-black/30 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-fade-in">
        <div class="bg-stone-800 rounded-lg shadow-lg p-8 animate-bounce-in max-w-sm w-full">
          <div class="flex flex-col items-center gap-4">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600"></div>
            <p class="text-lg font-medium text-stone-100">Signing you in...</p>
            <p class="text-sm text-stone-300">Please wait while we authenticate your account.</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Saving Profile Modal -->
    {#if isSavingProfile}
      <div class="fixed inset-0 bg-white/10 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-fade-in">
        <div class="bg-white rounded-lg shadow-lg p-8 animate-bounce-in max-w-sm w-full">
          <div class="flex flex-col items-center gap-4">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600"></div>
            <p class="text-lg font-medium text-gray-700">Saving your profile...</p>
            <p class="text-sm text-gray-500">Please wait while we update your information.</p>
          </div>
        </div>
      </div>
    {/if}
  {/if}
  </div>
</div>

<style>
  .animate-fade-in {
    animation: fadeIn 0.3s ease-in-out;
  }

  .animate-bounce-in {
    animation: bounceIn 0.5s ease-out;
  }

  .neomorph-card {
    box-shadow:
      5px 5px 18px rgba(2,6,23,0.5),
      -5px -5px 12px rgba(255,255,255,0.08);
    border-radius: 1.25rem;
    border: none;
    border: 2px solid rgba(255,255,255,0.02);
  }

	input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:active
  {
    /* The large inset box-shadow covers the browser's background */
    -webkit-box-shadow: 0 0 0 1000px #1c1917bd inset !important;
    /* Change the text color to match your design */
    -webkit-text-fill-color: #F5F5F4 !important;
    /* Optional: Add a smooth transition */
    transition: background-color 5000s ease-in-out 0s;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes bounceIn {
    0% {
      transform: scale(0.3);
      opacity: 0;
    }
    50% {
      transform: scale(1.05);
    }
    70% {
      transform: scale(0.9);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>
