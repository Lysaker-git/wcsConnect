import { supabase } from './supabaseClient';
import { SUPABASE_API_KEY, SUPABASE_URL } from '$env/static/private';

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
  try {
    console.log('[createEvent:fallback] attempting direct REST POST to Supabase');
    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/events`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_API_KEY,
        Authorization: `Bearer ${SUPABASE_API_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify([payload])
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error('[createEvent:fallback] non-json response:', text);
    }
    console.log('[createEvent:fallback] status:', res.status, 'body:', json ?? text);

    if (!res.ok) {
      return { data: null, error: { status: res.status, body: json ?? text } };
    }

    // json is an array of inserted rows (because we sent array)
    return { data: Array.isArray(json) ? json[0] : json, error: null };
  } catch (err) {
    console.error('[createEvent:fallback] unexpected error:', err);
    return { data: null, error: err };
  }
}

/**
 * Create a new event row in the `events` table.
 * @param ev NewEvent object (id optional)
 * @returns { data, error } - data contains the inserted row on success
 */
export async function createEvent(ev: NewEvent) {
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
    return { data, error: null };
  } catch (err) {
    console.error('[createEvent] unexpected error:', err);
    return { data: null, error: err };
  }
}
