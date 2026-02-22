import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
  const sbUser = cookies.get('sb_user');
  if (sbUser) {
    try {
      const user = JSON.parse(sbUser);
      if (user?.id) throw redirect(303, '/profile');
    } catch (e: any) {
      if (e?.status === 303) throw e;
    }
  }
  return {};
};