import { supabase } from '$lib/server/supabaseServiceClient';

export const load = async ({ locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return { userRoles: [] as string[] };

    const { data: profile } = await supabase
        .from('profiles')
        .select('userRole')
        .eq('id', user.id)
        .single();

    return { userRoles: (profile?.userRole ?? []) as string[] };
};
