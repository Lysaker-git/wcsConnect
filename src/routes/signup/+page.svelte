<script lang="ts">
  import { goto } from '$app/navigation';
  
  const maleAvatar = '/images/avatar/male.png';
  const femaleAvatar = '/images/avatar/female.png';

  let email = '';
  let password = '';
  let username = '';
  let role: 'follower' | 'leader' = 'follower';
  let avatar_url = maleAvatar;
  let message: string | null = null;
  let isSubmitting = false;

  async function onSubmit(e: Event) {
    e.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;
    message = null;

    const form = new FormData();
    form.set('email', email);
    form.set('password', password);
    form.set('username', username);
    form.set('role', role);
    form.set('avatar_url', avatar_url);

    try {
      const res = await fetch('?/signUp', { method: 'POST', body: form, credentials: 'include' });
      
      if (res.redirected) {
        await goto(res.url);
        return;
      }

      const json = await res.json();
      if (!res.ok) {
        message = json?.message ?? 'Signup failed';
      }
    } catch (err) {
      message = 'Something went wrong, please try again';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="bg-stone-950/90 w-full">
  <div class="max-w-md mx-auto py-12 px-6 w-full">
    <h1 class="text-stone-100 text-2xl font-bold mb-4">Sign Up</h1>
  {#if message}
    <div class="mb-4 text-sm text-red-600">{message}</div>
  {/if}

  <form on:submit|preventDefault={onSubmit} class="space-y-4">
    <div>
      <label for="signup-email" class="block text-sm font-medium text-stone-300">Email</label>
      <input id="signup-email" bind:value={email} type="email" name="email" required class="mt-1 block w-full rounded-md border-stone-700 bg-stone-800 text-stone-100 shadow-sm" />
    </div>

    <div>
      <label for="signup-password" class="block text-sm font-medium text-stone-300">Password</label>
      <input id="signup-password" bind:value={password} type="password" name="password" required class="mt-1 block w-full rounded-md border-stone-700 bg-stone-800 text-stone-100 shadow-sm" />
    </div>

    <div>
      <label for="signup-username" class="block text-sm font-medium text-stone-300">Username</label>
      <input id="signup-username" bind:value={username} type="text" name="username" required class="mt-1 block w-full rounded-md border-stone-700 bg-stone-800 text-stone-100 shadow-sm" />
    </div>

    <div>
      <label for="signup-role" class="block text-sm font-medium text-stone-300">Role</label>
      <select id="signup-role" bind:value={role} name="role" class="mt-1 block w-full rounded-md border-stone-700 bg-stone-800 text-stone-100 shadow-sm">
        <option value="follower">Follower</option>
        <option value="leader">Leader</option>
      </select>
    </div>

    <fieldset class="mt-2">
      <legend class="block text-sm font-medium text-stone-300">Choose an avatar</legend>
      <div class="mt-2 flex gap-3">
        <label class="inline-flex items-center gap-2">
          <input id="signup-avatar-male" type="radio" bind:group={avatar_url} name="avatar_url" value={maleAvatar} checked />
          <img src={maleAvatar} alt="male avatar" class="w-10 h-10 rounded-full" />
        </label>
        <label class="inline-flex items-center gap-2">
          <input id="signup-avatar-female" type="radio" bind:group={avatar_url} name="avatar_url" value={femaleAvatar} />
          <img src={femaleAvatar} alt="female avatar" class="w-10 h-10 rounded-full" />
        </label>
      </div>
    </fieldset>

    <div>
      <button type="submit" class="px-4 py-2 bg-stone-600 text-white rounded-md">Sign Up</button>
    </div>
  </form>
  </div>
</div>

<style>
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active
    {
      /* The large inset box-shadow covers the browser's background */
      -webkit-box-shadow: 0 0 0 1000px #1C1917 inset !important;
      /* Change the text color to match your design */
      -webkit-text-fill-color: #F5F5F4 !important;
      /* Optional: Add a smooth transition */
      transition: background-color 5000s ease-in-out 0s;
    }
  /* Add any additional styles if needed */
</style>