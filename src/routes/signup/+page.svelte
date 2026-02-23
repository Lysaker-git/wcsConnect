<script lang="ts">
  import { enhance } from '$app/forms';

  const maleAvatar = '/images/avatar/male.png';
  const femaleAvatar = '/images/avatar/female.png';

  let email = '';
  let password = '';
  let passwordConfirm = '';
  let username = '';
  let role: 'follower' | 'leader' = 'follower';
  let avatar_url = maleAvatar;
  let message: string | null = null;
  let isSubmitting = false;
  let termsAccepted = false;

  $: passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

</script>

<div class="bg-stone-950/90 w-full">
  <div class="max-w-md mx-auto py-12 px-6 w-full">
    <h1 class="text-stone-100 text-2xl font-bold mb-4">Sign Up</h1>
  {#if message}
    <div class="mb-4 text-sm text-red-600">{message}</div>
  {/if}

    <form 
      method="POST" 
      action="?/signUp"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ result, update }) => {
          isSubmitting = false;
          if (result.type === 'redirect') {
            window.location.href = result.location;
            return;
          }
          if (result.type === 'failure') {
            message = result.data?.message as string ?? 'Signup failed';
          }
          await update();
        };
      }}
      class="space-y-4"
    >
    <div>
      <label for="signup-email" class="block text-sm font-medium text-stone-300">Email</label>
      <input id="signup-email" bind:value={email} type="email" name="email" required class="mt-1 block w-full rounded-md border-stone-700 bg-stone-800 text-stone-100 shadow-sm" />
    </div>

    <div>
      <label for="signup-password" class="block text-sm font-medium text-stone-300">Password</label>
      <input id="signup-password" bind:value={password} type="password" name="password" required class="mt-1 block w-full rounded-md border-stone-700 bg-stone-800 text-stone-100 shadow-sm" />
    </div>

    <div>
      <label for="signup-password-confirm" class="block text-sm font-medium text-stone-300">
        Confirm Password
      </label>
      <input 
        id="signup-password-confirm" 
        bind:value={passwordConfirm} 
        type="password" 
        required 
        class="mt-1 block w-full rounded-md border-stone-700 bg-stone-800 text-stone-100 shadow-sm" 
      />
      {#if passwordMismatch}
        <p class="text-red-400 text-xs mt-1">Passwords do not match</p>
      {/if}
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

    <div class="flex items-start gap-2">
      <input
        id="terms"
        type="checkbox"
        bind:checked={termsAccepted}
        required
        class="mt-0.5 rounded border-stone-600 bg-stone-900 text-amber-500 focus:ring-amber-500"
      />
      <label for="terms" class="text-xs text-stone-400 leading-relaxed">
        I agree to the
        <a href="/terms" target="_blank" class="text-amber-400 hover:underline">Terms of Service</a>
        and
        <a href="/privacy" target="_blank" class="text-amber-400 hover:underline">Privacy Policy</a>
      </label>
    </div>

    <button 
      type="submit" 
      disabled={isSubmitting || passwordMismatch || password !== passwordConfirm || !termsAccepted}
      class="px-4 py-2 bg-stone-600 text-white rounded-md disabled:opacity-50"
    >
      {isSubmitting ? 'Creating account...' : 'Sign Up'}
    </button>
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