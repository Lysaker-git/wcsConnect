import { json } from '@sveltejs/kit';

export async function POST({ cookies }) {
  try {
    // Clear auth cookies set by signin
    cookies.delete('sb_access_token', { path: '/' });
    cookies.delete('sb_user', { path: '/' });

    // Optionally you could also revoke session server-side if you have the token
    return json({ success: true });
  } catch (err) {
    console.error('[api/auth/signout] error', err);
    return json({ error: (err as any)?.message ?? String(err) }, { status: 500 });
  }
}
