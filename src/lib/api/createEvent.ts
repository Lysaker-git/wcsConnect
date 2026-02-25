import { supabase } from './../server/supabaseServiceClient';

export interface NewEvent {
  id?: string;
  start_date: string | Date;
  end_date: string | Date;
  title: string;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function createEvent(ev: NewEvent, organizerProfileId?: string) {
  try {
    const toDateString = (d: string | Date) => {
      if (d instanceof Date) return d.toISOString().slice(0, 10);
      return d;
    };

    const payload: any = {
      id: ev.id ?? generateUUID(),
      start_date: toDateString(ev.start_date),
      end_date: toDateString(ev.end_date),
      title: ev.title
    };

    const { data, error } = await supabase
      .from('events')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('[createEvent] insert error:', error);
      return { data: null, error };
    }

    if (organizerProfileId) {
      const { error: participantError } = await supabase
        .from('event_participants')
        .insert([{
          id: generateUUID(),
          event_id: (data as any).id,
          user_id: organizerProfileId,
          event_role: 'Event Director'
        }]);

      if (participantError) {
        console.error('[createEvent] participant insert error:', participantError);
        return { data, error: participantError };
      }
    }

    return { data, error: null };
  } catch (err) {
    console.error('[createEvent] unexpected error:', err);
    return { data: null, error: err };
  }
}