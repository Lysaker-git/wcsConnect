<script lang="ts">
  import { invalidate } from '$app/navigation';
  import { enhance } from '$app/forms';
  import * as Icon from 'svelte-flag-icons';

  // Use static public URLs (moved to static/images/avatar/)
  const maleAvatar = '/images/avatar/male.png';
  const femaleAvatar = '/images/avatar/female.png';

  export let data: { user?: { id?: string; email?: string } | null; profile?: any; myEvents?: any[] };

  console.log('🔗 [profile +page.svelte] Loaded data:', data);
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
    !profile.wsdcID ||
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

  async function onSubmit(e: Event) {
    e.preventDefault();
    const form = new FormData();
    form.set('title', title);
    form.set('start_date', start_date);
    form.set('end_date', end_date);

    const res = await fetch('/profile?/createEvent', { method: 'POST', body: form, credentials: 'include' });

    let json: any = null;
    try {
      json = await res.json();
    } catch (err) {
      console.error('[profile page] failed to parse json from response', err);
      console.error('Server error: ' + String(err));
      return;
    }

    if (res.ok) {
      title = '';
      start_date = '';
      end_date = '';
      showEventModal = false;
      await invalidate('/events');
    } else {
      console.error('[profile page] server returned error:', json);
      console.error('Error creating event: ' + (json?.message ?? JSON.stringify(json)));
    }
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
      if (result.success) {
        showModal = false;
        isSavingProfile = false;
        // Wait 2 seconds for database to sync before refreshing
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Refresh all data
        await invalidate('/profile');
      } else {
        isSavingProfile = false;
        alert('Failed to update profile: ' + (result.message || 'Unknown error'));
      }
    } catch (err) {
      isSavingProfile = false;
      console.error('Profile update fetch error:', err);
      alert('Network error during profile update');
    }
  }
</script>

