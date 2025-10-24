import { SUPABASE_URL, SUPABASE_API_KEY } from '$env/static/private';

export const load = async ({ cookies }) => {
  const sbUser = cookies.get('sb_user');
  const sbAccess = cookies.get('sb_access_token');
  if (!sbUser || !sbAccess) {
    return { status: 401, error: 'Unauthorized' };
  }

  let caller;
  try {
    caller = JSON.parse(sbUser);
  } catch (e) {
    return { status: 400, error: 'Invalid sb_user' };
  }

  const callerRoles: string[] = caller?.roles ?? caller?.profile?.roles ?? [];
  const allowed = callerRoles.includes('Owner') || callerRoles.includes('Super User');
  if (!allowed) return { status: 403, error: 'Forbidden' };

  // Fetch all profiles via Supabase REST using caller JWT so RLS applies
  const url = `${SUPABASE_URL}/rest/v1/profiles?select=*`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${sbAccess}`,
        apikey: SUPABASE_API_KEY
      }
    });
    if (!res.ok) {
      const err = await res.text();
      return { status: res.status, error: err };
    }
    const profiles = await res.json();
    return { profiles };
  } catch (err) {
    return { status: 500, error: (err as any)?.message ?? String(err) };
  }
};
