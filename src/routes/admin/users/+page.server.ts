import { error, fail } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabaseServiceClient';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (!user) throw error(401, 'Not authenticated');

  // Only Owners can access this page
  if (!locals.userRole.includes('Owner')) throw error(403, 'Not authorized');

  // Fetch all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, userRole, role, country, created_at, stripe_account_id, stripe_onboarding_complete')
    .order('created_at', { ascending: false });

  if (profilesError) throw error(500, 'Failed to fetch profiles');

  return { profiles: profiles ?? [] };
};

export const actions: Actions = {
  updateRole: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Not authenticated' });
    if (!locals.userRole.includes('Owner')) return fail(403, { message: 'Not authorized' });

    const form = await request.formData();
    const profile_id = form.get('profile_id')?.toString();
    const newRoles = form.getAll('roles').map(r => r.toString());

    if (!profile_id) return fail(400, { message: 'Missing profile_id' });

    // Always keep 'member' as base role
    const finalRoles = Array.from(new Set(['member', ...newRoles]));

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ userRole: finalRoles })
      .eq('id', profile_id);

    if (updateError) return fail(500, { message: 'Failed to update role' });

    return { success: true };
  }
};