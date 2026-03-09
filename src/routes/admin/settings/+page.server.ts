import { fail } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabaseServiceClient';

export const load = async () => {
    const { data: banner } = await supabase
        .from('status_banner')
        .select('message, is_active, updated_at')
        .eq('id', 1)
        .maybeSingle();

    return {
        banner: banner ?? { message: '', is_active: false, updated_at: null }
    };
};

export const actions = {
    saveBanner: async ({ request }) => {
        const form = await request.formData();
        const message = form.get('message')?.toString().trim() ?? '';
        const is_active = form.get('is_active') === 'true';

        const { error } = await supabase
            .from('status_banner')
            .upsert({ id: 1, message, is_active, updated_at: new Date().toISOString() });

        if (error) {
            console.error('[settings] banner save error:', error);
            return fail(500, { error: 'Failed to save' });
        }

        return { success: true };
    }
};
