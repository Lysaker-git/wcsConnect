import { fail, json } from '@sveltejs/kit';
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
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('event_id', eventID)
            .eq('is_active', true)
            .or(`sale_start.is.null,sale_start.lte.${now}`)
            .or(`sale_end.is.null,sale_end.gte.${now}`);
        if (!error && data) {
            // Filter server-side: quantity_sold < quantity_total
            products = data.filter(
                p =>
                    (typeof p.quantity_total === 'number' && typeof p.quantity_sold === 'number'
                        ? p.quantity_sold < p.quantity_total
                        : true)
            );
        }
    } catch (pe) {
        console.warn('[registration load] products fetch error', pe);
    }

    return { user, profile, products };
};

export const actions = {
    register: async ({ request, params, cookies }) => {
        try {
            const formData = await request.formData();
            const eventID = params.eventID;
            
            console.log('[registration] Starting registration for event:', eventID);
            
            const sbUser = cookies.get('sb_user');
            if (!sbUser) {
                console.warn('[registration] No authenticated user');
                return fail(401, { message: 'Not authenticated' });
            }

            const user = JSON.parse(sbUser);
            const userID = user.id;
            console.log('[registration] User ID:', userID);

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

            console.log('[registration] Selected products:', selectedProducts);

            if (selectedProducts.length === 0) {
                return fail(400, { message: 'Please select at least one product' });
            }

            // Fetch products to check availability
            const productIDs = selectedProducts.map(p => p.productID);
            console.log('[registration] Fetching products with IDs:', productIDs);
            
            const { data: productData, error: productError } = await supabase
                .from('products')
                .select('id, name, quantity_total, quantity_sold, currency_type, price')
                .in('id', productIDs);

            if (productError || !productData) {
                console.error('[registration] products fetch error:', productError);
                return fail(500, { message: 'Failed to fetch product information' });
            }

            console.log('[registration] Product data retrieved:', productData);

            // Check if any products are sold out or insufficient quantity
            const soldOutProducts = [];
            const availableProducts = [];

            for (const product of productData) {
                const selectedQuantity = selectedProducts.find(p => p.productID === product.id)?.quantity || 0;
                const remainingQuantity = product.quantity_total ? product.quantity_total - product.quantity_sold : Infinity;
                
                console.log(`[registration] Product ${product.name}: quantity_sold=${product.quantity_sold}, quantity_total=${product.quantity_total}, remaining=${remainingQuantity}, requested=${selectedQuantity}`);
                
                const isSoldOut = product.quantity_total && (product.quantity_sold + selectedQuantity) > product.quantity_total;
                
                if (isSoldOut) {
                    console.log(`[registration] Product ${product.name} is sold out or insufficient quantity`);
                    soldOutProducts.push(product.name);
                } else {
                    console.log(`[registration] Product ${product.name} is available`);
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

            // Determine status based on partner
            const status = partner ? 'pending_couples_registration' : 'pending_single_registration';

            // Create event_participants entry
            console.log('[registration] Creating event_participants record');
            
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

            console.log('[registration] event_participants created:', participantData.id);

            // Create participant_products entries
            console.log('[registration] Creating participant_products records');
            const participantProductsToInsert = [];
            
            for (const selectedProduct of selectedProducts) {
                const product = productData.find(p => p.id === selectedProduct.productID);
                if (!product) {
                    console.warn(`[registration] Product ${selectedProduct.productID} not found`);
                    continue;
                }

                const subtotal = parseFloat(product.price.toString()) * selectedProduct.quantity;
                
                participantProductsToInsert.push({
                    participant_id: participantData.id,
                    product_id: product.id,
                    product_name: product.name,
                    product_type: product.product_type || 'Other',
                    quantity_ordered: selectedProduct.quantity,
                    unit_price: parseFloat(product.price.toString()),
                    currency_type: product.currency_type,
                    subtotal: subtotal,
                    payment_status: 'pending',
                    confirmation_status: 'pending'
                });

                console.log(`[registration] Queued participant_product: ${product.name} x${selectedProduct.quantity} = ${subtotal}`);
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

                console.log('[registration] participant_products created:', participantProductsData?.length, 'records');
            }

            // Update quantity_sold in products table
            console.log('[registration] Updating quantity_sold in products');
            for (const selectedProduct of selectedProducts) {
                const product = productData.find(p => p.id === selectedProduct.productID);
                if (!product) {
                    console.warn(`[registration] Product ${selectedProduct.productID} not found in productData`);
                    continue;
                }

                const newQuantitySold = (product.quantity_sold || 0) + selectedProduct.quantity;
                console.log(`[registration] Attempting to update product:`, {
                    productId: product.id,
                    productName: product.name,
                    currentQuantitySold: product.quantity_sold,
                    quantityToAdd: selectedProduct.quantity,
                    newQuantitySold: newQuantitySold
                });

                const { data: updateData, error: updateError } = await supabase
                    .from('products')
                    .update({ quantity_sold: newQuantitySold })
                    .eq('id', product.id)
                    .select();

                console.log(`[registration] Update response for ${product.name}:`, {
                    success: !updateError,
                    error: updateError,
                    data: updateData
                });

                if (updateError) {
                    console.error(`[registration] Failed to update quantity_sold for product ${product.id}:`, updateError);
                    return fail(500, { message: `Failed to update product quantity for ${product.name}` });
                }

                console.log(`[registration] Successfully updated quantity_sold for ${product.name}`);
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

            console.log('[registration] Registration completed successfully. Participant ID:', participantData.id);
            
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
    }
};