import { fail, json, redirect } from '@sveltejs/kit';
import { supabase } from "$lib/server/supabaseServiceClient";

export const load = async ({ params, cookies }) => {
    const sbUser = cookies.get('sb_user');
    let user = null;
    let profile = null;
    let products = [];
    
    const eventID = params.eventID;

    if (sbUser) {
        try {
            user = JSON.parse(sbUser);

            // Check email verification status via Supabase Auth admin
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id);

            if (authError || !authUser?.user) {
                throw redirect(303, '/signin');
            }

            if (!authUser.user.email_confirmed_at) {
                throw redirect(303, '/signup/verify-email?reason=unverified');
            }

            try {
                const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (!error) profile = data;
            } catch (pe) {
                console.warn('[registration load] profile fetch error', pe);
            }
        } catch (e: any) {
            if (e?.status === 303) throw e; // let redirect through
            user = null;
        }
    } else {
        // Not logged in at all — send to signin
        throw redirect(303, `/profile?redirect=/events/${params.eventID}/register`);
    }

    // Check if registration is open
    const { data: eventData } = await supabase
    .from('events')
    .select('registration_opens')
    .eq('id', eventID)
    .single();

    if (eventData?.registration_opens && new Date(eventData.registration_opens) > new Date()) {
        throw redirect(303, `/events/${eventID}`);
    }

    // Fetch products for this event
    try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('products')
            .select('*, product_groups(id, name, quantity_total, quantity_sold)')
            .eq('event_id', eventID)
            .eq('is_active', true)
            .or(`sale_start.is.null,sale_start.lte.${now}`)
            .or(`sale_end.is.null,sale_end.gte.${now}`);


        if (!error && data) {
            // Filter server-side: quantity_sold < quantity_total
            products = data.filter(p => {
                if (typeof p.quantity_total === 'number' && typeof p.quantity_sold === 'number') {
                    if (p.quantity_sold >= p.quantity_total) return false;
                }
                if (p.product_groups) {
                    if ((p.product_groups.quantity_sold ?? 0) >= p.product_groups.quantity_total) return false;
                }
                return true;
            });
        }

        
        
        
    } catch (pe) {
        console.warn('[registration load] products fetch error', pe);
    }

            // Fetch event fee model
    const { data: eventFeeData } = await supabase
        .from('events')
        .select('stripe_fee_model')
        .eq('id', params.eventID)
        .single();

    
    return { 
        user, 
        profile, 
        products,
        stripe_fee_model: eventFeeData?.stripe_fee_model ?? 'on_top'
    };
};

