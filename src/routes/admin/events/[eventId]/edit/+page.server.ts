import { supabase } from "$lib/api/supabaseClient";
import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ cookies, params }) => {
    const sbUser = cookies.get("sb_user");
    const eventId = params.eventId;

    const { data: eventDetails, error: eventError } = await supabase
        .from("event_details")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();
    
    const { data: event, error: eventFetchError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();
    
    return {
        eventDetails,
        event,
        eventError,
        eventFetchError
    };
};

export const actions = {
    default: async ({ request, params }) => {
        try {
            const form = await request.formData();
            const eventId = params.eventId;

            // Events table fields
            const title = form.get('title')?.toString() ?? null;
            const start_date = form.get('start_date')?.toString() ?? null;
            const end_date = form.get('end_date')?.toString() ?? null;

            // Event details fields
            const description = form.get('description')?.toString() ?? null;
            const address = form.get('address')?.toString() ?? null;
            const hotel = form.get('hotel')?.toString() ?? null;
            const venue = form.get('venue')?.toString() ?? null;
            const max_participants = form.get('max_participants') ? parseInt(form.get('max_participants') as any) : null;
            const organizer_name = form.get('organizer_name')?.toString() ?? null;
            const organizer_email = form.get('organizer_email')?.toString() ?? null;
            const organizer_phone = form.get('organizer_phone')?.toString() ?? null;
            const social_links = form.get('social_links')?.toString() ?? null;
            const schedule_image_url = form.get('schedule_image_url')?.toString() ?? null;
            const transportation = form.get('transportation')?.toString() ?? null;
            const event_type = form.get('event_type')?.toString() ?? null;
            const banner_image_url = form.get('banner_image_url')?.toString() ?? null;
            const promo_video_url = form.get('promo_video_url')?.toString() ?? null;
            const accessibility = form.get('accessibility')?.toString() ?? null;
            const languages = form.get('languages')?.toString() ?? null;
            const tags = form.get('tags')?.toString() ?? null;

            // Update events table
            const { data: updatedEvent, error: eventError } = await supabase
                .from('events')
                .update({ title, start_date, end_date })
                .eq('id', eventId)
                .select()
                .single();

            if (eventError) {
                return fail(500, { message: 'Failed to update event', error: eventError });
            }

            // Prepare details payload
            const detailsPayload: any = {
                event_id: eventId,
                description,
                address,
                hotel,
                venue,
                max_participants,
                organizer_name,
                organizer_email,
                organizer_phone,
                social_links: social_links ? JSON.parse(social_links) : null,
                schedule_image_url,
                transportation,
                event_type,
                banner_image_url,
                promo_video_url,
                accessibility,
                languages,
                tags: tags ? tags.split(',').map((t: string) => t.trim()) : null
            };

            // Try updating existing details row
            const { data: updatedDetails, error: detailsError } = await supabase
                .from('event_details')
                .update(detailsPayload)
                .eq('event_id', eventId)
                .select();

            if (detailsError) {
                return fail(500, { message: 'Failed to update event details', error: detailsError });
            }

            // If update returned no rows (no existing details), insert new
            if (!updatedDetails || (Array.isArray(updatedDetails) && updatedDetails.length === 0)) {
                const { error: insertError } = await supabase
                    .from('event_details')
                    .insert(detailsPayload);
                if (insertError) {
                    return fail(500, { message: 'Failed to insert event details', error: insertError });
                }
            }

            throw redirect(303, `/admin/events/${eventId}`);
        } catch (err) {
            return fail(500, { message: (err as any)?.message ?? 'Unknown error' });
        }
    }
};