<script lang="ts">
  import { invalidate } from '$app/navigation';
  let email = '';
  let password = '';
  let message: string | null = null;

  async function onSubmit(e: Event) {
    e.preventDefault();
    const form = new FormData();
    form.set('email', email);
    form.set('password', password);

    const res = await fetch('/signup', { method: 'POST', body: form });
    const json = await res.json();

    if (res.ok) {
      message = 'Signup successful! Check your email for confirmation (if required).';
      email = '';
      password = '';
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
      <label class="block text-sm font-medium text-gray-700">Email</label>
      <input bind:value={email} type="email" name="email" required class="mt-1 block w-full rounded-md border-gray-200 shadow-sm" />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Password</label>
      <input bind:value={password} type="password" name="password" required class="mt-1 block w-full rounded-md border-gray-200 shadow-sm" />
    </div>
    <div>
      <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md">Sign Up</button>
    </div>
  </form>
</div>