export const actions = {
    register: async ({ request, params, cookies }) => {
        try {
            const formData = await request.formData();
            const eventID = params.eventID;
            
            
            const sbUser = cookies.get('sb_user');
            if (!sbUser) {
                console.warn('[registration] No authenticated user');
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
            const promo_code = formData.get('promo_code')?.toString() || null;
            const promo_discount = parseFloat(formData.get('promo_discount')?.toString() || '0');

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

            // Fetch products to check availability
            const productIDs = selectedProducts.map(p => p.productID);
            
            const { data: productData, error: productError } = await supabase
                .from('products')
                .select('id, name, quantity_total, quantity_sold, currency_type, price, product_type, product_group_id')
                .in('id', productIDs);

            if (productError || !productData) {
                console.error('[registration] products fetch error:', productError);
                return fail(500, { message: 'Failed to fetch product information' });
            }


            // Check if any products are sold out or insufficient quantity
            const soldOutProducts = [];
            const availableProducts = [];

            for (const product of productData) {
                const selectedQuantity = selectedProducts.find(p => p.productID === product.id)?.quantity || 0;
                const remainingQuantity = product.quantity_total ? product.quantity_total - product.quantity_sold : Infinity;
                
                
                const isSoldOut = product.quantity_total && (product.quantity_sold + selectedQuantity) > product.quantity_total;
                
                if (isSoldOut) {
                    
                    soldOutProducts.push(product.name);
                } else {
                    
                    availableProducts.push(product);
                }
            }

            // If any products are sold out, return error with sold out info
            if (soldOutProducts.length > 0) {
                console.warn('[registration] Some products sold out:', soldOutProducts);
                return fail(400, { 
                    message: 'Some products are sold out',
                    soldOutProducts,
                    partial: true
                });
            }
            // Check group pool availability
            const groupIds = productData
                .filter(p => p.product_group_id)
                .map(p => p.product_group_id)
                .filter((v, i, a) => a.indexOf(v) === i); // unique

                if (groupIds.length > 0) {
                const { data: groups } = await supabase
                    .from('product_groups')
                    .select('id, name, quantity_total, quantity_sold')
                    .in('id', groupIds);

                for (const group of groups ?? []) {
                    const groupProducts = selectedProducts.filter(sp =>
                    productData.find(p => p.id === sp.productID)?.product_group_id === group.id
                    );
                    const totalRequested = groupProducts.reduce((sum, sp) => sum + sp.quantity, 0);

                    if ((group.quantity_sold + totalRequested) > group.quantity_total) {
                    return fail(400, {
                        message: `"${group.name}" is fully booked — no spots remaining in this pool`,
                        soldOutProducts: [group.name],
                        partial: true
                    });
                    }
                }
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

            

            // Create participant_products entries
            
            const participantProductsToInsert = [];
            
            for (const selectedProduct of selectedProducts) {
                const product = productData.find(p => p.id === selectedProduct.productID);
                if (!product) {
                    console.warn(`[registration] Product ${selectedProduct.productID} not found`);
                    continue;
                }

                let unitPrice = parseFloat(product.price.toString());
                if (promo_code && promo_discount > 0 && product.product_type === 'ticket') {
                unitPrice = unitPrice * (1 - promo_discount / 100);
                }
                const subtotal = unitPrice * selectedProduct.quantity;
                
                participantProductsToInsert.push({
                    participant_id: participantData.id,
                    product_id: product.id,
                    product_name: product.name,
                    product_type: product.product_type || 'Other',
                    quantity_ordered: selectedProduct.quantity,
                    currency_type: product.currency_type,
                    subtotal: subtotal,
                    payment_status: 'pending',
                    confirmation_status: 'pending',
                    unit_price: unitPrice,
                    promo_code_used: promo_code
                });

                
            }

            // Batch insert participant_products
            if (participantProductsToInsert.length > 0) {
                const { data: participantProductsData, error: participantProductsError } = await supabase
                    .from('participant_products')
                    .insert(participantProductsToInsert)
                    .select();

                if (participantProductsError) {
                    console.error('[registration] participant_products insert error:', participantProductsError);
                    return fail(500, { message: 'Failed to create participant products' });
                }

                
            }

            // Update quantity_sold in products table
            
            for (const selectedProduct of selectedProducts) {
                const product = productData.find(p => p.id === selectedProduct.productID);
                if (!product) {
                    console.warn(`[registration] Product ${selectedProduct.productID} not found in productData`);
                    continue;
                }

                const newQuantitySold = (product.quantity_sold || 0) + selectedProduct.quantity;


                const { data: updateData, error: updateError } = await supabase
                    .from('products')
                    .update({ quantity_sold: newQuantitySold })
                    .eq('id', product.id)
                    .select();


                if (updateError) {
                    console.error(`[registration] Failed to update quantity_sold for product ${product.id}:`, updateError);
                    return fail(500, { message: `Failed to update product quantity for ${product.name}` });
                }

                
            }
            
            // Update group quantity_sold
            const usedGroupIds = [...new Set(
                productData
                    .filter(p => p.product_group_id)
                    .map(p => p.product_group_id)
            )];

            for (const groupId of usedGroupIds) {
                const groupProducts = selectedProducts.filter(sp =>
                    productData.find(p => p.id === sp.productID)?.product_group_id === groupId
                );
                const totalSold = groupProducts.reduce((sum, sp) => sum + sp.quantity, 0);

                const { data: group } = await supabase
                    .from('product_groups')
                    .select('quantity_sold')
                    .eq('id', groupId)
                    .single();

                if (group) {
                    await supabase
                        .from('product_groups')
                        .update({ quantity_sold: (group.quantity_sold ?? 0) + totalSold })
                        .eq('id', groupId);
                }
            }

            // Calculate total for receipt
            let total = 0;
            selectedProducts.forEach(sp => {
                const product = productData.find(p => p.id === sp.productID);
                if (product) {
                    total += parseFloat(product.price.toString()) * sp.quantity;
                }
            });

            // Get currency from first product
            const currency = productData[0]?.currency_type || 'EUR';

            
            return { 
                success: true, 
                participantId: participantData.id, 
                selectedProducts,
                total,
                currency
            };
        } catch (err) {
            console.error('[registration action] error:', err);
            return fail(500, { message: (err as any)?.message ?? 'Registration failed' });
        }
    },
    validatePromo: async ({ request, params }) => {
        const eventID = params.eventID;
        const form = await request.formData();
        const code = form.get('code')?.toString().toUpperCase().trim();

        if (!code) return fail(400, { promoError: 'Enter a promo code' });

        const today = new Date().toISOString().split('T')[0];

        const { data: promo } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('event_id', eventID)
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