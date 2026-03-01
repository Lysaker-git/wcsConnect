import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const { user } = await locals.safeGetSession();
  if (user) {
    const redirectTo = url.searchParams.get('redirect') ?? '/profile';
    throw redirect(303, redirectTo);
  }
  return {};
};