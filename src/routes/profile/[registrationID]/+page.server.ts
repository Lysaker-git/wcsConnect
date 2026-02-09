import { supabase } from '$lib/api/supabaseClient';

export const load = async ({ params }) => {
	const registrationID = params.registrationID;
	let participant = null;
	let participantProducts = [];
	let total = 0;
	let event = null;
	let participantUsername = null;
	let hasAccommodationProduct = false;

	// Fetch participant details
	if (registrationID) {
		try {
			const { data: participantData, error: participantError } = await supabase
				.from('event_participants')
				.select('*')
				.eq('id', registrationID)
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

				// Fetch event info
				const { data: eventData, error: eventError } = await supabase
					.from('events')
					.select('id, title')
					.eq('id', participant.event_id)
					.single();
				if (!eventError && eventData) event = eventData;

				// Check if event has accommodation product
				if (participant.event_id) {
					const { data: accomProducts, error: accomError } = await supabase
						.from('products')
						.select('id')
						.eq('event_id', participant.event_id)
						.eq('product_type', 'accommodation');
					if (!accomError && accomProducts && accomProducts.length > 0) {
						hasAccommodationProduct = true;
					}
				}
			}
		} catch (err) {
			// log error
		}

		// Fetch participant products
		try {
			const { data: productsData, error: productsError } = await supabase
				.from('participant_products')
				.select('*')
				.eq('participant_id', registrationID)
				.order('created_at', { ascending: true });
			if (!productsError && productsData) {
				participantProducts = productsData;
				total = participantProducts.reduce((sum, item) => sum + parseFloat(item.subtotal.toString()), 0);
			}
		} catch (err) {
			// log error
		}
	}

	return {
		registrationID,
		event,
		participant,
		participantUsername,
		participantProducts,
		total,
		hasAccommodationProduct
	};
};
