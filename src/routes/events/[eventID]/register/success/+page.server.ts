import { supabase } from "$lib/server/supabaseServiceClient";

export const load = async ({ params, url }) => {
    const participantId = url.searchParams.get('participantId');
    const eventID = params.eventID;


    let participant = null;
    let participantProducts = [];
    let total = 0;
    let event = null;
    let participantUsername = null;

    // Fetch event details to get event name
    try {
        const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('id, title, stripe_fee_model')
            .eq('id', eventID)
            .single();

        if (!eventError && eventData) {
            event = eventData;
        } else {
            console.warn('[success page load] Error fetching event:', eventError);
        }
    } catch (err) {
        console.error('[success page load] Event fetch error:', err);
    }

    if (participantId) {
        // Fetch participant details
        try {
            const { data: participantData, error: participantError } = await supabase
                .from('event_participants')
                .select('*')
                .eq('id', participantId)
                .single();

            if (!participantError && participantData) {
                participant = participantData;
                // Fetch username from profiles table using user_id
                if (participant.user_id) {
                    const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('username')
                        .eq('id', participant.user_id)
                        .single();
                    if (!profileError && profileData) {
                        participantUsername = profileData.username;
                    }
                }
            } else {
                console.warn('[success page load] Error fetching participant:', participantError);
            }
        } catch (err) {
            console.error('[success page load] Participant fetch error:', err);
        }

        // Fetch participant products
        try {
            const { data: productsData, error: productsError } = await supabase
                .from('participant_products')
                .select('*')
                .eq('participant_id', participantId)
                .order('created_at', { ascending: true });

            if (!productsError && productsData) {
                participantProducts = productsData;
                // Calculate total
                total = participantProducts.reduce((sum, item) => sum + parseFloat(item.subtotal.toString()), 0);
            } else {
                console.warn('[success page load] Error fetching participant products:', productsError);
            }
        } catch (err) {
            console.error('[success page load] Participant products fetch error:', err);
        }
    }


    const stripe_fee_model = event?.stripe_fee_model ?? 'on_top';
    const stripeFee = stripe_fee_model === 'on_top' ? total * 0.035 : 0;
    const serviceFee = total * 0.01;
    const grandTotal = total + stripeFee + serviceFee;

    return {
        participantId,
        eventID,
        event,
        participant,
        participantUsername,
        participantProducts,
        total,
        stripeFee,
        serviceFee,
        grandTotal,
        stripe_fee_model
    };
};
