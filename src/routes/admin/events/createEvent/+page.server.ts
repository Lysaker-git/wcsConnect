import { fail, redirect } from '@sveltejs/kit';
import { supabase } from '$lib/api/supabaseClient';

export const actions = {
	default: async ({ request, locals }) => {
		try {
			const form = await request.formData();
			// Events table fields
			const title = form.get('title')?.toString();
			const start_date = form.get('start_date')?.toString();
			const end_date = form.get('end_date')?.toString();

			// Event details fields
			const description = form.get('description')?.toString();
			const address = form.get('address')?.toString();
			const hotel = form.get('hotel')?.toString();
			const venue = form.get('venue')?.toString();
			const max_participants = form.get('max_participants') ? parseInt(form.get('max_participants')) : null;
			const organizer_name = form.get('organizer_name')?.toString();
			const organizer_email = form.get('organizer_email')?.toString();
			const organizer_phone = form.get('organizer_phone')?.toString();
			const social_links = form.get('social_links')?.toString();
			const schedule_image_url = form.get('schedule_image_url')?.toString();
			const transportation = form.get('transportation')?.toString();
			const event_type = form.get('event_type')?.toString();
			const banner_image_url = form.get('banner_image_url')?.toString();
			const promo_video_url = form.get('promo_video_url')?.toString();
			const accessibility = form.get('accessibility')?.toString();
			const languages = form.get('languages')?.toString();
			const tags = form.get('tags')?.toString();

			// Parse crew members (expecting JSON stringified array)
			const crewRaw = form.get('crew')?.toString();
				let crew = [];
				crew = JSON.parse(crewRaw || '[]');

			// Insert into events table
			const { data: eventData, error: eventError } = await supabase
				.from('events')
				.insert({ title, start_date, end_date })
				.select()
				.single();
			if (eventError || !eventData) {
				return fail(500, { message: 'Failed to create event', error: eventError });
			}
			const event_id = eventData.id;
			


			// Add creator as Event Director in event_participants
			// Determine creator id: prefer locals.user, fall back to sb_user cookie like profile loader
			let creatorId = locals?.user?.id ?? null;
			if (!creatorId) {
				try {
					const cookieHeader = request.headers.get('cookie') ?? '';
					const match = cookieHeader.split('; ').find((c) => c.startsWith('sb_user='));
					if (match) {
						const raw = match.split('=')[1] || '';
						const decoded = decodeURIComponent(raw);
						const parsed = JSON.parse(decoded);
						creatorId = parsed?.id ?? null;
					}
				} catch (e) {
					console.warn('[createEvent] failed to parse sb_user cookie', e);
				}
			}

			if (!creatorId) {
				return fail(401, { message: 'Not authenticated - cannot add event participant' });
			}

			// Fetch creator's profile fields to populate participant row (mirror profile/+page.server.ts)
			let profileRow: any = null;
			try {
				const { data: pData, error: pError } = await supabase
					.from('profiles')
					.select('wsdcID, wsdcLevel, country, age, role')
					.eq('id', creatorId)
					.maybeSingle();
				if (!pError) profileRow = pData;
			} catch (e) {
				console.warn('[createEvent] profile fetch failed', e);
			}

			// Check for an existing Event Director record to avoid duplicates
			const { data: existingParticipants, error: selectError } = await supabase
				.from('event_participants')
				.select('id')
				.eq('event_id', event_id)
				.eq('user_id', creatorId)
				.eq('event_role', 'Event Director')
				.limit(1);
			if (selectError) {
				return fail(500, { message: 'Failed to verify event participants', error: selectError });
			}

			if (!existingParticipants || existingParticipants.length === 0) {
				const participantRow: any = {
					event_id,
					user_id: creatorId,
					event_role: 'Event Director',
					status: 'registered'
				};
				if (profileRow) {
					if (profileRow.wsdcID !== undefined) participantRow.wsdcID = profileRow.wsdcID;
					if (profileRow.wsdcLevel !== undefined) participantRow.wsdcLevel = profileRow.wsdcLevel;
					if (profileRow.country !== undefined) participantRow.country = profileRow.country;
					if (profileRow.age !== undefined) participantRow.age = String(profileRow.age);
					if (profileRow.role !== undefined) participantRow.role = profileRow.role;
				}

				const { error: participantError } = await supabase
					.from('event_participants')
					.insert(participantRow);
				if (participantError) {
					return fail(500, { message: 'Failed to add event participant', error: participantError });
				}
			}

			// Insert into event_details table
			const { error: detailsError } = await supabase
				.from('event_details')
				.insert({
					event_id,
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
					tags: tags ? tags.split(',').map(t => t.trim()) : null
				});

			if (detailsError) {
				return fail(500, { message: 'Failed to create event details', error: detailsError });
			}

			// Insert event crew (support either a linked profile_id or a free-text crew_name)
			if (Array.isArray(crew) && crew.length > 0) {
				const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

				const crewToInsert: any[] = [];
				for (const [i, member] of crew.entries()) {
					const role = member?.role ? String(member.role).trim() : '';
					const description = member?.description ? String(member.description) : null;
					// accept name fields from client as `name` or `crew_name`
					const crew_name_raw = member?.name ?? member?.crew_name ?? member?.crewName ?? '';
					const crew_name = crew_name_raw ? String(crew_name_raw).trim() : null;

					let profile_id = member?.profile_id ? String(member.profile_id).trim() : null;
					if (profile_id === '') profile_id = null;

					// require role and at least one of profile_id or crew_name
					if (!role) {
						continue;
					}
					if (!profile_id && !crew_name) {
						continue;
					}

					// validate UUID format if profile_id provided
					if (profile_id && !uuidRegex.test(profile_id)) {
						return fail(400, { message: 'Invalid profile_id for a crew member' });
					}

					crewToInsert.push({
						event_id,
						profile_id,
						crew_name,
						role,
						description
					});
				}

				if (crewToInsert.length > 0) {
					const { data: crewInserted, error: crewError } = await supabase
						.from('event_crew')
						.insert(crewToInsert)
						.select();
					if (crewError) {
						return fail(500, { message: 'Failed to create event crew', error: crewError });
					}
				}
			}

			// Success: redirect to event admin or show success
			throw redirect(303, `/admin/events/${event_id}`);
		} catch (err) {
			return fail(500, { message: (err as any)?.message ?? 'Unknown error' });
		}
	}
};
