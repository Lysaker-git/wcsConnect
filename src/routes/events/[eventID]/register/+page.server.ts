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
                console.warn('[registration load] profile fetch error', pe);
            }
        } catch (e) {
            user = null;
        }
    }
    console.log('[registration load] user:', user);
    console.log('[registration load] profile:', profile);
    return { user, profile };
};

