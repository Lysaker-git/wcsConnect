import { supabase } from '$lib/api/supabaseClient';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { eventId } = params;

    const { data, error } = await supabase
      .from('event_participants')
      .select(`
        id,
        event_role,
        created_at,
        user:user_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch participants: ${error.message}`);
    }

    return json(data);
  } catch (error) {
    console.error('Error fetching event participants:', error);
    return json({ error: error.message }, { status: 500 });
  }
};