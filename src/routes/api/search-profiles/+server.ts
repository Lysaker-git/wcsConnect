import { json } from '@sveltejs/kit';

export const GET = async ({ url, locals }) => {
  const query = url.searchParams.get('query')?.trim() || '';
  const { user } = await locals.safeGetSession();

  if (!query || query.length < 3) {
    return json({ profiles: [] });
  }

  const { data, error } = await locals.supabase
    .from('profiles')
    .select('id, username, wsdcID')
    .ilike('username', `%${query}%`)
    .limit(10);

  if (error) {
    return json({ profiles: [] });
  }

  const profiles = (data || [])
    .filter(p => p.username && (!user || p.id !== user.id))
    .map(p => ({ username: p.username, wsdcID: p.wsdcID }));

  return json({ profiles });
};