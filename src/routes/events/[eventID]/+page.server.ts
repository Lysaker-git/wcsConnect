import { selectFromSupabase } from '$lib/api/selectFromSupabase';
import type { PageLoad } from './$types';

// The load function receives the 'params' object which contains the dynamic segments of the URL.
export const load: PageLoad = async ({ params }) => {
    const eventId = params.eventID;

    console.log(`[Event Load] Attempting to fetch event with ID: ${eventId}`);

    // Assuming selectFromSupabase supports filtering using a structure like:
    // { column: 'id', operator: 'eq', value: eventId }
    // This fetches the row where the 'id' column equals the eventId.
    const { data: events, error } = await selectFromSupabase(
        'events',
        '*', // Select all columns
        { column: 'id', operator: 'eq', value: eventId }
    );

    if (error) {
        console.error(`[Event Load] Database Error: ${error.message}`);
        return { event: null, error: error.message };
    }
    
    // Supabase select returns an array, so we extract the first (and only) matching event.
    const event = events?.[0] ?? null;

    if (!event) {
        console.warn(`[Event Load] Event not found for ID: ${eventId}`);
        // Throwing a 404 error is often appropriate here if the event isn't found
        // throw error(404, 'Event not found'); 
        return { event: null, error: 'Event not found' };
    }
    
    // Return the single event object
    return { event };
}
