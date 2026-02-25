import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { supabaseAnon } from '$lib/server/supabaseAnonClient';

const PUBLIC_ROUTES = [
  '/signin',
  '/signup',
  '/auth',
  '/api/stripe/webhook',
  '/events',
  '/classes',
  '/competition',
  '/education',
  '/about',
  '/'
];

function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route => path === route || path.startsWith(route));
}

export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname;
  const sbUser = event.cookies.get('sb_user');
  const accessToken = event.cookies.get('sb_access_token');
  const refreshToken = event.cookies.get('sb_refresh_token');

  // Nothing to check
  if (!sbUser && !accessToken) {
    return resolve(event);
  }

  if (accessToken) {
    try {
      const { data, error } = await supabaseAnon.auth.getUser(accessToken);

      if (error || !data.user) {
        // Try to refresh the session before giving up
        if (refreshToken) {
          const { data: refreshData, error: refreshError } = await supabaseAnon.auth.refreshSession({
            refresh_token: refreshToken
          });

          if (!refreshError && refreshData.session) {
            // Refresh succeeded — update cookies with new tokens
            const maxAge = 60 * 60 * 24 * 7;
            event.cookies.set('sb_access_token', refreshData.session.access_token, {
              httpOnly: true,
              path: '/',
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              maxAge
            });
            event.cookies.set('sb_refresh_token', refreshData.session.refresh_token, {
              httpOnly: true,
              path: '/',
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              maxAge
            });
            // Continue with the refreshed session
            return resolve(event);
          }
        }

        // Refresh failed or no refresh token — session is dead
        event.cookies.delete('sb_user', { path: '/' });
        event.cookies.delete('sb_access_token', { path: '/' });
        event.cookies.delete('sb_refresh_token', { path: '/' });

        if (!isPublicRoute(path)) {
          throw redirect(303, '/signin?expired=true');
        }
      }
    } catch (e: any) {
      if (e?.status === 303) throw e;
      // On unexpected errors clear cookies and continue
      event.cookies.delete('sb_user', { path: '/' });
      event.cookies.delete('sb_access_token', { path: '/' });
      event.cookies.delete('sb_refresh_token', { path: '/' });
    }
  } else if (sbUser && !accessToken) {
    // sb_user exists but token is gone — dead session
    event.cookies.delete('sb_user', { path: '/' });
    if (!isPublicRoute(path)) {
      throw redirect(303, '/signin?expired=true');
    }
  }

  return resolve(event);
};