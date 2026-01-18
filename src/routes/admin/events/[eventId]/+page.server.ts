import { supabase } from '$lib/api/supabaseClient';
import { error as svelteError } from '@sveltejs/kit';

export const load = async ({ params, cookies }) => {
  const { eventId } = params;

  // Get user from cookies
  const sbUser = cookies.get('sb_user');
  let user = null;
  if (sbUser) {
    try {
      user = JSON.parse(sbUser);
    } catch (e) {
      throw svelteError(401, 'Invalid user session');
    }
  } else {
    throw svelteError(401, 'Not authenticated');
  }

  // Check if user is Event Director for this event
  const { data: participant, error: participantError } = await supabase
    .from('event_participants')
    .select('event_role')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .eq('event_role', 'Event Director')
    .single();

  if (participantError || !participant) {
    throw svelteError(403, 'Access denied: You are not an Event Director for this event');
  }

  // Load event details
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventError || !eventData) {
    throw svelteError(404, 'Event not found');
  }

  // Load event details from event_details table
  const { data: eventDetails, error: detailsError } = await supabase
    .from('event_details')
    .select('*')
    .eq('event_id', eventId)
    .single();

  // If no event_details record exists, create one
  let eventDetailsData = eventDetails;
  if (detailsError && detailsError.code === 'PGRST116') {
    const { data: newDetails, error: createError } = await supabase
      .from('event_details')
      .insert({
        event_id: eventId,
        description: null,
        address: null,
        hotel: null,
        venue: null,
        max_participants: null
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating event details:', createError);
    } else {
      eventDetailsData = newDetails;
    }
  }

  // Load products for this event
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (productsError) {
    console.error('Error loading products:', productsError);
  }

  return { event: eventData, eventDetails: eventDetailsData, user, products: products || [] };
};

