import { supabase } from '$lib/api/supabaseClient';
import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const { eventId } = params;
    const { eventData, eventDetailsData } = await request.json();

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

    return json({ event: eventUpdate, eventDetails: detailsUpdate });
  } catch (error) {
    console.error('Error updating event details:', error);
    return json({ error: error.message }, { status: 500 });
  }
};