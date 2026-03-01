import { json } from '@sveltejs/kit';

export async function POST({ locals, cookies }) {
  // Sign out via SSR client — clears session cookies automatically
  await locals.supabase.auth.signOut();

  // Clear display cookie
  cookies.delete('sb_user', { path: '/' });

  return json({ success: true });
}