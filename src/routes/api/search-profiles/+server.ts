import { supabase } from '$lib/api/supabaseClient';
import { json } from '@sveltejs/kit';

export const GET = async ({ url, cookies }) => {
  const query = url.searchParams.get('query')?.trim() || '';
  if (!query || query.length < 3) {
    return json({ profiles: [] });
  }

  // Get current user id from cookie
  let currentUserId = null;
  const sbUser = cookies.get('sb_user');
  if (sbUser) {
    try {
      const user = JSON.parse(sbUser);
      currentUserId = user.id;
    } catch {}
  }

  // Search profiles by username (case-insensitive, partial match)
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, wsdcID')
    .ilike('username', `%${query}%`)
    .limit(10);

  if (error) {
    return json({ profiles: [] });
  }

  // Filter out empty usernames and exclude current user
  const profiles = (data || []).filter(p => p.username && (!currentUserId || p.id !== currentUserId)).map(p => ({ username: p.username, wsdcID: p.wsdcID }));
  return json({ profiles });
};
