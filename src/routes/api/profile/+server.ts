import { json } from '@sveltejs/kit';

export async function POST({ request, cookies, locals }) {
  try {
    const db = locals.supabase;
    const { user } = await locals.safeGetSession();

    if (!user) return json({ error: 'Not authenticated' }, { status: 401 });

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

    const { data, error } = await db
      .from('profiles')
      .upsert({ id: user.id, ...payload }, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[api/profile] update/upsert error', error);
      return json({ error }, { status: 500 });
    }

    // Keep sb_user display cookie in sync
    const existing = cookies.get('sb_user');
    const existingParsed = existing ? JSON.parse(existing) : {};
    cookies.set('sb_user', JSON.stringify({
      ...existingParsed,
      id: data.id,
      email: user.email,
      username: data.username,
      avatar_url: data.avatar_url
    }), {
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7
    });

    return json({ success: true, profile: data });
  } catch (err) {
    console.error('[api/profile] unexpected', err);
    return json({ error: (err as any)?.message ?? String(err) }, { status: 500 });
  }
}