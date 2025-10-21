<script lang="ts">
  import { invalidate } from '$app/navigation';
  import maleAvatar from '$lib/images/avatar/male.png';
  import femaleAvatar from '$lib/images/avatar/female.png';

  export let data: { user?: { id?: string; email?: string } | null; profile?: any };

  let user = data?.user ?? null;
  let profile = data?.profile ?? null;

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
  let editAvatar = profile?.avatar_url ?? '/lib/images/avatar/male.png';

  async function signIn(e: Event) {
    e.preventDefault();
    signinMessage = '';
    const form = new FormData();
    form.set('email', signinEmail);
    form.set('password', signinPassword);

    const res = await fetch('/api/auth/signin', { method: 'POST', body: form });
    const json = await res.json();
    if (res.ok) {
      signinMessage = 'Signed in successfully';
      // refresh page data
      await invalidate('/profile');
      // update local user
      user = json.user;
    } else {
      signinMessage = 'Sign in failed: ' + (json?.error ?? JSON.stringify(json));
    }
  }

  async function onSubmit(e: Event) {
    e.preventDefault();
    const ok = confirm(`Create event "${title}" from ${start_date} to ${end_date}?`);
    if (!ok) return;

    // Use FormData to submit to the SvelteKit action (avoid 415)
    const form = new FormData();
    form.set('title', title);
    form.set('start_date', start_date);
    form.set('end_date', end_date);
    console.log('[profile page] sending FormData entries:', Array.from(form.entries()));

    const res = await fetch('/profile', { method: 'POST', body: form });
    console.log('[profile page] fetch response:', res);

    let json: any = null;
    try {
      json = await res.json();
      console.log('[profile page] parsed json:', json);
    } catch (err) {
      // non-json response
      console.error('[profile page] failed to parse json from response', err);
      alert('Server error: ' + String(err));
      return;
    }

    if (res.ok) {
      alert('Event created successfully!');
      // reset form
      title = '';
      start_date = '';
      end_date = '';
      await invalidate('/events');
    } else {
      console.error('[profile page] server returned error:', json);
      alert('Error creating event: ' + (json?.message ?? JSON.stringify(json)));
    }
  }
</script>

<div class="max-w-3xl mx-auto py-12 px-6">
  {#if user}
    <section class="mb-8 p-6 rounded-lg bg-white shadow">
      <div class="flex items-center gap-4">
        <img src={profile?.avatar_url ?? editAvatar} alt="avatar" class="w-16 h-16 rounded-full object-cover" />
        <div>
          <h2 class="text-2xl font-bold mb-1">{profile?.username ?? user.email}</h2>
          <p class="text-sm text-gray-500">{profile?.role ?? 'follower'} • User ID: {user.id}</p>
        </div>
      </div>
    </section>
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
        const res = await fetch('/api/profile', { method: 'POST', body: form });
        const json = await res.json();
        if (res.ok) {
          alert('Profile updated');
          await invalidate('/profile');
        } else {
          alert('Profile update failed: ' + (json?.error?.message ?? JSON.stringify(json)));
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
              <input id="edit-avatar-male" type="radio" bind:group={editAvatar} name="avatar" value="/lib/images/avatar/male.png" />
              <img src={maleAvatar} alt="male avatar" class="w-12 h-12 rounded-full" />
            </label>
            <label class="inline-flex items-center gap-2">
              <input id="edit-avatar-female" type="radio" bind:group={editAvatar} name="avatar" value="/lib/images/avatar/female.png" />
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
