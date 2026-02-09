import { json } from '@sveltejs/kit';

export function GET({ cookies, request }) {
  try {
    const sbUser = cookies.get('sb_user');
    const sbAccess = cookies.get('sb_access_token');
    // return minimal info for debugging
    return json({ sb_user: sbUser ?? null, sb_access_token: sbAccess ?? null, headers: Object.fromEntries(request.headers) });
  } catch (err) {
    return json({ error: (err as any)?.message ?? String(err) }, { status: 500 });
  }
}
