import { fail, redirect } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabaseServiceClient';

export const load = async ({ params, locals }) => {
    const db = locals.supabase;
    const { user } = await locals.safeGetSession();
    const eventID = params.eventID;

    if (!user) {
        throw redirect(303, `/signin?redirect=/events/${params.eventID}/register`);
    }

    // auth.admin requires service role
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id);
    if (authError || !authUser?.user) throw redirect(303, '/signin');
    if (!authUser.user.email_confirmed_at) {
        throw redirect(303, '/signup/verify-email?reason=unverified');
    }

    // Check for existing registration
    const { data: existingRegistration } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', eventID)
        .eq('user_id', user.id)
        .not('event_role', 'eq', 'Event Director')
        .maybeSingle();

    if (existingRegistration) {
        throw redirect(303, `/profile/${existingRegistration.id}`);
    }

    // Profile fetch — user client via db
    let profile = null;
    try {
        const { data, error } = await db
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        if (!error) profile = data;
    } catch (e) {
        console.warn('[registration load] profile fetch error', e);
    }

    // Event data — public read via db
    const { data: eventData } = await db
        .from('events')
        .select('registration_opens, stripe_fee_model')
        .eq('id', eventID)
        .single();

    if (eventData?.registration_opens && new Date(eventData.registration_opens) > new Date()) {
        throw redirect(303, `/events/${eventID}`);
    }

    // Products — public read via db
    let products: any[] = [];
    try {
        const now = new Date().toISOString();
        const { data, error } = await db
            .from('products')
            .select('*, product_groups(id, name, quantity_total, quantity_sold)')
            .eq('event_id', eventID)
            .eq('is_active', true)
            .or(`sale_start.is.null,sale_start.lte.${now}`)
            .or(`sale_end.is.null,sale_end.gte.${now}`);

        if (!error && data) {
            products = data.filter((p: any) => {
                if (typeof p.quantity_total === 'number' && typeof p.quantity_sold === 'number') {
                    if (p.quantity_sold >= p.quantity_total) return false;
                }
                if (p.product_groups) {
                    if ((p.product_groups.quantity_sold ?? 0) >= p.product_groups.quantity_total) return false;
                }
                return true;
            });
        }
    } catch (e) {
        console.warn('[registration load] products fetch error', e);
    }

    return {
        user: { id: user.id, email: user.email },
        profile,
        products,
        stripe_fee_model: eventData?.stripe_fee_model ?? 'on_top'
    };
};

