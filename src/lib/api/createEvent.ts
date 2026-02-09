import { supabase } from './supabaseClient';

export interface NewEvent {
  id?: string;
  start_date: string | Date; // YYYY-MM-DD or Date
  end_date: string | Date; // YYYY-MM-DD or Date
  title: string;
}

/**
 * Generate a UUID v4. Uses crypto.randomUUID if available, otherwise falls back to a v4 implementation.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  // fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function fallbackInsert(payload: any) {
  // Fallback removed - supabase client should handle this properly
  return { data: null, error: new Error('Fallback not implemented') };
}

/**
 * Create a new event row in the `events` table.
 * @param ev NewEvent object (id optional)
 * @returns { data, error } - data contains the inserted row on success
 */
export async function createEvent(ev: NewEvent, organizerProfileId?: string) {
  try {
    console.log('[createEvent] start', ev);

    const toDateString = (d: string | Date) => {
      if (d instanceof Date) {
        return d.toISOString().slice(0, 10);
      }
      return d;
    };

    const payload: any = {
      id: ev.id ?? generateUUID(),
      start_date: toDateString(ev.start_date),
      end_date: toDateString(ev.end_date),
      title: ev.title
    };

    console.log('[createEvent] payload prepared:', payload);

    // Try inserting with Supabase JS client
    console.log('[createEvent] calling supabase.from().insert()');
    const { data, error } = await supabase
      .from('events')
      .insert([payload])
      .select()
      .single();

    console.log('[createEvent] supabase response - data:', data, 'error:', error);

    if (error) {
      console.error('[createEvent] supabase error object:', JSON.stringify(error));

      // If it's an unsupported media type or otherwise, try fallback
      const msg = (error as any)?.message ?? '';
      if (msg.includes('Unsupported Media Type') || (error as any)?.status === 415) {
        const fallback = await fallbackInsert(payload);
        console.log('[createEvent] fallback result:', fallback);
        return fallback;
      }

      return { data: null, error };
    }

    console.log('[createEvent] success, inserted:', data);

    // If an organizer profile id was provided, insert them into event_participants
    if (organizerProfileId) {
      try {
        const participant = {
          id: generateUUID(),
          event_id: (data as any).id,
          user_id: organizerProfileId,
          event_role: 'Event Director'
        };

        console.log('[createEvent] inserting organizer into event_participants:', participant);
        const { error: participantError } = await supabase.from('event_participants').insert([participant]);
        if (participantError) {
          console.error('[createEvent] failed to insert event_participants row:', participantError);
          // Not rolling back the event insert here. Return the participant error to caller.
          return { data, error: participantError };
        }
      } catch (pe) {
        console.error('[createEvent] unexpected error inserting participant:', pe);
        return { data, error: pe };
      }
    }

    return { data, error: null };
  } catch (err) {
    console.error('[createEvent] unexpected error:', err);
    return { data: null, error: err };
  }
}
