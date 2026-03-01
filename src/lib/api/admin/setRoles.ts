import type { SupabaseClient } from '@supabase/supabase-js';

export type Role = 'Owner' | 'Super User' | 'Event director' | 'Local Teacher' | 'Dancer' | 'Scorer';

export interface SetRolesResult {
  success: boolean;
  data?: any;
  error?: any;
}

export async function setRolesAsCaller(
  client: SupabaseClient,
  targetId: string,
  roles: Role[] | string[]
): Promise<SetRolesResult> {
  if (!targetId) {
    console.error('[setRoles] Missing target id');
    return { success: false, error: 'missing target id' };
  }

  try {
    const { data, error } = await client
      .from('profiles')
      .update({ userRole: roles })
      .eq('id', targetId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[setRoles] UPDATE failed:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('[setRoles] Unexpected error:', err);
    return { success: false, error: err };
  }
}

export default setRolesAsCaller;