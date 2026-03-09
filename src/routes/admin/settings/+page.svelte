<script lang="ts">
  import { enhance } from '$app/forms';

  export let data: { banner: { message: string; is_active: boolean; updated_at: string | null } };
  export let form: { success?: boolean; error?: string } | null = null;

  let message = data.banner.message;
  let is_active = data.banner.is_active;
  let isSaving = false;
</script>

<div class="max-w-2xl space-y-6">

  <div>
    <h1 class="text-2xl font-bold text-stone-100">Site Settings</h1>
    <p class="text-stone-400 text-sm mt-1">Manage site-wide announcements and settings</p>
  </div>

  <!-- Status Banner -->
  <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6 space-y-5">
    <div>
      <h2 class="text-lg font-semibold text-stone-100">Status Banner</h2>
      <p class="text-stone-500 text-sm mt-0.5">Shown at the top of every page when active</p>
    </div>

    <form
      method="POST"
      action="?/saveBanner"
      use:enhance={() => {
        isSaving = true;
        return async ({ update }) => {
          await update();
          isSaving = false;
        };
      }}
      class="space-y-4"
    >
      <!-- Preview -->
      {#if message.trim()}
        <div class="rounded-xl overflow-hidden border border-stone-700">
          <p class="text-xs text-stone-500 px-3 py-1.5 bg-stone-900 border-b border-stone-700 uppercase tracking-wide font-medium">Preview</p>
          <div class="bg-amber-600/90 text-white text-sm text-center px-4 py-2.5 font-medium tracking-wide">
            {message}
          </div>
        </div>
      {/if}

      <!-- Message -->
      <div>
        <label for="banner-message" class="block text-sm font-medium text-stone-400 mb-1.5">Message</label>
        <textarea
          id="banner-message"
          name="message"
          bind:value={message}
          rows="3"
          placeholder="e.g. Payment is now open — log in to complete your registration."
          class="w-full px-4 py-3 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 resize-none text-sm"
        ></textarea>
      </div>

      <!-- Active toggle -->
      <div class="flex items-center justify-between p-4 bg-stone-900 rounded-xl border border-stone-700">
        <div>
          <p class="text-sm font-medium text-stone-200">Show banner</p>
          <p class="text-xs text-stone-500 mt-0.5">Toggle visibility without clearing the message</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" bind:checked={is_active} class="sr-only peer" />
          <div class="w-10 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:bg-amber-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4"></div>
        </label>
        <!-- Hidden inputs to pass toggle state -->
        <input type="hidden" name="is_active" value={is_active ? 'true' : 'false'} />
      </div>

      {#if form?.success}
        <p class="text-sm text-green-400">Saved successfully.</p>
      {:else if form?.error}
        <p class="text-sm text-red-400">{form.error}</p>
      {/if}

      <button
        type="submit"
        disabled={isSaving}
        class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition disabled:opacity-50 text-sm"
      >
        {isSaving ? 'Saving…' : 'Save'}
      </button>
    </form>

    {#if data.banner.updated_at}
      <p class="text-xs text-stone-600">
        Last updated: {new Date(data.banner.updated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
      </p>
    {/if}
  </div>

</div>