export const actions = {
  createProduct: async ({ request, params, cookies }) => {
    const { eventId } = params;

    // Verify user is Event Director
    const sbUser = cookies.get('sb_user');
    if (!sbUser) {
      throw svelteError(401, 'Not authenticated');
    }
    
    let user;
    try {
      user = JSON.parse(sbUser);
    } catch (e) {
      throw svelteError(401, 'Invalid user session');
    }

    const { data: participant } = await supabase
      .from('event_participants')
      .select('event_role')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .eq('event_role', 'Event Director')
      .single();

    if (!participant) {
      throw svelteError(403, 'Access denied');
    }

    // Parse form data
    const form = await request.formData();
    const name = form.get('name')?.toString();
    const description = form.get('description')?.toString();
    const price = parseFloat(form.get('price')?.toString() || '0');
    const product_type = form.get('product_type')?.toString();
    const currency_type = form.get('currency_type')?.toString() || 'USD';
    const sale_start = form.get('sale_start')?.toString();
    const sale_end = form.get('sale_end')?.toString();
    const quantity_total = form.get('quantity_total') ? parseInt(form.get('quantity_total')?.toString() || '0') : null;
    const leader_limit = form.get('leader_limit') ? parseInt(form.get('leader_limit')?.toString() || '0') : null;
    const follower_limit = form.get('follower_limit') ? parseInt(form.get('follower_limit')?.toString() || '0') : null;
    const is_active = form.get('is_active') === 'on';

    if (!name || !product_type || price < 0) {
      throw svelteError(400, 'Missing required fields or invalid price');
    }

    // Create product
    const { data, error } = await supabase
      .from('products')
      .insert({
        event_id: eventId,
        name,
        description,
        price,
        product_type,
        currency_type,
        sale_start: sale_start || null,
        sale_end: sale_end || null,
        quantity_total,
        quantity_sold: 0,
        is_active,
        leader_limit,
        follower_limit,
        role_options: null // Not used for pricing anymore
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      throw svelteError(500, 'Failed to create product');
    }

    return { success: true, product: data };
  },
  deleteProduct: async ({ request, params, cookies }) => {
    const { eventId } = params;

    // Verify user is Event Director
    const sbUser = cookies.get('sb_user');
    if (!sbUser) {
      throw error(401, 'Not authenticated');
    }
    
    let user;
    try {
      user = JSON.parse(sbUser);
    } catch (e) {
      throw error(401, 'Invalid user session');
    }

    const { data: participant } = await supabase
      .from('event_participants')
      .select('event_role')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .eq('event_role', 'Event Director')
      .single();

    if (!participant) {
      throw svelteError(403, 'Access denied');
    }

    // Get product ID from form
    const form = await request.formData();
    const productId = form.get('productId')?.toString();

    if (!productId) {
      throw svelteError(400, 'Product ID required');
    }

    // Delete product
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('event_id', eventId); // Extra security to ensure product belongs to this event

    if (deleteError) {
      console.error('Error deleting product:', deleteError);
      throw svelteError(500, 'Failed to delete product');
    }

    return { success: true };
  },
  updateProduct: async ({ request, params, cookies }) => {
    const { eventId } = params;

    // Verify user is Event Director
    const sbUser = cookies.get('sb_user');
    if (!sbUser) {
      throw svelteError(401, 'Not authenticated');
    }
    
    let user;
    try {
      user = JSON.parse(sbUser);
    } catch (e) {
      throw svelteError(401, 'Invalid user session');
    }

    const { data: participant } = await supabase
      .from('event_participants')
      .select('event_role')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .eq('event_role', 'Event Director')
      .single();

    if (!participant) {
      throw svelteError(403, 'Access denied');
    }

    // Parse form data
    const form = await request.formData();
    const productId = form.get('productId')?.toString();
    const name = form.get('name')?.toString();
    const description = form.get('description')?.toString();
    const price = parseFloat(form.get('price')?.toString() || '0');
    const product_type = form.get('product_type')?.toString();
    const currency_type = form.get('currency_type')?.toString() || 'USD';
    const sale_start = form.get('sale_start')?.toString();
    const sale_end = form.get('sale_end')?.toString();
    const quantity_total = form.get('quantity_total') ? parseInt(form.get('quantity_total')?.toString() || '0') : null;
    const leader_limit = form.get('leader_limit') ? parseInt(form.get('leader_limit')?.toString() || '0') : null;
    const follower_limit = form.get('follower_limit') ? parseInt(form.get('follower_limit')?.toString() || '0') : null;
    const is_active = form.get('is_active') === 'on';

    if (!productId || !name || !product_type || price < 0) {
      throw error(400, 'Missing required fields or invalid price');
    }

    // Update product
    const { data, error } = await supabase
      .from('products')
      .update({
        name,
        description,
        price,
        product_type,
        currency_type,
        sale_start: sale_start || null,
        sale_end: sale_end || null,
        quantity_total,
        is_active,
        leader_limit,
        follower_limit,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .eq('event_id', eventId) // Extra security
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      throw svelteError(500, 'Failed to update product');
    }

    return { success: true, product: data };
  },

  updateEventDetails: async ({ request, params, cookies }) => {
    const { eventId } = params;

    // Verify user is Event Director
    const sbUser = cookies.get('sb_user');
    if (!sbUser) {
      throw svelteError(401, 'Not authenticated');
    }

    let user;
    try {
      user = JSON.parse(sbUser);
    } catch (e) {
      throw svelteError(401, 'Invalid user session');
    }

    const { data: participant } = await supabase
      .from('event_participants')
      .select('event_role')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .eq('event_role', 'Event Director')
      .single();

    if (!participant) {
      throw svelteError(403, 'Access denied');
    }

    const { eventData, eventDetailsData } = await request.json();

    // Update events table
    const { data: eventUpdate, error: eventError } = await supabase
      .from('events')
      .update({
        title: eventData.title,
        start_date: eventData.start_date,
        end_date: eventData.end_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()
      .single();

    if (eventError) {
      throw new Error(`Failed to update event: ${eventError.message}`);
    }

    // Update or insert event_details
    const { data: detailsUpdate, error: detailsError } = await supabase
      .from('event_details')
      .upsert({
        event_id: eventId,
        description: eventDetailsData.description || null,
        address: eventDetailsData.address || null,
        hotel: eventDetailsData.hotel || null,
        venue: eventDetailsData.venue || null,
        max_participants: eventDetailsData.max_participants || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'event_id'
      })
      .select()
      .single();

    if (detailsError) {
      throw new Error(`Failed to update event details: ${detailsError.message}`);
    }

    return { event: eventUpdate, eventDetails: detailsUpdate };
  },

  getEventParticipants: async ({ params, cookies }) => {
    const { eventId } = params;

    // Verify user is Event Director
    const sbUser = cookies.get('sb_user');
    if (!sbUser) {
      throw svelteError(401, 'Not authenticated');
    }

    let user;
    try {
      user = JSON.parse(sbUser);
    } catch (e) {
      throw svelteError(401, 'Invalid user session');
    }

    const { data: participant } = await supabase
      .from('event_participants')
      .select('event_role')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .eq('event_role', 'Event Director')
      .single();

    if (!participant) {
      throw svelteError(403, 'Access denied');
    }

    const { data, error } = await supabase
      .from('event_participants')
      .select(`
        id,
        event_role,
        created_at,
        profiles:user_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch participants: ${error.message}`);
    }

    return data;
  },

  updateParticipantRole: async ({ request, params, cookies }) => {
    const { eventId } = params;

    // Verify user is Event Director
    const sbUser = cookies.get('sb_user');
    if (!sbUser) {
      throw svelteError(401, 'Not authenticated');
    }

    let user;
    try {
      user = JSON.parse(sbUser);
    } catch (e) {
      throw svelteError(401, 'Invalid user session');
    }

    const { data: participant } = await supabase
      .from('event_participants')
      .select('event_role')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .eq('event_role', 'Event Director')
      .single();

    if (!participant) {
      throw svelteError(403, 'Access denied');
    }

    const { participantId, newRole } = await request.json();

    const { data, error } = await supabase
      .from('event_participants')
      .update({
        event_role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', participantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update participant role: ${error.message}`);
    }

    return data;
  }
};
