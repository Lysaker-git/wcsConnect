import { supabase } from '$lib/server/supabaseServiceClient';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const PLATFORM_FEE_PERCENT = 0.01;

export const load: PageServerLoad = async ({ params, cookies }) => {
  const { eventId } = params;

  // Auth check
  const sbUser = cookies.get('sb_user');
  if (!sbUser) throw error(401, 'Not authenticated');

  let user: any;
  try { user = JSON.parse(sbUser); } catch { throw error(401, 'Invalid session'); }

  // Verify this user is the Event Director for this event
  const { data: edCheck } = await supabase
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .eq('event_role', 'Event Director')
    .single();

  if (!edCheck) throw error(403, 'Not authorized for this event');

  // Fetch event info
  const { data: event } = await supabase
    .from('events')
    .select('id, title, start_date, end_date')
    .eq('id', eventId)
    .single();

  // Fetch all participants for this event (excluding Event Director)
  const { data: participants } = await supabase
    .from('event_participants')
    .select(`
      id,
      user_id,
      status,
      event_role,
      profiles ( username, country )
    `)
    .eq('event_id', eventId)
    .neq('event_role', 'Event Director');


  // Fetch all participant_products for this event's participants
  const participantIds = (participants ?? []).map(p => p.id);

  let allProducts: any[] = [];
  if (participantIds.length > 0) {
    const { data: products } = await supabase
      .from('participant_products')
      .select('*')
      .in('participant_id', participantIds);
    
    allProducts = products ?? [];

  }

  // Build per-participant rows
  const participantRows = (participants ?? []).map(p => {
    const products = allProducts.filter(pp => pp.participant_id === p.id);
    const paidProducts = products.filter(pp => pp.payment_status === 'paid');
    const pendingProducts = products.filter(pp => pp.payment_status === 'pending');
    const paidTotal = paidProducts.reduce((sum, pp) => sum + parseFloat(pp.subtotal), 0);
    const pendingTotal = pendingProducts.reduce((sum, pp) => sum + parseFloat(pp.subtotal), 0);

    return {
      participant_id: p.id,
      user_id: p.user_id,
      username: (p.profiles as any)?.username ?? 'Unknown',
      country: (p.profiles as any)?.country ?? '',
      status: p.status,
      paidProducts,
      pendingProducts,
      paidTotal,
      pendingTotal,
      currency: products[0]?.currency_type ?? 'EUR'
    };
  });

  // Aggregate stats
  const totalRevenue = participantRows.reduce((sum, r) => sum + r.paidTotal, 0);
  const totalPending = participantRows.reduce((sum, r) => sum + r.pendingTotal, 0);
  const platformFees = totalRevenue * PLATFORM_FEE_PERCENT;
  const organizerRevenue = totalRevenue - platformFees;
  const currency = allProducts[0]?.currency_type ?? 'EUR';

  return {
    event,
    participantRows,
    stats: {
      totalRevenue,
      totalPending,
      platformFees,
      organizerRevenue,
      currency,
      paidCount: participantRows.filter(r => r.paidTotal > 0).length,
      pendingCount: participantRows.filter(r => r.pendingTotal > 0).length
    }
  };
};