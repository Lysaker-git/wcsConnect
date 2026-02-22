import { selectAllFromSupabase } from '$lib/api/selectFromSupabase';
import { supabase } from '$lib/server/supabaseServiceClient';

export async function load() {
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_published', true)
    .order('start_date', { ascending: true });
  const { data: eventDetails, error: eventDetailserror } = await selectAllFromSupabase('event_details', '*');

  // Build a lookup of details by their event foreign key. We attempt common key names.
  const detailsByEvent = new Map();
  if (Array.isArray(eventDetails)) {
    for (const d of eventDetails) {
      const key = d?.event_id ?? d?.eventId ?? d?.event ?? d?.id ?? null;
      if (key == null) continue;
      const arr = detailsByEvent.get(key) ?? [];
      arr.push(d);
      detailsByEvent.set(key, arr);
    }
  }

  // Merge details into each event as `details` array. Keep original events if not an array.
  const mergedEvents = Array.isArray(events)
    ? events.map((ev: any) => {
        const dets = detailsByEvent.get(ev.id) ?? [];
        // Promote sensible, non-sensitive fields from details to top-level for easier rendering
        const promoted: any = {};
        if (dets.length) {
          promoted.banner_image_url = dets.map((d: any) => d.banner_image_url).find(Boolean) ?? null;
          promoted.description = dets.map((d: any) => d.description).find(Boolean) ?? null;
          promoted.venue = dets.map((d: any) => d.venue).find(Boolean) ?? null;
          promoted.hotel = dets.map((d: any) => d.hotel).find(Boolean) ?? null;
          promoted.event_type = dets.map((d: any) => d.event_type).find(Boolean) ?? null;
          promoted.organizer_name = dets.map((d: any) => d.organizer_name).find(Boolean) ?? null;
          promoted.social_links = dets.map((d: any) => d.social_links).find(Boolean) ?? null;
          // merge tags arrays / CSVs into unique array
          const tagSets: string[] = [];
          for (const d of dets) {
            if (!d) continue;
            if (Array.isArray(d.tags)) tagSets.push(...d.tags.filter(Boolean));
            else if (typeof d.tags === 'string' && d.tags.trim()) tagSets.push(...d.tags.split(',').map((t: string) => t.trim()).filter(Boolean));
          }
          promoted.tags = Array.from(new Set(tagSets));
        }

        return { ...ev, details: dets, ...promoted };
      })
    : events;

  const combinedError = error ?? eventDetailserror ?? null;

  return { events: mergedEvents, error: combinedError };
}
