import { supabase } from '$lib/server/supabaseServiceClient';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const PLATFORM_FEE_PERCENT = 0.01;

export const load: PageServerLoad = async ({ params, locals }) => {
  const { eventId } = params;

  const { user } = await locals.safeGetSession();
  if (!user) throw error(401, 'Not authenticated');

  const { data: edCheck } = await supabase
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .in('event_role', ['Event Director', 'Event Super User'])
    .single();

  if (!edCheck) throw error(403, 'Not authorized for this event');

  // ── Core fetches (parallel) ──────────────────────────────────────────────────
  const [
    { data: event },
    { data: participants },
    { data: eventProducts }
  ] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, start_date, end_date')
      .eq('id', eventId)
      .single(),

    supabase
      .from('event_participants')
      .select(`
        id, user_id, status, event_role,
        role, wsdcLevel, country, created_at,
        profiles ( username, country )
      `)
      .eq('event_id', eventId)
      .not('event_role', 'in', '("Event Director","Event Super User")')
      .order('created_at', { ascending: true }),

    supabase
      .from('products')
      .select('id, name, product_type, quantity_total, quantity_sold, price, currency_type')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('product_type')
  ]);

  const participantIds = (participants ?? []).map(p => p.id);

  // ── Dependent fetches ────────────────────────────────────────────────────────
  let allProducts: any[] = [];
  let invoices: any[] = [];

  let hotelBookings: any[] = [];
  if (participantIds.length > 0) {
    const [{ data: pp }, { data: inv }, { data: hb }] = await Promise.all([
      supabase.from('participant_products').select('*').in('participant_id', participantIds),
      supabase
        .from('invoices')
        .select('id, created_at, total_incl_mva, currency, participant_id')
        .in('participant_id', participantIds)
        .order('created_at', { ascending: true }),
      supabase
        .from('hotel_bookings')
        .select('id, participant_id, room_name, deposit_paid, remaining_paid, remaining_amount, total_amount, deposit_amount, final_payment_deadline, currency')
        .in('participant_id', participantIds)
    ]);
    allProducts  = pp ?? [];
    invoices     = inv ?? [];
    hotelBookings = hb ?? [];
  }

  // ── Per-participant rows ─────────────────────────────────────────────────────
  const participantRows = (participants ?? []).map(p => {
    const products        = allProducts.filter(pp => pp.participant_id === p.id);
    const paidProducts    = products.filter(pp => pp.payment_status === 'paid');
    const pendingProducts = products.filter(pp => pp.payment_status === 'pending');
    const paidTotal       = paidProducts.reduce((sum, pp) => sum + parseFloat(pp.subtotal), 0);
    const pendingTotal    = pendingProducts.reduce((sum, pp) => sum + parseFloat(pp.subtotal), 0);

    return {
      participant_id: p.id,
      user_id:   p.user_id,
      username:  (p.profiles as any)?.username ?? 'Unknown',
      country:   p.country ?? (p.profiles as any)?.country ?? '',
      role:      p.role ?? '',
      wsdcLevel: p.wsdcLevel ?? '',
      status:    p.status,
      created_at: p.created_at,
      paidProducts,
      pendingProducts,
      paidTotal,
      pendingTotal,
      currency: products[0]?.currency_type ?? 'EUR'
    };
  });

  // ── KPI aggregates ───────────────────────────────────────────────────────────
  const totalRevenue     = participantRows.reduce((sum, r) => sum + r.paidTotal, 0);
  const totalPending     = participantRows.reduce((sum, r) => sum + r.pendingTotal, 0);
  const platformFees     = totalRevenue * PLATFORM_FEE_PERCENT;
  const organizerRevenue = totalRevenue - platformFees;
  const currency         = allProducts[0]?.currency_type ?? 'EUR';

  // ── Role breakdown (split by approval status) ────────────────────────────────
  const approvedRows = participantRows.filter(r => r.status === 'approved');
  const pendingRows  = participantRows.filter(r => r.status !== 'approved');
  const roleStats = {
    approved: {
      leaders:   approvedRows.filter(r => r.role === 'leader').length,
      followers: approvedRows.filter(r => r.role === 'follower').length,
    },
    pending: {
      leaders:   pendingRows.filter(r => r.role === 'leader').length,
      followers: pendingRows.filter(r => r.role === 'follower').length,
    }
  };

  // ── WSDC level distribution (split by role) ───────────────────────────────────
  const LEVEL_ORDER = ['Newcomer', 'Novice', 'Intermediate', 'Advanced', 'All-Star', 'Champion'];
  const wsdcData: Record<string, { leaders: number; followers: number }> = {};
  participantRows.forEach(r => {
    if (r.wsdcLevel) {
      if (!wsdcData[r.wsdcLevel]) wsdcData[r.wsdcLevel] = { leaders: 0, followers: 0 };
      if (r.role === 'leader') wsdcData[r.wsdcLevel].leaders++;
      else if (r.role === 'follower') wsdcData[r.wsdcLevel].followers++;
    }
  });
  const wsdcLevels = [
    ...LEVEL_ORDER.filter(l => wsdcData[l]).map(l => ({
      level: l,
      leaderCount: wsdcData[l].leaders,
      followerCount: wsdcData[l].followers,
      total: wsdcData[l].leaders + wsdcData[l].followers
    })),
    ...Object.keys(wsdcData).filter(l => !LEVEL_ORDER.includes(l)).map(l => ({
      level: l,
      leaderCount: wsdcData[l].leaders,
      followerCount: wsdcData[l].followers,
      total: wsdcData[l].leaders + wsdcData[l].followers
    }))
  ];

  // ── Country distribution ─────────────────────────────────────────────────────
  const countryCounts: Record<string, number> = {};
  participantRows.forEach(r => {
    const c = r.country || 'Unknown';
    countryCounts[c] = (countryCounts[c] ?? 0) + 1;
  });
  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([country, count]) => ({ country, count }));

  // ── Registration timeline (cumulative by day) ────────────────────────────────
  const regDayMap: Record<string, number> = {};
  participantRows.forEach(r => {
    if (r.created_at) {
      const day = r.created_at.substring(0, 10);
      regDayMap[day] = (regDayMap[day] ?? 0) + 1;
    }
  });
  let cumReg = 0;
  const registrationTimeline = Object.keys(regDayMap).sort().map(day => {
    cumReg += regDayMap[day];
    return { day, count: regDayMap[day], total: cumReg };
  });

  // ── Revenue timeline (by day) ────────────────────────────────────────────────
  const revDayMap: Record<string, number> = {};
  invoices.forEach(inv => {
    if (inv.created_at) {
      const day = inv.created_at.substring(0, 10);
      revDayMap[day] = (revDayMap[day] ?? 0) + parseFloat(inv.total_incl_mva ?? '0');
    }
  });
  const revenueTimeline = Object.keys(revDayMap).sort().map(day => ({ day, amount: revDayMap[day] }));

  // ── Payment conversion & overdue ─────────────────────────────────────────────
  const approvedParticipants = participantRows.filter(r => r.status === 'approved');
  const paidParticipants     = approvedParticipants.filter(r => r.paidTotal > 0);
  const overduePending = approvedParticipants
    .filter(r => r.paidTotal === 0 && r.pendingTotal > 0)
    .map(r => ({
      ...r,
      daysSince: r.created_at
        ? Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86_400_000)
        : 0
    }))
    .sort((a, b) => b.daysSince - a.daysSince);

  // ── Accommodation stats ──────────────────────────────────────────────────────
  const allBookings    = hotelBookings ?? [];
  const depositOnly    = allBookings.filter(b => b.deposit_paid && !b.remaining_paid);
  const fullyPaidRooms = allBookings.filter(b => b.deposit_paid && b.remaining_paid);
  const unpaidBookings = allBookings.filter(b => !b.deposit_paid);

  // ── Recent activity feed ─────────────────────────────────────────────────────
  const regEvents = participantRows.map(r => ({
    type: 'registration' as const,
    username: r.username,
    detail: r.role ? `Registered as ${r.role}` : 'Registered',
    date: r.created_at ?? ''
  }));
  const payEvents = invoices.map(inv => {
    const p = participantRows.find(r => r.participant_id === inv.participant_id);
    return {
      type: 'payment' as const,
      username: p?.username ?? 'Unknown',
      detail: `Paid ${parseFloat(inv.total_incl_mva ?? '0').toFixed(2)} ${inv.currency}`,
      date: inv.created_at ?? ''
    };
  });
  const recentActivity = [...regEvents, ...payEvents]
    .filter(e => e.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 15);

  return {
    event,
    participantRows,
    stats: {
      totalRevenue,
      totalPending,
      platformFees,
      organizerRevenue,
      currency,
      paidCount:         participantRows.filter(r => r.paidTotal > 0).length,
      pendingCount:      participantRows.filter(r => r.pendingTotal > 0).length,
      totalParticipants: participantRows.length
    },
    roleStats,
    wsdcLevels,
    topCountries,
    registrationTimeline,
    revenueTimeline,
    paymentConversion:    { approved: approvedParticipants.length, paid: paidParticipants.length },
    overduePending,
    accommodation:        { bookings: allBookings, depositOnly, fullyPaidRooms, unpaidBookings },
    eventProducts:        eventProducts ?? [],
    recentActivity
  };
};
