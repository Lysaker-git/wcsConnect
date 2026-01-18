import { createEvent } from '$lib/api/createEvent';
import { fail } from '@sveltejs/kit';
import { supabase } from '$lib/api/supabaseClient';

export const load = async ({ cookies }) => {
  const sbUser = cookies.get('sb_user');
  let user = null;
  let profile = null;
  if (sbUser) {
    try {
      user = JSON.parse(sbUser);
      // fetch profile row
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (!error) profile = data; 
      } catch (pe) {
        console.warn('[profile load] profile fetch error', pe);
      }
    } catch (e) {
      user = null;
    }
  }

  // Load user's events where they are Event Director
  let myEvents = [];
  console.log('[DEBUG myEvents] Starting myEvents fetch');
  console.log('[DEBUG myEvents] User exists:', !!user);
  console.log('[DEBUG myEvents] Profile exists:', !!profile);
  if (user && profile) {
    console.log('[DEBUG myEvents] User ID:', user.id);
    
    // First, let's check if user has ANY event_participants records
    console.log('[DEBUG myEvents] Checking for ANY event_participants records for this user');
    const { data: allRecords, error: allError } = await supabase
      .from('event_participants')
      .select('*')
      .eq('user_id', user.id);
    
    console.log('[DEBUG myEvents] All user records:', allRecords);
    console.log('[DEBUG myEvents] All records error:', allError);
    
    try {
      console.log('[DEBUG myEvents] Executing Supabase query for event_participants with Event Director role');
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          event_id,
          events (
            id,
            title,
            start_date,
            end_date
          )
        `)
        .eq('user_id', user.id)
        .eq('event_role', 'Event Director');

      console.log('[DEBUG myEvents] Query result - data:', data);
      console.log('[DEBUG myEvents] Query result - error:', error);

      if (!error && data) {
        console.log('[DEBUG myEvents] Mapping data to events');
        myEvents = data.map(item => item.events).filter(Boolean);
        console.log('[DEBUG myEvents] Mapped events:', myEvents);
      } else {
        console.log('[DEBUG myEvents] No data or error occurred');
      }
    } catch (e) {
      console.log('[DEBUG myEvents] Exception during Event Director query:', e);
    }
  } else {
    console.log('[DEBUG myEvents] Skipping fetch - user or profile missing');
  }
  console.log('[DEBUG myEvents] Final myEvents array:', myEvents);

  return { user, profile, myEvents };
};

export const actions = {
  createEvent: async ({ request, cookies }) => {
    try {
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

      // determine current user's profile id from cookies
      let organizerProfileId: string | null = null;
      try {
        const sbUser = cookies.get('sb_user');
        if (sbUser) {
          const user = JSON.parse(sbUser);
          // attempt to confirm profile exists in profiles table
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', user.id)
              .single();
            if (!profileError && profileData?.id) organizerProfileId = profileData.id;
            else organizerProfileId = user.id; // fallback to user.id
          } catch (pe) {
            organizerProfileId = user.id;
          }
        }
      } catch (e) {
        console.warn('[profile action] unable to parse sb_user cookie', e);
      }

      if (!organizerProfileId) {
        return fail(400, { success: false, message: 'Not authenticated or profile missing' });
      }

      const result = await createEvent({ title, start_date, end_date }, organizerProfileId);

      // createEvent returns { data, error }
      if ((result as any).error) {
        const msg = (result as any).error?.message ?? JSON.stringify(result.error);
        return fail(500, { success: false, message: msg });
      }

      return { success: true, event: result.data };
    } catch (err) {
      return fail(500, { success: false, message: (err as any)?.message ?? String(err) });
    }
  },
  updateProfile: async ({ request, cookies }) => {
    try {
      const form = await request.formData();
      const username = form.get('username')?.toString();
      const role = form.get('role')?.toString();
      const description = form.get('description')?.toString();
      const wsdcID = form.get('wsdcID')?.toString();
      const wsdcLevel = form.get('wsdcLevel')?.toString();
      const country = form.get('country')?.toString();
      const age = form.get('age')?.toString();
      const avatar_url = form.get('avatar')?.toString();

      // Get user id from cookies
      let userId: string | null = null;
      try {
        const sbUser = cookies.get('sb_user');
        console.log('[updateProfile] sb_user cookie:', sbUser);
        if (sbUser) {
          const user = JSON.parse(sbUser);
          userId = user.id;
        }
      } catch (e) {
        console.warn('[updateProfile] unable to parse sb_user cookie', e);
      }

      if (!userId) {
        return fail(400, { success: false, message: 'Not authenticated' });
      }

      // Set auth session for supabase client
      const accessToken = cookies.get('sb_access_token');
      console.error('[updateProfile] sb_access_token cookie:', accessToken);
      if (accessToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: '' });
      }
      console.log('[updateProfile] Updating profile for userId:', userId);
      console.log('[updateProfile] New profile data:', {
        username,
        role,
        description,
        avatar_url,
        wsdcID: wsdcID ? parseInt(wsdcID) : null,
        wsdcLevel,  
        country,
        age
      });

      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          role,
          description,
          avatar_url,
          wsdcID: wsdcID ? parseInt(wsdcID) : null,
          wsdcLevel,
          country,
          age,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      console.log('[updateProfile] Supabase update error:', error);
      if (error) {
        return fail(500, { success: false, message: error.message });
      }

      return { success: true };
    } catch (err) {
      return fail(500, { success: false, message: (err as any)?.message ?? String(err) });
    }
  }
};
