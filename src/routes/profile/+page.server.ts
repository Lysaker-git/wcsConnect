import { createEvent } from '$lib/api/createEvent';
import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  const db = locals.supabase;
  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(303, '/signin');

  // Fetch profile
  let profile = null;
  try {
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (!error) profile = data;
  } catch (e) {
    console.warn('[profile load] profile fetch error', e);
  }

  // Fetch events where user is Event Director
  let myEvents: any[] = [];
  try {
    const { data, error } = await db
      .from('event_participants')
      .select(`
        event_id,
        events ( id, title, start_date, end_date )
      `)
      .eq('user_id', user.id)
      .eq('event_role', 'Event Director');

    if (!error && data) {
      myEvents = data.map((item: any) => item.events).filter(Boolean);
    }
  } catch (e) {
    console.warn('[profile load] myEvents fetch error', e);
  }

  // Fetch user's registrations
  let myRegistrations: any[] = [];
  try {
    const { data, error } = await db
      .from('event_participants')
      .select(`
        id,
        event_id,
        status,
        created_at,
        events ( id, title, start_date, end_date )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      myRegistrations = data.map((r: any) => ({
        id: r.id,
        event_id: r.event_id,
        status: r.status,
        created_at: r.created_at,
        event: r.events
      }));
    }
  } catch (e) {
    console.warn('[profile load] registrations fetch error', e);
  }

  return { user: { id: user.id, email: user.email }, profile, myEvents, myRegistrations };
};

export const actions = {
  createEvent: async ({ request, locals }) => {
    try {
      const { user } = await locals.safeGetSession();
      if (!user) return fail(401, { success: false, message: 'Not authenticated' });

      const contentType = request.headers.get('content-type') ?? '';
      let title: string | undefined;
      let start_date: string | undefined;
      let end_date: string | undefined;

      if (contentType.includes('application/json')) {
        const body = await request.json();
        title = body.title?.toString();
        start_date = body.start_date?.toString();
        end_date = body.end_date?.toString();
      } else {
        const form = await request.formData();
        title = form.get('title')?.toString();
        start_date = form.get('start_date')?.toString();
        end_date = form.get('end_date')?.toString();
      }

      if (!title || !start_date || !end_date) {
        return fail(400, { success: false, message: 'Missing required fields' });
      }

      // Service role needed — createEvent does multi-table orchestration
      const result = await createEvent({ title, start_date, end_date }, user.id);

      if ((result as any).error) {
        const msg = (result as any).error?.message ?? JSON.stringify((result as any).error);
        return fail(500, { success: false, message: msg });
      }

      return { success: true, event: (result as any).data };
    } catch (err) {
      return fail(500, { success: false, message: (err as any)?.message ?? String(err) });
    }
  },

  updateProfile: async ({ request, locals }) => {
    try {
      const db = locals.supabase;
      const { user } = await locals.safeGetSession();
      if (!user) return fail(401, { success: false, message: 'Not authenticated' });

      const form = await request.formData();
      const username = form.get('username')?.toString();
      const role = form.get('role')?.toString();
      const description = form.get('description')?.toString();
      const wsdcID = form.get('wsdcID')?.toString();
      const wsdcLevel = form.get('wsdcLevel')?.toString();
      const country = form.get('country')?.toString();
      const age = form.get('age')?.toString();
      const avatar_url = form.get('avatar')?.toString();

      const { error } = await db
        .from('profiles')
        .update({
          username,
          role,
          description,
          avatar_url,
          wsdcID: wsdcID ? parseInt(wsdcID) : null,
          wsdcLevel,
          country,
          age: age || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        return fail(500, { success: false, message: error.message });
      }

      return { success: true };
    } catch (err) {
      return fail(500, { success: false, message: (err as any)?.message ?? String(err) });
    }
  }
};