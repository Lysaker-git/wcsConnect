<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let showModal = false;
  export let eventData: any;
  export let eventDetailsData: any;

  const dispatch = createEventDispatcher();

  // Form data
  let title = '';
  let startDate = '';
  let endDate = '';
  let description = '';
  let address = '';
  let hotel = '';
  let venue = '';
  let maxParticipants = '';

  // Initialize form when modal opens
  $: if (showModal && eventData) {
    title = eventData.title || '';
    startDate = eventData.start_date ? new Date(eventData.start_date).toISOString().split('T')[0] : '';
    endDate = eventData.end_date ? new Date(eventData.end_date).toISOString().split('T')[0] : '';
    description = eventDetailsData?.description || '';
    address = eventDetailsData?.address || '';
    hotel = eventDetailsData?.hotel || '';
    venue = eventDetailsData?.venue || '';
    maxParticipants = eventDetailsData?.max_participants?.toString() || '';
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();

    try {
      const eventUpdate = {
        title,
        start_date: startDate,
        end_date: endDate
      };

      const eventDetailsUpdate = {
        description,
        address,
        hotel,
        venue,
        max_participants: maxParticipants ? parseInt(maxParticipants) : null
      };

      const response = await fetch(`?/updateEventDetails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventData: eventUpdate,
          eventDetailsData: eventDetailsUpdate
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event details');
      }

      dispatch('success');
      closeModal();
    } catch (error) {
      console.error('Error updating event details:', error);
      alert('Failed to update event details: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  function closeModal() {
    showModal = false;
    dispatch('close');
  }
</script>

{#if showModal}
  <div class="fixed inset-0 bg-white/10 backdrop-blur-lg flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
      <div class="p-6 flex-shrink-0">
        <h3 class="text-xl font-semibold mb-4">Edit Event Details</h3>
      </div>
      <div class="px-6 pb-6 overflow-y-auto flex-1">
        <form on:submit={handleSubmit} class="space-y-6">
          <!-- Event Basic Info -->
          <div class="border-b pb-4">
            <h4 class="text-lg font-medium text-gray-900 mb-4">Event Information</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label for="edit-title" class="block text-sm font-medium text-gray-700">Title *</label>
                <input
                  id="edit-title"
                  bind:value={title}
                  type="text"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label for="edit-start-date" class="block text-sm font-medium text-gray-700">Start Date *</label>
                <input
                  id="edit-start-date"
                  bind:value={startDate}
                  type="date"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label for="edit-end-date" class="block text-sm font-medium text-gray-700">End Date *</label>
                <input
                  id="edit-end-date"
                  bind:value={endDate}
                  type="date"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <!-- Event Details -->
          <div>
            <h4 class="text-lg font-medium text-gray-900 mb-4">Additional Details</h4>

            <div class="space-y-4">
              <div>
                <label for="edit-description" class="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  id="edit-description"
                  bind:value={description}
                  rows="4"
                  placeholder="Event description..."
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                ></textarea>
              </div>

              <div>
                <label for="edit-address" class="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  id="edit-address"
                  bind:value={address}
                  rows="2"
                  placeholder="Full address..."
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                ></textarea>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="edit-venue" class="block text-sm font-medium text-gray-700">Venue</label>
                  <input
                    id="edit-venue"
                    bind:value={venue}
                    type="text"
                    placeholder="Venue name"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label for="edit-hotel" class="block text-sm font-medium text-gray-700">Hotel</label>
                  <input
                    id="edit-hotel"
                    bind:value={hotel}
                    type="text"
                    placeholder="Recommended hotel"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label for="edit-max-participants" class="block text-sm font-medium text-gray-700">Max Participants</label>
                <input
                  id="edit-max-participants"
                  bind:value={maxParticipants}
                  type="number"
                  min="1"
                  placeholder="Maximum number of participants"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              on:click={closeModal}
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Update Event
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}