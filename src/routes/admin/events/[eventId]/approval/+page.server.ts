import { supabase } from '$lib/server/supabaseServiceClient';
import { error as svelteError, fail } from '@sveltejs/kit';
import { sendRegistrationApprovedEmail } from '$lib/server/email';
import type { PageServerLoad, Actions } from './$types';

// Simple Levenshtein distance for fuzzy name matching
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function sendApprovalEmail(participantId: string) {
  try {
    const { data: participant } = await supabase
      .from('event_participants')
      .select('id, user_id, profiles(username), events(title, start_date)')
      .eq('id', participantId)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(
      participant?.user_id ?? ''
    );

    if (authUser?.user?.email && participant) {
      await sendRegistrationApprovedEmail({
        to: authUser.user.email,
        username: (participant.profiles as any)?.username ?? 'Dancer',
        eventTitle: (participant.events as any)?.title ?? 'the event',
        eventStartDate: (participant.events as any)?.start_date ?? '',
        participantId
      });
    }
  } catch (e) {
    console.error('[approval] email failed for', participantId, e);
  }
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const { eventId } = params;

  const { user } = await locals.safeGetSession();
  if (!user) throw svelteError(401, 'Not authenticated');

  // Verify ED
  const { data: edCheck } = await supabase
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .eq('event_role', 'Event Director')
    .single();

  if (!edCheck) throw svelteError(403, 'Access denied');

  const { data: event } = await supabase
    .from('events')
    .select('id, title')
    .eq('id', eventId)
    .single();

  // Fetch all non-ED participants with full details
  const { data: participants, error } = await supabase
    .from('event_participants')
    .select(`
      id,
      user_id,
      status,
      role,
      event_role,
      wsdcID,
      wsdcLevel,
      country,
      partner_name,
      created_at,
      profiles ( username, avatar_url )
    `)
    .eq('event_id', eventId)
    .neq('event_role', 'Event Director')
    .order('created_at', { ascending: true });

  if (error) throw svelteError(500, 'Failed to load participants');

  // Fetch ticket names for each participant
  const ids = (participants ?? []).map(p => p.id);
  let ticketMap: Record<string, string> = {};

  if (ids.length > 0) {
    const { data: tickets } = await supabase
      .from('participant_products')
      .select('participant_id, product_name')
      .in('participant_id', ids)
      .eq('product_type', 'ticket');

    (tickets ?? []).forEach(t => {
      ticketMap[t.participant_id] = t.product_name;
    });
  }

  const enriched = (participants ?? []).map(p => ({
    ...p,
    ticketName: ticketMap[p.id] ?? null
  }));

  // Separate into queues
  const pendingCouples = enriched.filter(p =>
    p.status === 'pending_couples_registration'
  );
  const pendingSingles = enriched.filter(p =>
    p.status === 'pending_single_registration'
  );
  const approved = enriched.filter(p => p.status === 'approved');

  // Fuzzy match couples into suggested pairs
  const matched = new Set<string>();
  const couplesQueue: any[] = [];

  for (const p of pendingCouples) {
    if (matched.has(p.id)) continue;

    if (!p.partner_name) {
      couplesQueue.push({ type: 'solo', primary: p, match: null, confidence: null });
      matched.add(p.id);
      continue;
    }

    const pNorm = normalizeName(p.partner_name);
    const username = normalizeName((p.profiles as any)?.username ?? '');

    // Find best match — partner listed our name AND we listed their name
    let bestMatch: any = null;
    let bestDist = Infinity;

    for (const other of pendingCouples) {
      if (other.id === p.id || matched.has(other.id)) continue;

      const otherUsername = normalizeName((other.profiles as any)?.username ?? '');
      const otherPartner = normalizeName(other.partner_name ?? '');

      // Check if names cross-reference each other
      const distWeListThem = levenshtein(pNorm, otherUsername);
      const distTheyListUs = levenshtein(otherPartner, username);
      const totalDist = distWeListThem + distTheyListUs;

      if (totalDist < bestDist && distWeListThem <= 4) {
        bestDist = totalDist;
        bestMatch = other;
      }
    }

    if (bestMatch) {
      const confidence = bestDist === 0 ? 'exact' : bestDist <= 4 ? 'fuzzy' : 'weak';
      couplesQueue.push({ type: 'pair', primary: p, match: bestMatch, confidence, totalDist: bestDist });
      matched.add(p.id);
      matched.add(bestMatch.id);
    } else {
      // No match found — show solo with what they entered
      couplesQueue.push({ type: 'solo', primary: p, match: null, confidence: null });
      matched.add(p.id);
    }
  }

  const singleLeaders = pendingSingles.filter(p => p.role === 'leader');
  const singleFollowers = pendingSingles.filter(p => p.role === 'follower');

  return {
    event,
    couplesQueue,
    singleLeaders,
    singleFollowers,
    approved,
    totalPending: pendingCouples.length + pendingSingles.length
  };
};

