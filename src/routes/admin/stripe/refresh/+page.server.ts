import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  // Just send them back to start the connect flow again
  throw redirect(303, '/api/stripe/connect');
};