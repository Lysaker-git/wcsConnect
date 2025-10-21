import { json } from '@sveltejs/kit';
import { supabase } from '$lib/api/supabaseClient';

export async function POST({ request, cookies }) {
  try {
    const sbUser = cookies.get('sb_user');
    if (!sbUser) return json({ error: 'Not authenticated' }, { status: 401 });
    let user = null;
    try {
      user = JSON.parse(sbUser);
    } catch (e) {
      return json({ error: 'Invalid user cookie' }, { status: 400 });
    }

    const form = await request.formData();
    const username = form.get('username')?.toString();
    const role = form.get('role')?.toString();
    const description = form.get('description')?.toString() ?? null;
    const avatar = form.get('avatar')?.toString();

    if (!username || !role) {
      return json({ error: 'Missing fields' }, { status: 400 });
    }

    const payload: any = { username, role, description };
    if (avatar) payload.avatar_url = avatar;

    // Use upsert so that if the profile row doesn't exist we create it.
    // Use maybeSingle() to avoid errors when no rows are returned.
    const { data, error } = await supabase.from('profiles').upsert({ id: user.id, ...payload }, { onConflict: 'id' }).select().maybeSingle();
    if (error) {
      console.error('[api/profile] update/upsert error', error);
      return json({ error }, { status: 500 });
    }

    // update sb_user cookie for UI
    cookies.set('sb_user', JSON.stringify({ id: data.id, email: user.email, username: data.username, avatar_url: data.avatar_url }), { path: '/' });

    return json({ success: true, profile: data });
  } catch (err) {
    console.error('[api/profile] unexpected', err);
    return json({ error: (err as any)?.message ?? String(err) }, { status: 500 });
  }
}
