<script lang="ts">
  export let data: { event?: any, eventDetails?: any };
  const event = data?.event;
  const eventDetails = data?.eventDetails;

  // Prefill form fields using loaded data
  let openSection = 'events';

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
  let social_links = eventDetails?.social_links ? JSON.stringify(eventDetails.social_links) : '';
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

<div class="max-w-3xl mx-auto py-8 px-4">
  <h1 class="text-3xl font-bold mb-8 text-gray-800 text-center">Update Event</h1>
  
  <form on:submit={handleSubmit} class="space-y-4">
    <!-- Accordion: Events -->
    <div class="neumorph-card rounded-2xl overflow-hidden">
      <button 
        type="button" 
        class="w-full px-6 py-4 text-left font-semibold text-gray-700 flex justify-between items-center transition-all hover:text-[var(--color-blue-700)]"
        class:neumorph-pressed={openSection === 'events'}
        on:click={() => openSection = openSection === 'events' ? '' : 'events'}
      >
        <span>Event Basics</span>
        <span class="text-xl font-light transition-transform" class:rotate-45={openSection === 'events'}>+</span>
      </button>
      {#if openSection === 'events'}
        <div class="px-6 pb-6 pt-2 space-y-4">
          <div>
            <label for="title" class="block text-sm font-medium text-gray-600 mb-1.5">Title</label>
            <input id="title" type="text" bind:value={title} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" required />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="start_date" class="block text-sm font-medium text-gray-600 mb-1.5">Start Date</label>
              <input id="start_date" type="date" bind:value={start_date} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" required />
            </div>
            <div>
              <label for="end_date" class="block text-sm font-medium text-gray-600 mb-1.5">End Date</label>
              <input id="end_date" type="date" bind:value={end_date} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" required />
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Accordion: Event Details -->
    <div class="neumorph-card rounded-2xl overflow-hidden">
      <button 
        type="button" 
        class="w-full px-6 py-4 text-left font-semibold text-gray-700 flex justify-between items-center transition-all hover:text-[var(--color-blue-700)]"
        class:neumorph-pressed={openSection === 'details'}
        on:click={() => openSection = openSection === 'details' ? '' : 'details'}
      >
        <span>Event Details</span>
        <span class="text-xl font-light transition-transform" class:rotate-45={openSection === 'details'}>+</span>
      </button>
      {#if openSection === 'details'}
        <div class="px-6 pb-6 pt-2 space-y-4">
          <div>
            <label for="description" class="block text-sm font-medium text-gray-600 mb-1.5">Description</label>
            <textarea id="description" bind:value={description} rows="4" class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none resize-y transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="address" class="block text-sm font-medium text-gray-600 mb-1.5">Address</label>
              <input id="address" type="text" bind:value={address} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
            </div>
            <div>
                            <label for="venue" class="block text-sm font-medium text-gray-600 mb-1.5">Venue</label>
                            <input id="venue" type="text" bind:value={venue} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="hotel" class="block text-sm font-medium text-gray-600 mb-1.5">Hotel</label>
              <input id="hotel" type="text" bind:value={hotel} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
            </div>
            <div>
              <label for="max_participants" class="block text-sm font-medium text-gray-600 mb-1.5">Max Participants</label>
              <input id="max_participants" type="number" bind:value={max_participants} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="organizer_name" class="block text-sm font-medium text-gray-600 mb-1.5">Organizer Name</label>
              <input id="organizer_name" type="text" bind:value={organizer_name} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
            </div>
            <div>
              <label for="organizer_email" class="block text-sm font-medium text-gray-600 mb-1.5">Organizer Email</label>
              <input id="organizer_email" type="email" bind:value={organizer_email} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
            </div>
          </div>

          <div>
            <label for="organizer_phone" class="block text-sm font-medium text-gray-600 mb-1.5">Organizer Phone</label>
            <input id="organizer_phone" type="text" bind:value={organizer_phone} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
          </div>

          <div>
            <label for="social_links" class="block text-sm font-medium text-gray-600 mb-1.5">Social Media Links (JSON)</label>
            <input id="social_links" type="text" bind:value={social_links} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
          </div>

          <div>
            <label for="schedule_image_url" class="block text-sm font-medium text-gray-600 mb-1.5">Schedule Image URL</label>
            <input id="schedule_image_url" type="text" bind:value={schedule_image_url} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
          </div>

          <div>
            <label for="transportation" class="block text-sm font-medium text-gray-600 mb-1.5">Transportation</label>
            <input id="transportation" type="text" bind:value={transportation} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="event_type" class="block text-sm font-medium text-gray-600 mb-1.5">Event Type</label>
              <input id="event_type" type="text" bind:value={event_type} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" placeholder="Workshop, Competition, Social" />
            </div>
            <div>
              <label for="languages" class="block text-sm font-medium text-gray-600 mb-1.5">Languages</label>
              <input id="languages" type="text" bind:value={languages} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" placeholder="English, Norwegian" />
            </div>
          </div>

          <div>
            <label for="banner_image_url" class="block text-sm font-medium text-gray-600 mb-1.5">Banner Image URL</label>
            <input id="banner_image_url" type="text" bind:value={banner_image_url} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
          </div>

          <div>
            <label for="promo_video_url" class="block text-sm font-medium text-gray-600 mb-1.5">Promo Video URL</label>
            <input id="promo_video_url" type="text" bind:value={promo_video_url} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
          </div>

          <div>
            <label for="accessibility" class="block text-sm font-medium text-gray-600 mb-1.5">Accessibility</label>
            <input id="accessibility" type="text" bind:value={accessibility} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" placeholder="Wheelchair accessible, ASL available" />
          </div>

          <div>
            <label for="tags" class="block text-sm font-medium text-gray-600 mb-1.5">Tags (comma separated)</label>
            <input id="tags" type="text" bind:value={tags} class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" placeholder="salsa, bachata, kizomba" />
          </div>
        </div>
      {/if}
    </div>

    <button type="submit" class="neumorph-btn-submit w-full py-4 rounded-xl font-bold text-white bg-[var(--color-blue-700)] hover:bg-[var(--color-blue-800)] transition-all mt-6 disabled:opacity-60 disabled:cursor-not-allowed" disabled={isSubmitting}>
      {#if isSubmitting}
        Creating...
      {:else}
        Update Event
      {/if}
    </button>
  </form>
</div>

<style>
  /* Subtle neumorphism for white background */
  .neumorph-card {
    background: #ffffff;
    box-shadow: 
      3px 3px 6px rgba(0, 0, 0, 0.03),
      -3px -3px 6px rgba(255, 255, 255, 0.9);
  }

  .neumorph-subcard {
    background: #ffffff;
    box-shadow: 
      2px 2px 4px rgba(0, 0, 0, 0.02),
      -2px -2px 4px rgba(255, 255, 255, 0.8);
  }

  .neumorph-input {
    background: #ffffff;
    box-shadow: 
      inset 2px 2px 4px rgba(0, 0, 0, 0.04),
      inset -2px -2px 4px rgba(255, 255, 255, 0.7);
  }

  .neumorph-btn {
    background: #ffffff;
    box-shadow: 
      3px 3px 6px rgba(0, 0, 0, 0.03),
      -3px -3px 6px rgba(255, 255, 255, 0.9);
  }

  .neumorph-btn:hover {
    box-shadow: 
      4px 4px 8px rgba(0, 0, 0, 0.04),
      -4px -4px 8px rgba(255, 255, 255, 0.9);
  }

  .neumorph-btn:active {
    box-shadow: 
      inset 2px 2px 4px rgba(0, 0, 0, 0.04),
      inset -2px -2px 4px rgba(255, 255, 255, 0.7);
  }

  .neumorph-btn-small {
    background: #ffffff;
    box-shadow: 
      2px 2px 4px rgba(0, 0, 0, 0.03),
      -2px -2px 4px rgba(255, 255, 255, 0.9);
  }

  .neumorph-btn-small:active {
    box-shadow: 
      inset 2px 2px 3px rgba(0, 0, 0, 0.04),
      inset -2px -2px 3px rgba(255, 255, 255, 0.7);
  }

  .neumorph-pressed {
    box-shadow: 
      inset 2px 2px 4px rgba(0, 0, 0, 0.04),
      inset -2px -2px 4px rgba(255, 255, 255, 0.7);
  }

  .neumorph-btn-submit {
    box-shadow: 
      4px 4px 8px rgba(0, 0, 0, 0.08),
      -2px -2px 6px rgba(255, 255, 255, 0.4);
  }

  .neumorph-btn-submit:hover {
    box-shadow: 
      5px 5px 10px rgba(0, 0, 0, 0.1),
      -3px -3px 8px rgba(255, 255, 255, 0.4);
    transform: translateY(-1px);
  }

  .neumorph-btn-submit:active {
    box-shadow: 
      inset 3px 3px 6px rgba(0, 0, 0, 0.15),
      inset -1px -1px 3px rgba(255, 255, 255, 0.3);
    transform: translateY(0);
  }
</style>