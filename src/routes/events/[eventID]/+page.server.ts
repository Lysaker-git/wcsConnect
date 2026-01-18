import { selectFromSupabase } from '$lib/api/selectFromSupabase';
import type { PageLoad } from './$types';

// The load function receives the 'params' object which contains the dynamic segments of the URL.
export const load: PageLoad = async ({ params }) => {
    const eventId = params.eventID;

    console.log('[Event Load] Received eventID param:', eventId);

    console.log(`[Event Load] Attempting to fetch event with ID: ${eventId}`);

    // Assuming selectFromSupabase supports filtering using a structure like:
    // { column: 'id', operator: 'eq', value: eventId }
    // This fetches the row where the 'id' column equals the eventId.
    const { data: events, error } = await selectFromSupabase(
        'events',
        '*',
        eventId // Select all columns
        
    );
    console.log('[Event Load] Supabase response - data:', events);

    if (error) {
        console.error(`[Event Load] Database Error: ${error.message}`);
        return { event: null, error: error.message };
    }
    
    // Supabase returns the object directly (not an array)
    const event = events ?? null;

    if (!event) {
        console.warn(`[Event Load] Event not found for ID: ${eventId}`);
        return { event: null, error: 'Event not found' };
    }
    
    // Return the single event object
    return { event };
}
