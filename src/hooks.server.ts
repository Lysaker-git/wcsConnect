import { createSupabaseServerClient } from '$lib/server/supabase';
import { createClient } from '@supabase/supabase-js';
import { redirect, type Handle } from '@sveltejs/kit';
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from '$env/static/private';

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
  event.locals.supabase = createSupabaseServerClient(event.cookies);

  event.locals.safeGetSession = async () => {
    const { data: { session } } = await event.locals.supabase.auth.getSession();
    if (!session) return { session: null, user: null };
    const { data: { user }, error } = await event.locals.supabase.auth.getUser();
    if (error || !user) return { session: null, user: null };
    return { session, user };
  };

  const { user } = await event.locals.safeGetSession();
  const path = event.url.pathname;

  // Fetch and attach userRole so every page has it without extra DB calls
  if (user) {
    try {
      const serviceRole = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: profile } = await serviceRole
        .from('profiles')
        .select('userRole')
        .eq('id', user.id)
        .maybeSingle();
      event.locals.userRole = profile?.userRole ?? [];
    } catch {
      event.locals.userRole = [];
    }
  } else {
    event.locals.userRole = [];
  }

  if (!user && !isPublicRoute(path)) {
    throw redirect(303, `/signin?redirect=${encodeURIComponent(path)}`);
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
};