import { selectFromSupabase, selectFromSupabaseDetailed } from '$lib/api/selectFromSupabase';
import { supabase } from '$lib/server/supabaseServiceClient';
import type { PageServerLoad } from './$types';
import { error as svelteError, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
  const db = locals.supabase;
  const eventId = params.eventID;

  const { user } = await locals.safeGetSession();

  // Check for existing registration if logged in
  if (user) {
    const { data: existingRegistration } = await db
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .not('event_role', 'eq', 'Event Director')
      .maybeSingle();

    if (existingRegistration) {
      throw redirect(303, `/profile/${existingRegistration.id}`);
    }
  }

  const { data: events, error } = await selectFromSupabase('events', '*', eventId);
  const { data: eventDetail } = await selectFromSupabaseDetailed('event_details', '*', eventId, 'event_id');
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

  // Fetch userRole from profile — safeGetSession only gives us auth data
  let userRoles: string[] = [];
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('userRole')
      .eq('id', user.id)
      .maybeSingle();
    userRoles = profile?.userRole ?? [];
  }

  const canSeeUnpublished = userRoles.includes('Owner') || userRoles.includes('Super User');
  if (!event.is_published && !canSeeUnpublished) {
    throw svelteError(404, 'Event not found');
  }

  return { event, user, isAuthenticated: !!user, eventDetails };
};