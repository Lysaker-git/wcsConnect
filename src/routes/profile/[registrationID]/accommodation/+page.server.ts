
import { supabase } from '$lib/api/supabaseClient';

export const load = async ({ params }) => {
	const registrationID = params.registrationID;
	let participant = null;
	let event = null;
	let accommodationProducts = [];

	if (registrationID) {
		// Fetch participant
		const { data: participantData } = await supabase
			.from('event_participants')
			.select('*')
			.eq('id', registrationID)
			.single();
		participant = participantData;

		// Fetch event
		if (participant?.event_id) {
			const { data: eventData } = await supabase
				.from('events')
				.select('id, title')
				.eq('id', participant.event_id)
				.single();
			event = eventData;

			// Fetch accommodation products for this event
			const { data: accomProducts } = await supabase
				.from('products')
				.select('*')
				.eq('event_id', participant.event_id)
				.eq('product_type', 'accommodation')
				.eq('is_active', true);
			accommodationProducts = accomProducts || [];
		}
	}

	return {
		registrationID,
		participant,
		event,
		accommodationProducts
	};
};
