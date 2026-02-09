<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '$lib/api/supabaseClient';

  export let showModal = false;
  export let eventId: string;

  const dispatch = createEventDispatcher();

  let participants: any[] = [];
  let loading = false;

  // Load participants when modal opens
  $: if (showModal) {
    loadParticipants();
  }

  async function loadParticipants() {
    loading = true;
    try {

      const response = await supabase
        .from('event_participants')
        .select(`
          id,
          event_role,
          user_id,
          profiles!user_id (
            id,
            username,
            role
          )
        `)
        .eq('event_id', eventId);

        console.log('🔗 [ParticipantsModal] Fetched participants:', response);
      if (response.status !== 200) {
        throw new Error('Failed to load participants');
      }
      return participants = response.data || [];
    } catch (error) {
      console.error('Error loading participants:', error);
      alert('Failed to load participants');
    } finally {
      loading = false;
    }
  }

  async function toggleRole(participant: any) {
    const newRole = participant.event_role === 'Event Director' ? 'attendee' : 'Event Director';

    try {
      const response = await fetch(`?/updateParticipantRole`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ participantId: participant.id, newRole })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update participant role');
      }

      // Update local state
      participant.event_role = newRole;
      participants = [...participants]; // Trigger reactivity
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update participant role');
    }
  }

  function closeModal() {
    showModal = false;
    dispatch('close');
  }

  function getUserDisplayName(profile: any) {
    return profile?.username || 'Unknown User';
  }
</script>

{#if showModal}
  <div class="fixed inset-0 bg-white/10 backdrop-blur-lg flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
      <div class="p-6 flex-shrink-0">
        <h3 class="text-xl font-semibold mb-4">Event Participants</h3>
        <p class="text-sm text-gray-600">Manage participant roles for this event</p>
      </div>
      <div class="px-6 pb-6 overflow-y-auto flex-1">
        {#if loading}
          <div class="text-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p class="mt-2 text-gray-600">Loading participants...</p>
          </div>
        {:else if participants.length === 0}
          <p class="text-gray-500 text-center py-8">No participants found for this event.</p>
        {:else}
          <div class="space-y-4">
            {#each participants as participant}
              <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div class="flex-1">
                  <div class="flex items-center space-x-3">
                    <div>
                      <p class="text-sm font-medium text-gray-900">
                        {getUserDisplayName(participant.profiles)}
                      </p>
                      <p class="text-sm text-gray-500">{participant.profiles?.username || 'Unknown'}</p>
                    </div>
                  </div>
                  <div class="mt-1">
                    <span class={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      participant.event_role === 'Event Director'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {participant.event_role}
                    </span>
                    <span class={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-2 ${
                      participant.profiles?.role === 'leader'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {participant.profiles?.role || 'follower'}
                    </span>
                  </div>
                </div>

                <div class="flex items-center space-x-2">
                  <button
                    on:click={() => toggleRole(participant)}
                    class="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    title={participant.event_role === 'Event Director' ? 'Demote to Attendee' : 'Promote to Event Director'}
                  >
                    {#if participant.event_role === 'Event Director'}
                      <!-- Down arrow for demote -->
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                      </svg>
                    {:else}
                      <!-- Up arrow for promote -->
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                      </svg>
                    {/if}
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <div class="flex justify-end mt-6 pt-4 border-t">
          <button
            on:click={closeModal}
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}