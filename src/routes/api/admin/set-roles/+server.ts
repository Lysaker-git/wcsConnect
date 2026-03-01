import { json } from '@sveltejs/kit';
import setRolesAsCaller from '$lib/api/admin/setRoles';

export async function POST({ request, locals }) {
  try {
    const { user } = await locals.safeGetSession();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use locals.userRole set by hooks — no extra DB call needed
    const allowed = locals.userRole.includes('Owner') || locals.userRole.includes('Super User');
    if (!allowed) {
      console.warn(`[SetRoles] Forbidden: user ${user.id} lacks required role`);
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { targetId, roles } = body;

    if (!targetId || !Array.isArray(roles)) {
      return json({ error: 'Bad request' }, { status: 400 });
    }

    // Pass locals.supabase directly — already carries the user's JWT
    const result = await setRolesAsCaller(locals.supabase, targetId, roles);

    if (!result.success) {
      console.error(`[SetRoles] Failed for target ${targetId}:`, result.error);
      return json({ error: result.error }, { status: 500 });
    }

    return json({ success: true, profile: result.data });

  } catch (err) {
    console.error('[SetRoles] Unexpected error:', err);
    return json({ error: (err as any)?.message ?? String(err) }, { status: 500 });
  }
}