<script lang="ts">
  export let data: { event?: any, eventDetails?: any };
  const event = data?.event;
  const eventDetails = data?.eventDetails;

  // Prefill form fields using loaded data
  let openSection = 'events';
  let registration_opens = event?.registration_opens
    ? new Date(event.registration_opens).toISOString().slice(0, 16)
    : '';

  let title = event?.title ?? '';
  let start_date = event?.start_date ?? '';
  let end_date = event?.end_date ?? '';

  let description = eventDetails?.description ?? '';
  let address = eventDetails?.address ?? '';
  let hotel = eventDetails?.hotel ?? '';
  let venue = eventDetails?.venue ?? '';
  let max_participants = eventDetails?.max_participants ?? '';
  let organizer_name = eventDetails?.organizer_name ?? '';
  let organizer_email = eventDetails?.organizer_email ?? '';
  let organizer_phone = eventDetails?.organizer_phone ?? '';
  let social_links = eventDetails?.social_links
    ? (Array.isArray(eventDetails.social_links)
      ? eventDetails.social_links.join(', ')
      : JSON.stringify(eventDetails.social_links))
    : '';
  let schedule_image_url = eventDetails?.schedule_image_url ?? '';
  let transportation = eventDetails?.transportation ?? '';
  let event_type = eventDetails?.event_type ?? '';
  let banner_image_url = eventDetails?.banner_image_url ?? '';
  let promo_video_url = eventDetails?.promo_video_url ?? '';
  let accessibility = eventDetails?.accessibility ?? '';
  let languages = eventDetails?.languages ?? '';
  let tags = eventDetails?.tags ? (Array.isArray(eventDetails.tags) ? eventDetails.tags.join(', ') : String(eventDetails.tags)) : '';

  let isSubmitting = false;

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('start_date', start_date);
      form.append('end_date', end_date);
      form.append('registration_opens', registration_opens);

      form.append('description', description);
      form.append('address', address);
      form.append('hotel', hotel);
      form.append('venue', venue);
      form.append('max_participants', String(max_participants ?? ''));
      form.append('organizer_name', organizer_name);
      form.append('organizer_email', organizer_email);
      form.append('organizer_phone', organizer_phone);
      form.append('social_links', social_links);
      form.append('schedule_image_url', schedule_image_url);
      form.append('transportation', transportation);
      form.append('event_type', event_type);
      form.append('banner_image_url', banner_image_url);
      form.append('promo_video_url', promo_video_url);
      form.append('accessibility', accessibility);
      form.append('languages', languages);
      form.append('tags', tags);

      const res = await fetch(window.location.pathname, {
        method: 'POST',
        body: form,
        credentials: 'same-origin'
      });

      if (res.redirected) {
        window.location.href = res.url;
        return;
      }

      if (!res.ok) {
        let body = null;
        try { body = await res.json(); } catch (err) { body = await res.text(); }
        const message = body?.message || body || `Failed (${res.status})`;
        alert('Error updating event: ' + message);
        return;
      }

      try {
        const data = await res.json();
        if (data?.redirect) {
          window.location.href = data.redirect;
        } else {
          window.location.href = `/admin/events/${event?.id}`;
        }
      } catch (err) {
        window.location.href = `/admin/events/${event?.id}`;
      }
    } catch (err) {
      console.error(err);
      alert('Unexpected error updating event');
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="bg-stone-900 min-h-screen py-8">
  <div class="max-w-3xl mx-auto px-4">
    <h1 class="text-2xl font-extrabold mb-8 text-stone-300 text-center">Update Event</h1>

    <form on:submit={handleSubmit} class="space-y-4">
      <!-- Accordion: Event Basics -->
      <div class="stone-card rounded-2xl overflow-hidden">
        <button
          type="button"
          class="w-full px-6 py-4 text-left font-semibold text-stone-300 flex justify-between items-center transition-colors hover:text-stone-100"
          class:stone-pressed={openSection === 'events'}
          on:click={() => openSection = openSection === 'events' ? '' : 'events'}
        >
          <span>Event Basics</span>
          <span class="text-xl font-light transition-transform" class:rotate-45={openSection === 'events'}>+</span>
        </button>
        {#if openSection === 'events'}
          <div class="px-6 pb-6 pt-2 space-y-4 border-t border-stone-700">
            <div>
              <label for="title" class="block text-sm font-medium text-stone-400 mb-1.5">Title</label>
              <input id="title" type="text" bind:value={title} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" required />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="start_date" class="block text-sm font-medium text-stone-400 mb-1.5">Start Date</label>
                <input id="start_date" type="date" bind:value={start_date} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" required />
              </div>
              <div>
                <label for="end_date" class="block text-sm font-medium text-stone-400 mb-1.5">End Date</label>
                <input id="end_date" type="date" bind:value={end_date} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" required />
              </div>
            </div>
            <div>
              <label for="registration_opens" class="block text-sm font-medium text-stone-400 mb-1.5">
                Registration Opens
              </label>
              <input
                id="registration_opens"
                type="datetime-local"
                bind:value={registration_opens}
                class="stone-input w-full px-4 py-2.5 rounded-xl outline-none"
              />
              <p class="text-xs text-stone-500 mt-1">
                Leave empty to allow registration immediately when published.
              </p>
            </div>
          </div>
        {/if}
      </div>

      <!-- Accordion: Event Details -->
      <div class="stone-card rounded-2xl overflow-hidden">
        <button
          type="button"
          class="w-full px-6 py-4 text-left font-semibold text-stone-300 flex justify-between items-center transition-colors hover:text-stone-100"
          class:stone-pressed={openSection === 'details'}
          on:click={() => openSection = openSection === 'details' ? '' : 'details'}
        >
          <span>Event Details</span>
          <span class="text-xl font-light transition-transform" class:rotate-45={openSection === 'details'}>+</span>
        </button>
        {#if openSection === 'details'}
          <div class="px-6 pb-6 pt-2 space-y-4 border-t border-stone-700">
            <div>
              <label for="description" class="block text-sm font-medium text-stone-400 mb-1.5">Description</label>
              <textarea id="description" bind:value={description} rows="4" class="stone-input w-full px-4 py-2.5 rounded-xl outline-none resize-y"></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="address" class="block text-sm font-medium text-stone-400 mb-1.5">Address</label>
                <input id="address" type="text" bind:value={address} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" />
              </div>
              <div>
                <label for="venue" class="block text-sm font-medium text-stone-400 mb-1.5">Venue</label>
                <input id="venue" type="text" bind:value={venue} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="hotel" class="block text-sm font-medium text-stone-400 mb-1.5">Hotel</label>
                <input id="hotel" type="text" bind:value={hotel} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" />
              </div>
              <div>
                <label for="max_participants" class="block text-sm font-medium text-stone-400 mb-1.5">Max Participants</label>
                <input id="max_participants" type="number" bind:value={max_participants} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="organizer_name" class="block text-sm font-medium text-stone-400 mb-1.5">Organizer Name</label>
                <input id="organizer_name" type="text" bind:value={organizer_name} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" />
              </div>
              <div>
                <label for="organizer_email" class="block text-sm font-medium text-stone-400 mb-1.5">Organizer Email</label>
                <input id="organizer_email" type="email" bind:value={organizer_email} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" />
              </div>
            </div>

            <div>
              <label for="organizer_phone" class="block text-sm font-medium text-stone-400 mb-1.5">Organizer Phone</label>
              <input id="organizer_phone" type="text" bind:value={organizer_phone} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" />
            </div>

            <div>
              <label for="social_links" class="block text-sm font-medium text-stone-400 mb-1.5">Social Media Links</label>
              <input id="social_links" type="text" bind:value={social_links} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" />
              <p class="text-xs text-stone-500 mt-1">Separate multiple links with a comma and a space (i.e., link1, link2, link3)</p>
            </div>

            <div>
              <label for="schedule_image_url" class="block text-sm font-medium text-stone-400 mb-1.5">Schedule Image URL</label>
              <input id="schedule_image_url" type="text" bind:value={schedule_image_url} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" />
            </div>

            <div>
              <label for="transportation" class="block text-sm font-medium text-stone-400 mb-1.5">Transportation</label>
              <input id="transportation" type="text" bind:value={transportation} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="event_type" class="block text-sm font-medium text-stone-400 mb-1.5">Event Type</label>
                <input id="event_type" type="text" bind:value={event_type} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" placeholder="Workshop, Competition, Social" />
              </div>
              <div>
                <label for="languages" class="block text-sm font-medium text-stone-400 mb-1.5">Languages</label>
                <input id="languages" type="text" bind:value={languages} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" placeholder="English, Norwegian" />
                <p class="text-xs text-stone-500 mt-1">Separate multiple languages with a comma and a space</p>
              </div>
            </div>

            <div>
              <label for="banner_image_url" class="block text-sm font-medium text-stone-400 mb-1.5">Banner Image URL</label>
              <input id="banner_image_url" type="text" bind:value={banner_image_url} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" />
            </div>

            <div>
              <label for="promo_video_url" class="block text-sm font-medium text-stone-400 mb-1.5">Promo Video URL</label>
              <input id="promo_video_url" type="text" bind:value={promo_video_url} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" />
            </div>

            <div>
              <label for="accessibility" class="block text-sm font-medium text-stone-400 mb-1.5">Accessibility</label>
              <input id="accessibility" type="text" bind:value={accessibility} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" placeholder="Wheelchair accessible, ASL available" />
            </div>

            <div>
              <label for="tags" class="block text-sm font-medium text-stone-400 mb-1.5">Tags (comma separated)</label>
              <input id="tags" type="text" bind:value={tags} class="stone-input w-full px-4 py-2.5 rounded-xl outline-none" placeholder="salsa, bachata, kizomba" />
            </div>
          </div>
        {/if}
      </div>

      <button
        type="submit"
        class="w-full py-4 rounded-xl font-bold text-white bg-amber-700 hover:bg-amber-800 transition-all mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={isSubmitting}
      >
        {#if isSubmitting}
          Saving...
        {:else}
          Update Event
        {/if}
      </button>
    </form>
  </div>
</div>

<style>
  .stone-card {
    background: #1c1917; /* stone-900 */
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      5px 5px 18px rgba(2, 6, 23, 0.5),
      -5px -5px 12px rgba(255, 255, 255, 0.04);
  }

  .stone-pressed {
    background: #292524; /* stone-800 */
  }

  .stone-input {
    background: #292524; /* stone-800 */
    border: 1px solid #44403c; /* stone-600 */
    color: #d6d3d1; /* stone-300 */
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .stone-input:focus {
    border-color: #78716c; /* stone-500 */
    box-shadow: 0 0 0 3px rgba(120, 113, 108, 0.15);
  }

  .stone-input::placeholder {
    color: #78716c; /* stone-500 */
  }
</style>
