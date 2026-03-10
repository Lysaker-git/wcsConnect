import { supabase as serviceRole } from '$lib/server/supabaseServiceClient';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
  const { user, session } = await locals.safeGetSession();

  if (user) {
    // Rebuild sb_user display cookie if missing or stale
    const sbUserCookie = cookies.get('sb_user');
    if (!sbUserCookie) {
      const { data: profile } = await serviceRole
        .from('profiles')
        .select('username, avatar_url, userRole')
        .eq('id', user.id)
        .maybeSingle();

      cookies.set('sb_user', JSON.stringify({
        id: user.id,
        email: user.email,
        username: profile?.username ?? null,
        avatar_url: profile?.avatar_url ?? null,
        userRole: profile?.userRole ?? []
      }), {
        httpOnly: false,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7
      });
    }

    // Parse for header display
    const sbUser = cookies.get('sb_user');
    let displayUser = null;
    try { displayUser = sbUser ? JSON.parse(sbUser) : null; } catch { displayUser = null; }

    const { data: banner } = await serviceRole
      .from('status_banner')
      .select('message, is_active')
      .eq('id', 1)
      .maybeSingle();

    return { user: displayUser, session, statusBanner: banner?.is_active ? (banner.message || null) : null };
  }

  // No session — clear display cookie
  cookies.delete('sb_user', { path: '/' });

  const { data: banner } = await serviceRole
    .from('status_banner')
    .select('message, is_active')
    .eq('id', 1)
    .maybeSingle();

  return { user: null, session: null, statusBanner: banner?.is_active ? (banner.message || null) : null };
};