export const actions: Actions = {

  // Approve a couple — both participants simultaneously
  approveCouple: async ({ request, params, locals }) => {
    const { eventId } = params;
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Not authenticated' });

    const { data: edCheck } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .eq('event_role', 'Event Director')
      .single();

    if (!edCheck) return fail(403, { message: 'Access denied' });

    const form = await request.formData();
    const primary_id = form.get('primary_id')?.toString();
    const match_id = form.get('match_id')?.toString();

    if (!primary_id) return fail(400, { message: 'Missing participant' });

    const ids = [primary_id, match_id].filter(Boolean) as string[];

    // Cross-link partner names if both present
    if (primary_id && match_id) {
      const { data: both } = await supabase
        .from('event_participants')
        .select('id, profiles(username)')
        .in('id', ids);

      const primary = both?.find(p => p.id === primary_id);
      const match = both?.find(p => p.id === match_id);

      if (primary && match) {
        await supabase
          .from('event_participants')
          .update({ partner_name: (match.profiles as any)?.username })
          .eq('id', primary_id);

        await supabase
          .from('event_participants')
          .update({ partner_name: (primary.profiles as any)?.username })
          .eq('id', match_id);
      }
    }

    // Approve both
    const { error } = await supabase
      .from('event_participants')
      .update({ status: 'approved' })
      .in('id', ids)
      .eq('event_id', eventId);

    if (error) return fail(500, { message: 'Failed to approve' });

    // Send emails to both
    await Promise.all(ids.map(id => sendApprovalEmail(id)));

    return { success: true };
  },

  // Approve a single participant solo
  approveSingle: async ({ request, params, locals }) => {
    const { eventId } = params;
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Not authenticated' });

    const { data: edCheck } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .eq('event_role', 'Event Director')
      .single();

    if (!edCheck) return fail(403, { message: 'Access denied' });

    const form = await request.formData();
    const participant_id = form.get('participant_id')?.toString();
    if (!participant_id) return fail(400, { message: 'Missing participant_id' });

    const { error } = await supabase
      .from('event_participants')
      .update({ status: 'approved' })
      .eq('id', participant_id)
      .eq('event_id', eventId);

    if (error) return fail(500, { message: 'Failed to approve' });

    await sendApprovalEmail(participant_id);

    return { success: true };
  },

  // Approve two singles as a matched pair
  approvePair: async ({ request, params, locals }) => {
    const { eventId } = params;
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Not authenticated' });

    const { data: edCheck } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .eq('event_role', 'Event Director')
      .single();

    if (!edCheck) return fail(403, { message: 'Access denied' });

    const form = await request.formData();
    const leader_id = form.get('leader_id')?.toString();
    const follower_id = form.get('follower_id')?.toString();

    if (!leader_id || !follower_id) return fail(400, { message: 'Select both a leader and a follower' });

    const ids = [leader_id, follower_id];

    // Cross-link names
    const { data: both } = await supabase
      .from('event_participants')
      .select('id, profiles(username)')
      .in('id', ids);

    const leader = both?.find(p => p.id === leader_id);
    const follower = both?.find(p => p.id === follower_id);

    if (leader && follower) {
      await supabase
        .from('event_participants')
        .update({ partner_name: (follower.profiles as any)?.username })
        .eq('id', leader_id);

      await supabase
        .from('event_participants')
        .update({ partner_name: (leader.profiles as any)?.username })
        .eq('id', follower_id);
    }

    const { error } = await supabase
      .from('event_participants')
      .update({ status: 'approved' })
      .in('id', ids)
      .eq('event_id', eventId);

    if (error) return fail(500, { message: 'Failed to approve pair' });

    await Promise.all(ids.map(id => sendApprovalEmail(id)));

    return { success: true };
  }
};