<div class="max-w-3xl mx-auto py-12 px-6">
  {#if user}
    {#if isProfileIncomplete}
      <div class="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
        <p class="font-semibold">Finish your profile</p>
        <p>Complete your profile to get the most out of the platform.</p>
      </div>
    {/if}

    <!-- UPDATED PROFILE SECTION -->
    <section class="mb-8 p-6 rounded-lg bg-white shadow-xl border-t-4 border-blue-500">
      <div class="flex items-start gap-6">
        <!-- Avatar -->
        <img src={profile?.avatar_url ?? editAvatar} alt="avatar" class="w-20 h-20 rounded-full object-cover shadow-md ring-4 ring-blue-100" />
        
        <!-- Main Info -->
        <div>
          <h2 class="text-3xl font-extrabold text-gray-800 mb-1 leading-tight">
            {profile?.username ?? user.email}
          </h2>
          <p class="text-sm text-gray-500 font-mono">WSDC ID: {profile?.wsdcID ?? 'N/A'}</p>

          <!-- Status Badges -->
          <div class="mt-3 flex flex-wrap items-center gap-3">
            <!-- WSDC Level Badge -->
            {#if profile?.wsdcLevel}
              <span class="inline-flex items-center px-3 py-1 bg-indigo-500 text-white text-xs font-semibold rounded-full shadow-md">
                Level: {profile.wsdcLevel}
              </span>
            {/if}

            <!-- Leader/Follower Role Badge (Original) -->
            {#if profile?.role}
              <span class="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full {profile.role === 'leader' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Country and Age Details -->
      <div class="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-sm text-gray-700">
        
        {#if profile?.country}
          <div class="flex items-center gap-1 font-medium">
            {getCountryFlag(profile.country)} {profile.country}
          </div>
        {/if}
        
        {#if userAge !== null}
          <div class="text-gray-500">
            <span class="font-medium text-gray-700">{userAge}</span> years old
          </div>
        {/if}
      </div>


      <!-- Custom User Roles (Original) -->
      {#if profile?.userRole && profile.userRole.length}
        <div class="mt-4 flex flex-wrap gap-2 pt-4 border-t border-gray-100">
          {#each profile.userRole as r}
            <span class="inline-flex items-center rounded-md bg-gray-400/10 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-400/20">{r}</span>
          {/each}
        </div>
      {/if}

      <!-- Profile Description -->
      {#if profile?.description}
        <p class="mt-4 text-gray-600 text-sm italic border-l-4 border-gray-200 pl-3">"{profile.description}"</p>
      {/if}
    </section>
    <!-- END UPDATED PROFILE SECTION -->

    <!-- My Events Section -->
    {#if data.myEvents && data.myEvents.length > 0}
      <section class="mb-8 p-6 rounded-lg bg-white shadow-xl border-t-4 border-green-500">
        <h2 class="text-2xl font-bold mb-4">My Events</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full table-auto">
            <thead>
              <tr class="bg-gray-50">
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each data.myEvents as event}
                <tr>
                  <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{event.title}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{new Date(event.start_date).toLocaleDateString()}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{new Date(event.end_date).toLocaleDateString()}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm font-medium">
                    <button class="text-blue-600 hover:text-blue-900 mr-4">View Registration</button>
                    <a href="/admin/events/{event.id}" class="text-green-600 hover:text-green-900">Admin Portal</a>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}

    <!-- Settings Dropdown -->
    <section class="mt-6 p-6 rounded-lg bg-white shadow relative">
      <button on:click={() => showDropdown = !showDropdown} class="px-4 py-2 bg-gray-600 text-white rounded-md flex items-center gap-2">
        <span>⚙️</span> Actions
      </button>
      {#if showDropdown}
        <div class="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <button on:click={() => { showModal = true; showDropdown = false; }} class="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">Edit Profile</button>
          {#if user && (profile?.userRole?.includes('Owner') || profile?.userRole?.includes('Superuser') || profile?.userRole?.includes('EventDirector'))}
            <button on:click={() => { showEventModal = true; showDropdown = false; }} class="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">Create Event</button>
          {/if}
        </div>
      {/if}
    </section>

    <!-- Modal -->
    {#if showModal}
      <div class="fixed inset-0 bg-white/10 backdrop-blur-lg flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-hidden">
          <div class="p-6 overflow-y-auto max-h-full">
            <h3 class="text-xl font-semibold mb-4">Edit Profile</h3>
            <form on:submit|preventDefault={handleProfileSubmit} class="space-y-4">
              <div>
                <label for="edit-username" class="block text-sm font-medium text-gray-700">Username</label>
                <input id="edit-username" bind:value={editUsername} type="text" name="username" required class="mt-1 block w-full rounded-md border-gray-200 shadow-sm" />
              </div>

              <div>
                <label for="edit-role" class="block text-sm font-medium text-gray-700">Role</label>
                <select id="edit-role" bind:value={editRole} name="role" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm">
                  <option value="follower">Follower</option>
                  <option value="leader">Leader</option>
                </select>
              </div>

              <div>
                <label for="edit-description" class="block text-sm font-medium text-gray-700">Description</label>
                <textarea id="edit-description" bind:value={editDescription} name="description" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm" rows="3"></textarea>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="edit-wsdcID" class="block text-sm font-medium text-gray-700">WSDC ID</label>
                  <input id="edit-wsdcID" bind:value={editWsdcID} type="number" name="wsdcID" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm" maxlength="5" />
                </div>

                <div>
                  <label for="edit-wsdcLevel" class="block text-sm font-medium text-gray-700">WSDC Level</label>
                  <input id="edit-wsdcLevel" bind:value={editWsdcLevel} type="text" name="wsdcLevel" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="edit-country" class="block text-sm font-medium text-gray-700">Country</label>
                  <input id="edit-country" bind:value={editCountry} type="text" name="country" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm" />
                </div>

                <div>
                  <label for="edit-age" class="block text-sm font-medium text-gray-700">Age (Birthdate)</label>
                  <input id="edit-age" bind:value={editAge} type="date" name="age" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm" />
                </div>
              </div>

              <fieldset class="mt-2">
                <legend class="block text-sm font-medium text-gray-700">Avatar</legend>
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
                <button type="button" on:click={() => showModal = false} class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isSavingProfile}
                  class="px-4 py-2 bg-green-600 text-white rounded-md transition-all duration-200 font-semibold {isSavingProfile ? 'bg-green-500 cursor-not-allowed flex items-center gap-2' : 'hover:bg-green-700 active:scale-95'}"
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

    <!-- Event Creation Modal -->
    {#if showEventModal}
      <div class="fixed inset-0 bg-white/10 backdrop-blur-lg flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-hidden">
          <div class="p-6 overflow-y-auto max-h-full">
            <h3 class="text-xl font-semibold mb-4">Create Event</h3>
            <form on:submit|preventDefault={onSubmit} class="space-y-4">
              <div>
                <label for="title-input" class="block text-sm font-medium text-gray-700">Event Title</label>
                <input id="title-input" bind:value={title} type="text" name="title" required class="mt-1 block w-full rounded-md border-gray-200 shadow-sm" />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="start-date-input" class="block text-sm font-medium text-gray-700">Start Date</label>
                  <input id="start-date-input" bind:value={start_date} type="date" name="start_date" required class="mt-1 block w-full rounded-md border-gray-200 shadow-sm" />
                </div>
                <div>
                  <label for="end-date-input" class="block text-sm font-medium text-gray-700">End Date</label>
                  <input id="end-date-input" bind:value={end_date} type="date" name="end_date" required class="mt-1 block w-full rounded-md border-gray-200 shadow-sm" />
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-4">
                <button type="button" on:click={() => showEventModal = false} class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md">Create Event</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    {/if}

    <!-- Signing In Modal -->
    {#if isSigningIn}
      <div class="fixed inset-0 bg-white/10 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-fade-in">
        <div class="bg-white rounded-lg shadow-lg p-8 animate-bounce-in max-w-sm w-full">
          <div class="flex flex-col items-center gap-4">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
            <p class="text-lg font-medium text-gray-700">Signing you in...</p>
            <p class="text-sm text-gray-500">Please wait while we authenticate your account.</p>
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

  {:else}
    <section class="mb-8 p-6 rounded-lg bg-white shadow">
      <h2 class="text-2xl font-bold mb-2">Sign In</h2>
      {#if signinMessage}
        <div class="mb-4 text-sm text-red-600">{signinMessage}</div>
      {/if}
      <form on:submit|preventDefault={signIn} class="space-y-4">
        <div>
          <label for="signin-email-input" class="block text-sm font-medium text-gray-700">Email</label>
          <input id="signin-email-input" bind:value={signinEmail} type="email" name="email" required class="mt-1 block w-full rounded-md border-gray-200 shadow-sm" />
        </div>
        <div>
          <label for="signin-password-input" class="block text-sm font-medium text-gray-700">Password</label>
          <input id="signin-password-input" bind:value={signinPassword} type="password" name="password" required class="mt-1 block w-full rounded-md border-gray-200 shadow-sm" />
        </div>
        <div class="pt-4">
          <button 
            type="submit" 
            disabled={isSigningIn}
            class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md transition-all duration-200 font-semibold {isSigningIn ? 'bg-blue-500 cursor-not-allowed' : 'hover:bg-blue-700 active:scale-95'}" 
            on:mousedown={() => !isSigningIn && (buttonPressed = true)} 
            on:mouseup={() => buttonPressed = false} 
            on:mouseleave={() => buttonPressed = false}
          >
            {#if isSigningIn}
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing In...
            {:else}
              Sign In
            {/if}
          </button>
        </div>
      </form>
    </section>
  {/if}
</div>

<style>
  .animate-fade-in {
    animation: fadeIn 0.3s ease-in-out;
  }

  .animate-bounce-in {
    animation: bounceIn 0.5s ease-out;
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
