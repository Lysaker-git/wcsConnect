import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabaseServiceClient';

// Routes that don't need auth checks
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
  const sbAccessToken = event.cookies.get('sb_access_token');

  // If no cookie at all — nothing to check
  if (!sbUser && !sbAccessToken) {
    return resolve(event);
  }

  // If we have a user cookie, verify the access token is still valid
  if (sbAccessToken) {
    try {
      const { data, error } = await supabase.auth.getUser(sbAccessToken);

      if (error || !data.user) {
        // Token is invalid or expired — clear both cookies
        event.cookies.delete('sb_user', { path: '/' });
        event.cookies.delete('sb_access_token', { path: '/' });

        // Only redirect if they're on a protected route
        if (!isPublicRoute(path)) {
          throw redirect(303, '/signin?expired=true');
        }
      }
    } catch (e: any) {
      // Let redirects through
      if (e?.status === 303) throw e;

      // On unexpected errors, clear cookies and continue
      event.cookies.delete('sb_user', { path: '/' });
      event.cookies.delete('sb_access_token', { path: '/' });
    }
  } else if (sbUser && !sbAccessToken) {
    // sb_user exists but access token is gone — session is dead
    event.cookies.delete('sb_user', { path: '/' });

    if (!isPublicRoute(path)) {
      throw redirect(303, '/signin?expired=true');
    }
  }

  return resolve(event);
};