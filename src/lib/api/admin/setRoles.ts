import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_API_KEY } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

export type Role = 'Owner' | 'Super User' | 'Event director' | 'Local Teacher' | 'Dancer' | 'Scorer';

export interface SetRolesResult {
	success: boolean;
	data?: any;
	error?: any;
}

/**
 * Update the roles array for a profile using the caller's JWT so RLS applies.
 * This implementation creates a temporary Supabase client per-request and
 * attaches the caller JWT in the global headers so auth.uid() will be set
 * for Row Level Security.
 */
export async function setRolesAsCaller(callerJwt: string, targetId: string, roles: Role[] | string[]): Promise<SetRolesResult> {
	console.log(`🔨 [API/Admin/setRoles] Starting role update for Target ID: ${targetId}. Roles: [${roles.join(', ')}]`);

	// Initial input validation
	if (!callerJwt) {
		console.error('🔑 [API/Admin/setRoles] Aborting: Missing caller JWT.');
		return { success: false, error: 'missing caller JWT' };
	}
	if (!targetId) {
		console.error('🆔 [API/Admin/setRoles] Aborting: Missing target id.');
		return { success: false, error: 'missing target id' };
	}

	// create a temporary supabase client that includes the caller's JWT
	console.log('🔗 [API/Admin/setRoles] Creating temporary Supabase client with caller JWT for RLS.');
	const temp = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_API_KEY, {
		global: {
			headers: {
				Authorization: `Bearer ${callerJwt}`,
				apikey: PUBLIC_SUPABASE_API_KEY
			}
		}
	});

	try {
		// Log the database operation details
		console.log(`📡 [API/Admin/setRoles] Executing Supabase UPDATE on 'profiles' table for ID: ${targetId}.`);

		// write into `userRole` jsonb column (your schema uses jsonb for roles)
		const { data, error } = await temp
			.from('profiles')
			.update({ userRole: roles })
			.eq('id', targetId)
			.select()
			.maybeSingle();

		if (error) {
			console.error('❌ [API/Admin/setRoles] Supabase UPDATE failed. Error details:', error);
			return { success: false, error };
		}
		
		// Log successful operation
		console.log(`✅ [API/Admin/setRoles] Successfully updated roles for Target ID: ${targetId}.`);
		return { success: true, data };
	} catch (err) {
		// Log any unexpected error during the process
		console.error('🔥 [API/Admin/setRoles] Unexpected error during database operation:', err);
		return { success: false, error: err };
	}
}

export default setRolesAsCaller;