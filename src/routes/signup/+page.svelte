<script lang="ts">
  import { invalidate } from '$app/navigation';
  import maleAvatar from '$lib/images/avatar/male.png';
  import femaleAvatar from '$lib/images/avatar/female.png';

  let email = '';
  let password = '';
  let username = '';
  let role: 'follower' | 'leader' = 'follower';
  let avatar = maleAvatar;
  let message: string | null = null;

  async function onSubmit(e: Event) {
    e.preventDefault();
    const form = new FormData();
    form.set('email', email);
    form.set('password', password);
    form.set('username', username);
    form.set('role', role);
    form.set('avatar', avatar as unknown as string);

    const res = await fetch('/signup', { method: 'POST', body: form });
    const json = await res.json();

    if (res.ok) {
      message = 'Signup successful! Check your email for confirmation (if required).';
      email = '';
      password = '';
      username = '';
      await invalidate('/');
    } else {
      message = 'Signup failed: ' + (json?.message ?? JSON.stringify(json));
    }
  }
</script>

<div class="max-w-md mx-auto py-12 px-6">
  <h1 class="text-2xl font-bold mb-4">Sign Up</h1>
  {#if message}
    <div class="mb-4 text-sm text-red-600">{message}</div>
  {/if}

  <form on:submit|preventDefault={onSubmit} class="space-y-4">
    <div>
      <label for="signup-email" class="block text-sm font-medium text-gray-700">Email</label>
      <input id="signup-email" bind:value={email} type="email" name="email" required class="mt-1 block w-full rounded-md border-gray-200 shadow-sm" />
    </div>

    <div>
      <label for="signup-password" class="block text-sm font-medium text-gray-700">Password</label>
      <input id="signup-password" bind:value={password} type="password" name="password" required class="mt-1 block w-full rounded-md border-gray-200 shadow-sm" />
    </div>

    <div>
      <label for="signup-username" class="block text-sm font-medium text-gray-700">Username</label>
      <input id="signup-username" bind:value={username} type="text" name="username" required class="mt-1 block w-full rounded-md border-gray-200 shadow-sm" />
    </div>

    <div>
      <label for="signup-role" class="block text-sm font-medium text-gray-700">Role</label>
      <select id="signup-role" bind:value={role} name="role" class="mt-1 block w-full rounded-md border-gray-200 shadow-sm">
        <option value="follower">Follower</option>
        <option value="leader">Leader</option>
      </select>
    </div>

    <fieldset class="mt-2">
      <legend class="block text-sm font-medium text-gray-700">Choose an avatar</legend>
      <div class="mt-2 flex gap-3">
        <label class="inline-flex items-center gap-2">
          <input id="signup-avatar-male" type="radio" bind:group={avatar} name="avatar" value={maleAvatar} checked />
          <img src={maleAvatar} alt="male avatar" class="w-10 h-10 rounded-full" />
        </label>
        <label class="inline-flex items-center gap-2">
          <input id="signup-avatar-female" type="radio" bind:group={avatar} name="avatar" value={femaleAvatar} />
          <img src={femaleAvatar} alt="female avatar" class="w-10 h-10 rounded-full" />
        </label>
      </div>
    </fieldset>

    <div>
      <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md">Sign Up</button>
    </div>
  </form>
</div>
