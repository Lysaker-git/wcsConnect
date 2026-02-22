<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/api/supabaseClient';

  // Accordion state
  let openSection = 'events';

  let stripe_fee_model: 'on_top' | 'included' = 'on_top';

  // Events table fields
  let title = '';
  let start_date = '';
  let end_date = '';

  // Event details fields
  let description = '';
  let address = '';
  let hotel = '';
  let venue = '';
  let max_participants = '';
  let organizer_name = '';
  let organizer_email = '';
  let organizer_phone = '';
  let social_links = '';
  let schedule_image_url = '';
  let transportation = '';
  let event_type = '';
  let banner_image_url = '';
  let promo_video_url = '';
  let accessibility = '';
  let languages = '';
  let tags = '';
  let registration_opens = '';

  // Event crew fields (array of crew members)
  let crew = [
    { name: '', role: '', description: '' }
  ];

  let isSubmitting = false;
  function addCrewMember() {
    crew = [...crew, { name: '', role: '', description: '' }];
  }

  function removeCrewMember(idx: number) {
    crew = crew.filter((_, i) => i !== idx);
  }

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
      form.append('stripe_fee_model', stripe_fee_model);
      form.append('registration_opens', registration_opens);

      // encode crew as JSON string for server-side parsing
      form.append('crew', JSON.stringify(crew));

      // Add action key so SvelteKit routes to the named action
      form.append('createEvent', '1');

      const res = await fetch(window.location.pathname, {
        method: 'POST',
        body: form,
        credentials: 'same-origin'
      });

      // If the server redirected (success), navigate client-side
      if (res.redirected) {
        await goto(res.url);
        return;
      }

      // Handle non-OK responses
      if (!res.ok) {
        let body = null;
        try { body = await res.json(); } catch (err) { body = await res.text(); }
        const message = body?.message || body || `Failed (${res.status})`;
        alert('Error creating event: ' + message);
        return;
      }

      // Success without redirect: try to parse response
      try {
        const data = await res.json();
        console.log('Event created successfully:', data);
        // If action returned event id or location, redirect
        if (data?.redirect) {
          await goto(data.redirect);
        } else {
          // fallback: go to events admin
          await goto('/admin/events');
        }
      } catch (err) {
        await goto('/admin/events');
      }
    } catch (err) {
      console.error(err);
      alert('Unexpected error creating event');
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="max-w-3xl mx-auto py-8 px-4">
  <h1 class="text-3xl font-bold mb-8 text-stone-200 text-center">Create Event</h1>
  
  <form on:submit={handleSubmit} class="space-y-4">
    <!-- Accordion: Events -->
    <div class="neomorph-card rounded-2xl overflow-hidden bg-stone-800">
      <button 
        type="button" 
        class="bg-stone-800 w-full px-6 py-4 text-left font-semibold text-stone-200 flex justify-between items-center transition-all hover:text-[var(--color-stone-400)]"
        class:neomorph-pressed={openSection === 'events'}
        on:click={() => openSection = openSection === 'events' ? '' : 'events'}
      >
        <span>Event Basics</span>
        <span class="text-xl font-light transition-transform" class:rotate-45={openSection === 'events'}>+</span>
      </button>
      {#if openSection === 'events'}
        <div class="px-6 pb-6 pt-2 space-y-4">
          <div>
            <label for="title" class="block text-sm font-medium text-stone-200 mb-1.5">Title</label>
            <input id="title" type="text" bind:value={title} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" required />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="start_date" class="block text-sm font-medium text-stone-200 mb-1.5">Start Date</label>
              <input id="start_date" type="date" bind:value={start_date} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" required />
            </div>
            <div>
              <label for="end_date" class="block text-sm font-medium text-stone-200 mb-1.5">End Date</label>
              <input id="end_date" type="date" bind:value={end_date} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" required />
            </div>
          </div>
          <div class="mt-4">
            <p class="block text-sm font-medium text-stone-200 mb-2">Stripe Payment Fee (3.5%)</p>
            <div class="flex gap-3">
              <button
                type="button"
                class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border"
                class:bg-amber-700={stripe_fee_model === 'on_top'}
                class:text-stone-200={stripe_fee_model === 'on_top'}
                class:border-amber-800={stripe_fee_model === 'on_top'}
                class:bg-stone-100={stripe_fee_model === 'included'}
                class:text-stone-800={stripe_fee_model === 'included'}
                class:border-stone-200={stripe_fee_model === 'included'}
                on:click={() => stripe_fee_model = 'on_top'}
              >
                Add on top of ticket price
              </button>
              <button
                type="button"
                class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border"
                class:bg-amber-700={stripe_fee_model === 'included'}
                class:text-stone-200={stripe_fee_model === 'included'}
                class:border-amber-800={stripe_fee_model === 'included'}
                class:bg-stone-100={stripe_fee_model === 'on_top'}
                class:text-stone-800={stripe_fee_model === 'on_top'}
                class:border-stone-200={stripe_fee_model === 'on_top'}
                on:click={() => stripe_fee_model = 'included'}
              >
                Include in ticket price
              </button>
            </div>
            <p class="text-xs text-gray-400 mt-2">
              {#if stripe_fee_model === 'on_top'}
                Buyers will see a 3.5% payment handling fee added to their total.
              {:else}
                You've already factored the 3.5% Stripe fee into your ticket prices.
              {/if}
            </p>
          </div>
          <div class="mt-4">
            <label for="registration_opens" class="block text-sm font-medium text-gray-600 mb-1.5">
              Registration Opens
            </label>
            <input
              id="registration_opens"
              type="datetime-local"
              bind:value={registration_opens}
              class="neumorph-input w-full px-4 py-2.5 rounded-xl text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20"
            />
            <p class="text-xs text-gray-400 mt-1">
              Leave empty to allow registration immediately when published.
            </p>
          </div>
        </div>
      {/if}
    </div>

    <!-- Accordion: Event Details -->
    <div class="neomorph-card rounded-2xl overflow-hidden bg-stone-800">
      <button 
        type="button" 
        class="w-full px-6 py-4 text-left font-semibold text-gray-700 flex justify-between items-center transition-all hover:text-[var(--color-blue-700)]"
        class:neomorph-pressed={openSection === 'details'}
        on:click={() => openSection = openSection === 'details' ? '' : 'details'}
      >
        <span class="text-stone-200">Event Details</span>
        <span class="text-xl font-light transition-transform" class:rotate-45={openSection === 'details'}>+</span>
      </button>
      {#if openSection === 'details'}
        <div class="px-6 pb-6 pt-2 space-y-4">
          <div>
            <label for="description" class="block text-sm font-medium text-stone-200 mb-1.5">Description</label>
            <textarea id="description" bind:value={description} rows="4" class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none resize-y transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="address" class="block text-sm font-medium text-stone-200 mb-1.5">Address</label>
              <input id="address" type="text" bind:value={address} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
            </div>
            <div>
                            <label for="venue" class="block text-sm font-medium text-stone-200 mb-1.5">Venue</label>
                            <input id="venue" type="text" bind:value={venue} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="hotel" class="block text-sm font-medium text-stone-200 mb-1.5">Hotel</label>
              <input id="hotel" type="text" bind:value={hotel} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
            </div>
            <div>
              <label for="max_participants" class="block text-sm font-medium text-stone-200 mb-1.5">Max Participants</label>
              <input id="max_participants" type="number" bind:value={max_participants} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="organizer_name" class="block text-sm font-medium text-stone-200 mb-1.5">Organizer Name</label>
              <input id="organizer_name" type="text" bind:value={organizer_name} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
            </div>
            <div>
              <label for="organizer_email" class="block text-sm font-medium text-stone-200 mb-1.5">Organizer Email</label>
              <input id="organizer_email" type="email" bind:value={organizer_email} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
            </div>
          </div>

          <div>
            <label for="organizer_phone" class="block text-sm font-medium text-stone-200 mb-1.5">Organizer Phone</label>
            <input id="organizer_phone" type="text" bind:value={organizer_phone} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
          </div>

          <div>
            <label for="social_links" class="block text-sm font-medium text-stone-200 mb-1.5">Social Media Links (JSON)</label>
            <input id="social_links" type="text" bind:value={social_links} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
          </div>

          <div>
            <label for="schedule_image_url" class="block text-sm font-medium text-stone-200 mb-1.5">Schedule Image URL</label>
            <input id="schedule_image_url" type="text" bind:value={schedule_image_url} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
          </div>

          <div>
            <label for="transportation" class="block text-sm font-medium text-stone-200 mb-1.5">Transportation</label>
            <input id="transportation" type="text" bind:value={transportation} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="event_type" class="block text-sm font-medium text-stone-200 mb-1.5">Event Type</label>
              <input id="event_type" type="text" bind:value={event_type} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" placeholder="Workshop, Competition, Social" />
            </div>
            <div>
              <label for="languages" class="block text-sm font-medium text-stone-200 mb-1.5">Languages</label>
              <input id="languages" type="text" bind:value={languages} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" placeholder="English, Norwegian" />
            </div>
          </div>

          <div>
            <label for="banner_image_url" class="block text-sm font-medium text-stone-200 mb-1.5">Banner Image URL</label>
            <input id="banner_image_url" type="text" bind:value={banner_image_url} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
          </div>

          <div>
            <label for="promo_video_url" class="block text-sm font-medium text-stone-200 mb-1.5">Promo Video URL</label>
            <input id="promo_video_url" type="text" bind:value={promo_video_url} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" />
          </div>

          <div>
            <label for="accessibility" class="block text-sm font-medium text-stone-200 mb-1.5">Accessibility</label>
            <input id="accessibility" type="text" bind:value={accessibility} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" placeholder="Wheelchair accessible, ASL available" />
          </div>

          <div>
            <label for="tags" class="block text-sm font-medium text-stone-200 mb-1.5">Tags (comma separated)</label>
            <input id="tags" type="text" bind:value={tags} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" placeholder="salsa, bachata, kizomba" />
          </div>
        </div>
      {/if}
    </div>

    <!-- Accordion: Event Crew -->
    <div class="neomorph-card rounded-2xl overflow-hidden bg-stone-800">
      <button 
        type="button" 
        class="w-full px-6 py-4 text-left font-semibold text-gray-700 flex justify-between items-center transition-all hover:text-[var(--color-stone-600)]"
        class:neomorph-pressed={openSection === 'crew'}
        on:click={() => openSection = openSection === 'crew' ? '' : 'crew'}
      >
        <span class="text-stone-200">Event Crew</span>
        <span class="text-xl font-light transition-transform" class:rotate-45={openSection === 'crew'}>+</span>
      </button>
      {#if openSection === 'crew'}
        <div class="px-6 pb-6 pt-2 space-y-4">
          {#each crew as member, idx}
            <div class="rounded-xl bg-stone-800">
              <div class="flex justify-between items-center mb-3">
                <h4 class="font-semibold text-stone-200">Crew Member {idx + 1}</h4>
                {#if crew.length > 1}
                  <button 
                    type="button" 
                    class="w-8 h-8 rounded-lg text-red-500 hover:text-red-600 flex items-center justify-center transition-all"
                    on:click={() => removeCrewMember(idx)}
                    title="Remove this member"
                  >
                    ✕
                  </button>
                {/if}
              </div>
              
              <div class="space-y-3">
                <div>
                  <label for={`crew-${idx}-name`} class="block text-sm font-medium text-stone-200 mb-1.5">Name</label>
                  <input id={`crew-${idx}-name`} type="text" bind:value={member.name} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" placeholder="Full name (or leave blank to link later)" />
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label for={`crew-${idx}-role`} class="block text-sm font-medium text-stone-200 mb-1.5">Role</label>
                    <input id={`crew-${idx}-role`} type="text" bind:value={member.role} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" placeholder="Teacher, DJ, Judge" />
                  </div>
                  <div>
                    <label for={`crew-${idx}-description`} class="block text-sm font-medium text-stone-200 mb-1.5">Description</label>
                    <input id={`crew-${idx}-description`} type="text" bind:value={member.description} class="bg-stone-700 w-full px-4 py-2.5 rounded-xl text-stone-200 outline-none transition-all focus:ring-2 focus:ring-[var(--color-blue-700)]/20" placeholder="Brief description" />
                  </div>
                </div>
              </div>
            </div>
          {/each}
          
          <button type="button" class="neumorph-btn w-full py-3 rounded-xl font-semibold text-[var(--color-stone-200)] transition-all hover:shadow-lg flex items-center justify-center gap-2" on:click={addCrewMember}>
            <span class="text-xl font-light">+</span>
            Add Crew Member
          </button>
        </div>
      {/if}
    </div>

    <button type="submit" class="w-full py-4 rounded-xl font-bold text-stone-200 bg-amber-700 hover:bg-amber-800 duration-300 transition-all mt-6 disabled:opacity-60 disabled:cursor-not-allowed" disabled={isSubmitting}>
      {#if isSubmitting}
        Creating...
      {:else}
        Create Event
      {/if}
    </button>
  </form>
</div>

<style>
  .neomorph-card {
    box-shadow:
      5px 5px 18px rgba(2,6,23,0.5),
      -5px -5px 12px rgba(255,255,255,0.08);
    border-radius: 1.25rem;
    border: none;
    border: 2px solid rgba(255,255,255,0.02);
  }
</style>