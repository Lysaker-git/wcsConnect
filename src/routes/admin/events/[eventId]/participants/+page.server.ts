import { supabase } from '$lib/server/supabaseServiceClient';
import { error as svelteError, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { sendRegistrationApprovedEmail } from '$lib/server/email';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const { eventId } = params;

  const sbUser = cookies.get('sb_user');
  if (!sbUser) throw svelteError(401, 'Not authenticated');

  let user: any;
  try { user = JSON.parse(sbUser); } catch { throw svelteError(401, 'Invalid session'); }

  // Verify ED
  const { data: edCheck } = await supabase
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .eq('event_role', 'Event Director')
    .single();

  if (!edCheck) throw svelteError(403, 'Access denied');

  // Fetch event info
  const { data: event } = await supabase
    .from('events')
    .select('id, title')
    .eq('id', eventId)
    .single();

  // Fetch all participants except ED
  const { data: participants, error: participantsError } = await supabase
    .from('event_participants')
    .select(`
      id,
      user_id,
      status,
      event_role,
      created_at,
      profiles ( username, country, role, wsdcLevel, avatar_url )
    `)
    .eq('event_id', eventId)
    .neq('event_role', 'Event Director')
    .order('created_at', { ascending: true });

  if (participantsError) throw svelteError(500, 'Failed to load participants');

  // Fetch all products for these participants
  const participantIds = (participants ?? []).map(p => p.id);
  let participantProducts: any[] = [];

  if (participantIds.length > 0) {
    const { data: products } = await supabase
      .from('participant_products')
      .select('participant_id, product_name, product_type, quantity_ordered, unit_price, subtotal, currency_type, payment_status')
      .in('participant_id', participantIds);

    participantProducts = products ?? [];
  }

  // Attach products to each participant
  const enriched = (participants ?? []).map(p => ({
    ...p,
    products: participantProducts.filter(pp => pp.participant_id === p.id)
  }));

  return { event, participants: enriched };
};

export const actions: Actions = {
  approve: async ({ request, params, cookies }) => {
    const { eventId } = params;

    const sbUser = cookies.get('sb_user');
    if (!sbUser) return fail(401, { message: 'Not authenticated' });

    let user: any;
    try { user = JSON.parse(sbUser); } catch { return fail(401, { message: 'Invalid session' }); }

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

    if (error) return fail(500, { message: 'Failed to approve participant' });

    // Send approval email
    try {
    const { data: participant } = await supabase
        .from('event_participants')
        .select(`
        id,
        user_id,
        profiles ( username ),
        events ( title, start_date )
        `)
        .eq('id', participant_id)
        .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(
        participant?.user_id ?? ''
    );

    if (authUser?.user?.email && participant) {
        await sendRegistrationApprovedEmail({
        to: authUser.user.email,
        username: participant.profiles?.username ?? 'Dancer',
        eventTitle: participant.events?.title ?? 'the event',
        eventStartDate: participant.events?.start_date ?? '',
        participantId: participant_id
        });
    }
    } catch (emailErr) {
    // Don't fail the approval if email fails — just log it
    console.error('Failed to send approval email:', emailErr);
    }

    return { success: true };
  },

  reject: async ({ request, params, cookies }) => {
    const { eventId } = params;
    const sbUser = cookies.get('sb_user');
    if (!sbUser) return fail(401, { message: 'Not authenticated' });

    let user: any;
    try { user = JSON.parse(sbUser); } catch { return fail(401, { message: 'Invalid session' }); }

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
      .update({ status: 'rejected' })
      .eq('id', participant_id)
      .eq('event_id', eventId);

    if (error) return fail(500, { message: 'Failed to reject participant' });

    return { success: true };
  }
};