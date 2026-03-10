import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, params }) => {
  const db = locals.supabase;
  const { user } = await locals.safeGetSession();

  if (!user) {
    throw redirect(303, `/signin?redirect=/competition/${params.competitionId}/register`);
  }

  let profile = null;
  try {
    const { data, error } = await db
      .from('profiles')
      .select('username, wsdcID, wsdcLevel, role')
      .eq('id', user.id)
      .single();
    if (!error) profile = data;
  } catch (e) {
    console.warn('[competition register load] profile fetch error', e);
  }

  // Split username into first/last as a best-effort pre-fill.
  // The user can correct these on the form.
  const nameParts = (profile?.username ?? '').trim().split(/\s+/);
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') ?? '';

  return {
    profile: {
      firstName,
      lastName,
      wsdcId: profile?.wsdcID ? String(profile.wsdcID) : '',
      wsdcLevel: profile?.wsdcLevel ?? '',
      role: (profile?.role ?? '').toLowerCase(), // 'leader' | 'follower' | ''
    }
  };
};
