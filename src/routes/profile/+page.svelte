<script lang="ts">
  import { invalidate } from '$app/navigation';

  // Use static public URLs (moved to static/images/avatar/)
  const maleAvatar = '/images/avatar/male.png';
  const femaleAvatar = '/images/avatar/female.png';

  export let data: { user?: { id?: string; email?: string } | null; profile?: any };

  let user = data?.user ?? null;
  let profile = data?.profile ?? null;
  console.log('[profile page] loaded user data:', user);
  console.log('[profile page] loaded profile data:', profile);

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

  // --- END HELPER FUNCTIONS ---

  // Sign-in form fields
  let signinEmail = '';
  let signinPassword = '';
  let signinMessage = '';

  // Create event fields
  let title = '';
  let start_date = '';
  let end_date = '';

  // Profile editing
  let editUsername = profile?.username ?? '';
  let editRole = profile?.role ?? 'follower';
  let editDescription = profile?.description ?? '';
  // default to static male avatar so the image URL is valid
  let editAvatar = profile?.avatar_url ?? maleAvatar;

  // keep editable fields in sync when `profile` is loaded/changes
  $: if (profile) {
    editUsername = profile.username ?? editUsername;
    editRole = profile.role ?? editRole;
    editDescription = profile.description ?? editDescription;
    editAvatar = profile.avatar_url ?? editAvatar;
  }

  async function signIn(e: Event) {
    e.preventDefault();
    signinMessage = '';
    const form = new FormData();
    form.set('email', signinEmail);
    form.set('password', signinPassword);

    const res = await fetch('/api/auth/signin', { method: 'POST', body: form, credentials: 'include' });

    // Check for the 303 redirect status sent by the server (success)
    if (res.status === 303) {
      window.location.href = '/';
      return; // Stop execution, the page is reloading
    }

    // If not a redirect, it's an error (400 or 500)
    let json;
    try {
    	json = await res.json();
    } catch (err) {
    	signinMessage = 'Sign in failed: Server returned unexpected response.';
    	console.error(err);
    	return;
    }
    
    // Handle API-reported errors
    signinMessage = 'Sign in failed: ' + (json?.error ?? JSON.stringify(json));
  }

  async function onSubmit(e: Event) {
    e.preventDefault();
    // NOTE: Replaced confirm() and alert() with console messages per best practices.
    console.log(`Attempting to create event "${title}" from ${start_date} to ${end_date}`);
    // if (!ok) return;

    // Use FormData to submit to the SvelteKit action (avoid 415)
    const form = new FormData();
    form.set('title', title);
    form.set('start_date', start_date);
    form.set('end_date', end_date);
    console.log('[profile page] sending FormData entries:', Array.from(form.entries()));

    const res = await fetch('/profile', { method: 'POST', body: form, credentials: 'include' });
    console.log('[profile page] fetch response:', res);

    let json: any = null;
    try {
      json = await res.json();
      console.log('[profile page] parsed json:', json);
    } catch (err) {
      // non-json response
      console.error('[profile page] failed to parse json from response', err);
      console.error('Server error: ' + String(err));
      return;
    }

    if (res.ok) {
      console.log('Event created successfully!');
      // reset form
      title = '';
      start_date = '';
      end_date = '';
      await invalidate('/events');
    } else {
      console.error('[profile page] server returned error:', json);
      console.error('Error creating event: ' + (json?.message ?? JSON.stringify(json)));
    }
  }
</script>

<div class="max-w-3xl mx-auto py-12 px-6">
  {#if user}
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


    <section class="p-6 rounded-lg bg-white shadow">
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

        <div class="pt-4">
          <button type="submit" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md">Create Event</button>
        </div>
      </form>
    </section>

    <!-- Profile edit form -->
    <section class="mt-6 p-6 rounded-lg bg-white shadow">
      <h3 class="text-xl font-semibold mb-4">Edit Profile</h3>
      <form on:submit|preventDefault={async (e) => {
        const form = new FormData();
        form.set('username', editUsername);
        form.set('role', editRole);
        form.set('description', editDescription);
        form.set('avatar', editAvatar);
        const res = await fetch('/api/profile', { method: 'POST', body: form, credentials: 'include' });
        const json = await res.json();
        if (res.ok) {
          console.log('Profile updated');
          await invalidate('/profile');
        } else {
          console.error('Profile update failed: ' + (json?.error?.message ?? JSON.stringify(json)));
        }
      }} class="space-y-4">
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

        <div>
          <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded-md">Save Profile</button>
        </div>
      </form>
    </section>
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
          <button type="submit" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md">Sign In</button>
        </div>
      </form>
    </section>
  {/if}
</div>
