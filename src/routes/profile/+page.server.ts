import { createEvent } from '$lib/api/createEvent';
import { fail } from '@sveltejs/kit';

export const load = async ({ cookies }) => {
  const sbUser = cookies.get('sb_user');
  let user = null;
  if (sbUser) {
    try {
      user = JSON.parse(sbUser);
    } catch (e) {
      user = null;
    }
  }
  return { user };
};

export const actions = {
  default: async ({ request }) => {
    try {
      console.log('[profile action] start');
      // log headers
      try {
        console.log('[profile action] headers:', Array.from(request.headers.entries()));
      } catch (e) {
        console.log('[profile action] headers: (unable to stringify headers)', e);
      }

      const contentType = request.headers.get('content-type') ?? '';
      let title: string | undefined;
      let start_date: string | undefined;
      let end_date: string | undefined;

      if (contentType.includes('application/json')) {
        const body = await request.json();
        console.log('[profile action] parsed JSON body:', body);
        title = body.title?.toString();
        start_date = body.start_date?.toString();
        end_date = body.end_date?.toString();
      } else {
        const form = await request.formData();
        try {
          console.log('[profile action] parsed FormData entries:', Array.from(form.entries()));
        } catch (e) {
          console.log('[profile action] FormData parsed (unable to stringify entries)', e);
        }
        title = form.get('title')?.toString();
        start_date = form.get('start_date')?.toString();
        end_date = form.get('end_date')?.toString();
      }

      console.log('[profile action] received:', { title, start_date, end_date, contentType });

      if (!title || !start_date || !end_date) {
        console.log('[profile action] validation failed - missing fields');
        return fail(400, { success: false, message: 'Missing required fields' });
      }

      console.log('[profile action] calling createEvent with:', { title, start_date, end_date });
      const result = await createEvent({ title, start_date, end_date });
      console.log('[profile action] createEvent returned:', result);

      // createEvent returns { data, error }
      if ((result as any).error) {
        const msg = (result as any).error?.message ?? JSON.stringify(result.error);
        console.error('[profile action] createEvent error:', result.error);
        return fail(500, { success: false, message: msg });
      }

      console.log('[profile action] created event:', result.data);
      return { success: true, event: result.data };
    } catch (err) {
      console.error('[profile action] unexpected error:', err);
      return fail(500, { success: false, message: (err as any)?.message ?? String(err) });
    }
  }
};
