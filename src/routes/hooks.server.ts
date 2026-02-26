import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_API_KEY } from '$env/static/public';

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

  if (!sbUser && !accessToken) {
    return resolve(event);
  }

  if (accessToken) {
    // Create a fresh client per request — never use a singleton for auth operations
    const requestClient = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_API_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    try {
      const { data, error } = await requestClient.auth.getUser(accessToken);

      if (error || !data.user) {
        if (refreshToken) {
          // Fresh client for refresh too
          const refreshClient = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_API_KEY, {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          });

          const { data: refreshData, error: refreshError } = await refreshClient.auth.refreshSession({
            refresh_token: refreshToken
          });

          if (!refreshError && refreshData.session) {
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
            return resolve(event);
          }
        }

        // Session dead — clear everything
        event.cookies.delete('sb_user', { path: '/' });
        event.cookies.delete('sb_access_token', { path: '/' });
        event.cookies.delete('sb_refresh_token', { path: '/' });

        if (!isPublicRoute(path)) {
          throw redirect(303, '/signin?expired=true');
        }
      }
    } catch (e: any) {
      if (e?.status === 303) throw e;
      event.cookies.delete('sb_user', { path: '/' });
      event.cookies.delete('sb_access_token', { path: '/' });
      event.cookies.delete('sb_refresh_token', { path: '/' });
      if (!isPublicRoute(path)) {
        throw redirect(303, '/signin?expired=true');
      }
    }
  } else if (sbUser && !accessToken) {
    event.cookies.delete('sb_user', { path: '/' });
    if (!isPublicRoute(path)) {
      throw redirect(303, '/signin?expired=true');
    }
  }

  return resolve(event);
};