export const actions = {
    register: async ({ request, params, locals }) => {
        const db = locals.supabase;
        try {
            const formData = await request.formData();
            const eventID = params.eventID;

            // Get user from session
            const { user } = await locals.safeGetSession();
            if (!user) return fail(401, { message: 'Not authenticated' });
            const userID = user.id;

            const role = formData.get('role')?.toString();
            const wsdcID = formData.get('wsdcID')?.toString();
            const wsdcLevel = formData.get('wsdcLevel')?.toString();
            const country = formData.get('country')?.toString();
            const age = formData.get('age')?.toString();
            const partner = formData.get('partner')?.toString();
            const promo_code = formData.get('promo_code')?.toString() || null;
            const promo_discount = parseFloat(formData.get('promo_discount')?.toString() || '0');

            const selectedProducts: Array<{ productID: string; quantity: number }> = [];
            Array.from(formData.entries()).forEach(([key, value]) => {
                if (key.startsWith('product_')) {
                    const productID = key.replace('product_', '');
                    const quantity = parseInt(value.toString());
                    if (quantity > 0) selectedProducts.push({ productID, quantity });
                }
            });

            if (selectedProducts.length === 0) {
                return fail(400, { message: 'Please select at least one product' });
            }

            // Everything below uses service role — inventory management
            const { data: productData, error: productError } = await db
                .from('products')
                .select('id, name, quantity_total, quantity_sold, currency_type, price, product_type, product_group_id, mva_rate')
                .in('id', selectedProducts.map(p => p.productID));

            if (productError || !productData) {
                return fail(500, { message: 'Failed to fetch product information' });
            }

            const soldOutProducts: string[] = [];
            for (const product of productData) {
                const selectedQuantity = selectedProducts.find(p => p.productID === product.id)?.quantity || 0;
                const isSoldOut = product.quantity_total && (product.quantity_sold + selectedQuantity) > product.quantity_total;
                if (isSoldOut) soldOutProducts.push(product.name);
            }

            if (soldOutProducts.length > 0) {
                return fail(400, { message: 'Some products are sold out', soldOutProducts, partial: true });
            }

            const groupIds = [...new Set(
                productData.filter(p => p.product_group_id).map(p => p.product_group_id)
            )];

            if (groupIds.length > 0) {
                const { data: groups } = await db
                    .from('product_groups')
                    .select('id, name, quantity_total, quantity_sold')
                    .in('id', groupIds);

                for (const group of groups ?? []) {
                    const totalRequested = selectedProducts
                        .filter(sp => productData.find(p => p.id === sp.productID)?.product_group_id === group.id)
                        .reduce((sum, sp) => sum + sp.quantity, 0);

                    if ((group.quantity_sold + totalRequested) > group.quantity_total) {
                        return fail(400, {
                            message: `"${group.name}" is fully booked`,
                            soldOutProducts: [group.name],
                            partial: true
                        });
                    }
                }
            }

            const { data: participantData, error: participantError } = await db
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
                    status: partner ? 'pending_couples_registration' : 'pending_single_registration'
                })
                .select()
                .single();

            if (participantError) {
                console.error('[registration] participant insert error:', participantError);
                return fail(500, { message: 'Failed to create participant record' });
            }

            const participantProductsToInsert = selectedProducts.map(sp => {
                const product = productData.find(p => p.id === sp.productID)!;
                let unitPrice = parseFloat(product.price.toString());
                if (promo_code && promo_discount > 0 && product.product_type === 'ticket') {
                    unitPrice = unitPrice * (1 - promo_discount / 100);
                }
                const subtotal = unitPrice * sp.quantity;
                const mva_rate = parseFloat(product.mva_rate?.toString() || '0');
                const mva_amount = mva_rate > 0
                    ? Math.round((subtotal * mva_rate / (100 + mva_rate)) * 100) / 100
                    : 0;
                return {
                    participant_id: participantData.id,
                    product_id: product.id,
                    product_name: product.name,
                    product_type: product.product_type || 'Other',
                    quantity_ordered: sp.quantity,
                    currency_type: product.currency_type,
                    subtotal,
                    payment_status: 'pending',
                    confirmation_status: 'pending',
                    unit_price: unitPrice,
                    promo_code_used: promo_code,
                    mva_rate,
                    mva_amount
                };
            });

            const { error: ppError } = await db
                .from('participant_products')
                .insert(participantProductsToInsert);

            if (ppError) {
                console.error('[registration] participant_products insert error:', ppError);
                await db.from('event_participants').delete().eq('id', participantData.id);
                return fail(500, { message: 'Failed to create participant products — please try again' });
            }

            for (const sp of selectedProducts) {
                const product = productData.find(p => p.id === sp.productID)!;
                await db
                    .from('products')
                    .update({ quantity_sold: (product.quantity_sold || 0) + sp.quantity })
                    .eq('id', product.id);
            }

            const usedGroupIds = [...new Set(
                productData.filter(p => p.product_group_id).map(p => p.product_group_id)
            )];

            for (const groupId of usedGroupIds) {
                const totalSold = selectedProducts
                    .filter(sp => productData.find(p => p.id === sp.productID)?.product_group_id === groupId)
                    .reduce((sum, sp) => sum + sp.quantity, 0);

                await supabase.rpc('increment_group_quantity_sold', {
                    p_group_id: groupId,
                    p_amount: totalSold
                });
            }

            const total = selectedProducts.reduce((sum, sp) => {
                const product = productData.find(p => p.id === sp.productID);
                return sum + (product ? parseFloat(product.price.toString()) * sp.quantity : 0);
            }, 0);

            return {
                success: true,
                participantId: participantData.id,
                selectedProducts,
                total,
                currency: productData[0]?.currency_type || 'EUR'
            };

        } catch (err) {
            console.error('[registration action] error:', err);
            return fail(500, { message: (err as any)?.message ?? 'Registration failed' });
        }
    },

    validatePromo: async ({ request, params, locals }) => {
        const db = locals.supabase;
        const form = await request.formData();
        const code = form.get('code')?.toString().toUpperCase().trim();
        if (!code) return fail(400, { promoError: 'Enter a promo code' });

        const today = new Date().toISOString().split('T')[0];

        const { data: promo } = await db
            .from('promo_codes')
            .select('*')
            .eq('event_id', params.eventID)
            .eq('code', code)
            .eq('is_active', true)
            .lte('valid_from', today)
            .gte('valid_to', today)
            .single();

        if (!promo) return fail(400, { promoError: 'Invalid or expired promo code' });

        return {
            promoValid: true,
            promoCode: promo.code,
            promoDiscount: promo.discount_percent
        };
    }
};