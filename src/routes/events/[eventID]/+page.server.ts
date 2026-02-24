import { selectFromSupabase, selectFromSupabaseDetailed } from '$lib/api/selectFromSupabase';
import type { PageServerLoad } from './$types';
import { error as svelteError } from '@sveltejs/kit';

// The server load receives the 'params' and can read cookies to determine auth state.
export const load: PageServerLoad = async ({ params, cookies }) => {
    const eventId = params.eventID;


    // Parse sb_user cookie to determine auth state
    let user = null;
    try {
        const sbUser = cookies.get('sb_user');
        if (sbUser) {
            const parsed = JSON.parse(sbUser);
            if (parsed && parsed.id) user = parsed;
        }
    } catch (e) {
        console.warn('[Event Load] Failed to parse sb_user cookie', e);
        user = null;
    }


    const { data: events, error } = await selectFromSupabase(
        'events',
        '*',
        eventId // Select all columns
    );

    const { data: eventDetail } = await selectFromSupabaseDetailed(
        'event_details',
        '*',
        eventId, // Select all columns
        'event_id' // Column name to match
    );
    const eventDetails = eventDetail ?? null;

    if (error) {
        console.error(`[Event Load] Database Error: ${error.message}`);
        return { event: null, error: error.message, user, isAuthenticated: !!user };
    }
    
    const event = events ?? null;
    if (!event) {
        console.warn(`[Event Load] Event not found for ID: ${eventId}`);
        return { event: null, error: 'Event not found', user, isAuthenticated: !!user };
    }

    // Block access to unpublished events for non-admins
    const userRoles: string[] = user?.userRole ?? [];
    const canSeeUnpublished = userRoles.includes('Owner') || userRoles.includes('Super User');
    if (!event.is_published && !canSeeUnpublished) {
        throw svelteError(404, 'Event not found');
    }
    
    // Return the single event object and authentication flag
    return { event, user, isAuthenticated: !!user, eventDetails };
}
