import { json } from '@sveltejs/kit';
import setRolesAsCaller from '$lib/api/admin/setRoles';

export async function POST({ request, cookies }) {
    // Log the start of the POST request

    try {
        const sbUser = cookies.get('sb_user');
        const sbAccess = cookies.get('sb_access_token');

        // Check for required cookies
        if (!sbUser || !sbAccess) {
            console.warn('🔑 [API/Admin/SetRoles] Unauthorized: Missing sb_user or sb_access_token cookies.');
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        let caller;
        try {
            caller = JSON.parse(sbUser);
            // Log the ID of the calling user if available
        } catch (e) {
            console.error('❌ [API/Admin/SetRoles] Invalid sb_user cookie: Failed to parse JSON.', e);
            return json({ error: 'Invalid sb_user cookie' }, { status: 400 });
        }

        const callerRoles: string[] = caller?.userRole ?? caller?.profile?.userRole ?? [];
        
        const allowed = callerRoles.includes('Owner') || callerRoles.includes('Super User');

        // Check for required roles for authorization
        if (!allowed) {
            console.warn(`🛑 [API/Admin/SetRoles] Forbidden: Caller (ID: ${caller?.id || 'Unknown'}) does not have required 'Owner' or 'Super User' role.`);
            return json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { targetId, roles } = body;

        // Validate request body parameters
        if (!targetId || !Array.isArray(roles)) {
            console.error('🚫 [API/Admin/SetRoles] Bad request: Missing targetId or roles is not an array.', { targetId, roles });
            return json({ error: 'Bad request' }, { status: 400 });
        }

        const result = await setRolesAsCaller(sbAccess, targetId, roles);

        // Check the result of the role setting function
        if (!result.success) {
            console.error(`💔 [API/Admin/SetRoles] Failed to set roles for Target ID ${targetId}. Error:`, result.error);
            return json({ error: result.error }, { status: 500 });
        }

        // Log successful operation
        return json({ success: true, profile: result.data });
    } catch (err) {
        // Log any unexpected server-side errors
        const errorMessage = (err as any)?.message ?? String(err);
        console.error('🔥 [API/Admin/SetRoles] Unexpected Server Error:', errorMessage, err);
        return json({ error: errorMessage }, { status: 500 });
    }
}