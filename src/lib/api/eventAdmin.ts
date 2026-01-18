import { supabase } from './supabaseClient';

export async function updateEventDetails(eventId: string, eventData: any, eventDetailsData: any) {
  // Update events table
  const { data: eventUpdate, error: eventError } = await supabase
    .from('events')
    .update({
      title: eventData.title,
      start_date: eventData.start_date,
      end_date: eventData.end_date,
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .select()
    .single();

  if (eventError) {
    throw new Error(`Failed to update event: ${eventError.message}`);
  }

  // Update or insert event_details
  const { data: detailsUpdate, error: detailsError } = await supabase
    .from('event_details')
    .upsert({
      event_id: eventId,
      description: eventDetailsData.description || null,
      address: eventDetailsData.address || null,
      hotel: eventDetailsData.hotel || null,
      venue: eventDetailsData.venue || null,
      max_participants: eventDetailsData.max_participants || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'event_id'
    })
    .select()
    .single();

  if (detailsError) {
    throw new Error(`Failed to update event details: ${detailsError.message}`);
  }

  return { event: eventUpdate, eventDetails: detailsUpdate };
}

export async function getEventParticipants(eventId: string) {
  const { data, error } = await supabase
    .from('event_participants')
    .select(`
      id,
      event_role,
      created_at,
      user:user_id (
        id,
        email,
        raw_user_meta_data
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch participants: ${error.message}`);
  }

  return data;
}

export async function updateParticipantRole(participantId: string, newRole: string) {
  const { data, error } = await supabase
    .from('event_participants')
    .update({
      event_role: newRole,
      updated_at: new Date().toISOString()
    })
    .eq('id', participantId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update participant role: ${error.message}`);
  }

  return data;
}