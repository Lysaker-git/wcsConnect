import { error, fail } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabaseServiceClient';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
  const sbUser = cookies.get('sb_user');
  if (!sbUser) throw error(401, 'Not authenticated');

  let user: any;
  try { user = JSON.parse(sbUser); } catch { throw error(401, 'Invalid session'); }

  // Only Owners can access this page
  const roles: string[] = user.userRole ?? [];
  if (!roles.includes('Owner')) throw error(403, 'Not authorized');

  // Fetch all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, userRole, role, country, created_at, stripe_account_id, stripe_onboarding_complete')
    .order('created_at', { ascending: false });

  if (profilesError) throw error(500, 'Failed to fetch profiles');

  return { profiles: profiles ?? [] };
};

export const actions: Actions = {
  updateRole: async ({ request, cookies }) => {
    const sbUser = cookies.get('sb_user');
    if (!sbUser) return fail(401, { message: 'Not authenticated' });

    let user: any;
    try { user = JSON.parse(sbUser); } catch { return fail(401, { message: 'Invalid session' }); }

    const roles: string[] = user.userRole ?? [];
    if (!roles.includes('Owner')) return fail(403, { message: 'Not authorized' });

    const form = await request.formData();
    const profile_id = form.get('profile_id')?.toString();
    const newRoles = form.getAll('roles').map(r => r.toString());

    if (!profile_id) return fail(400, { message: 'Missing profile_id' });

    // Always keep 'member' as base role
    const finalRoles = Array.from(new Set(['member', ...newRoles]));
    console.log('Updating profile', profile_id, 'with roles', finalRoles);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ userRole: finalRoles })
      .eq('id', profile_id);

    console.log('Supabase update error:', updateError);
    if (updateError) return fail(500, { message: 'Failed to update role' });

    return { success: true };
  }
};