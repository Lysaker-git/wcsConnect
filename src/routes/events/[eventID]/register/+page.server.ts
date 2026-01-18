import { fail } from '@sveltejs/kit';
import { supabase } from '$lib/api/supabaseClient';

export const load = async ({ params, cookies }) => {
    const sbUser = cookies.get('sb_user');
    let user = null;
    let profile = null;
    let products = [];
    
    const eventID = params.eventID;

    if (sbUser) {
        try {
            user = JSON.parse(sbUser);
            try {
                const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (!error) profile = data;
            } catch (pe) {
                console.warn('[registration load] profile fetch error', pe);
            }
        } catch (e) {
            user = null;
        }
    }

    // Fetch products for this event
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('event_id', eventID)
            .eq('is_active', true);
        
        if (!error && data) {
            products = data;
        }
    } catch (pe) {
        console.warn('[registration load] products fetch error', pe);
    }

    console.log('[registration load] user:', user);
    console.log('[registration load] profile:', profile);
    console.log('[registration load] products:', products);
    
    return { user, profile, products };
};

export const actions = {
    register: async ({ request, params, cookies }) => {
        try {
            const formData = await request.formData();
            const eventID = params.eventID;
            
            const sbUser = cookies.get('sb_user');
            if (!sbUser) {
                return fail(401, { message: 'Not authenticated' });
            }

            const user = JSON.parse(sbUser);
            const userID = user.id;

            // Get form data
            const role = formData.get('role')?.toString();
            const wsdcID = formData.get('wsdcID')?.toString();
            const wsdcLevel = formData.get('wsdcLevel')?.toString();
            const country = formData.get('country')?.toString();
            const age = formData.get('age')?.toString();
            const partner = formData.get('partner')?.toString();

            // Get selected products
            const selectedProducts: Array<{ productID: string; quantity: number }> = [];
            const entries = Array.from(formData.entries());
            entries.forEach(([key, value]) => {
                if (key.startsWith('product_')) {
                    const productID = key.replace('product_', '');
                    const quantity = parseInt(value.toString());
                    if (quantity > 0) {
                        selectedProducts.push({ productID, quantity });
                    }
                }
            });

            if (selectedProducts.length === 0) {
                return fail(400, { message: 'Please select at least one product' });
            }

            // Determine status based on partner
            const status = partner ? 'pending_couples_registration' : 'pending_single_registration';

            // Create event_participants entry
            const { data: participantData, error: participantError } = await supabase
                .from('event_participants')
                .insert({
                    event_id: eventID,
                    user_id: userID,
                    event_role: role,
                    wsdcID: wsdcID ? parseInt(wsdcID) : null,
                    wsdcLevel,
                    country,
                    age,
                    partner_name: partner || null,
                    role,
                    status
                })
                .select()
                .single();

            if (participantError) {
                console.error('[registration] participant insert error:', participantError);
                return fail(500, { message: 'Failed to create participant record' });
            }

            // Fetch product prices for order calculation
            const productIDs = selectedProducts.map(p => p.productID);
            const { data: productData, error: productError } = await supabase
                .from('products')
                .select('id, price')
                .in('id', productIDs);

            if (productError || !productData) {
                console.error('[registration] products fetch error:', productError);
                return fail(500, { message: 'Failed to fetch product prices' });
            }

            // Calculate total
            let total = 0;
            const priceMap = new Map(productData.map(p => [p.id, p.price]));
            selectedProducts.forEach(sp => {
                const price = priceMap.get(sp.productID) || 0;
                total += parseFloat(price.toString()) * sp.quantity;
            });

            // Create order
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert({
                    user_id: userID,
                    event_id: eventID,
                    total,
                    status: 'pending'
                })
                .select()
                .single();

            if (orderError) {
                console.error('[registration] order insert error:', orderError);
                return fail(500, { message: 'Failed to create order' });
            }

            // Create order_items entries
            const orderItems = selectedProducts.map(sp => ({
                order_id: orderData.id,
                product_id: sp.productID,
                quantity: sp.quantity,
                price_at_purchase: priceMap.get(sp.productID) || 0
            }));

            const { error: orderItemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (orderItemsError) {
                console.error('[registration] order items insert error:', orderItemsError);
                return fail(500, { message: 'Failed to create order items' });
            }

            return { success: true, orderId: orderData.id };
        } catch (err) {
            console.error('[registration action] error:', err);
            return fail(500, { message: (err as any)?.message ?? 'Registration failed' });
        }
    }
};