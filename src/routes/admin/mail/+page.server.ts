import { supabase } from '$lib/server/supabaseServiceClient';
import { sendMassEmail } from '$lib/server/email';
import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ cookies }) => {
  const sbUser = cookies.get('sb_user');
  if (!sbUser) throw redirect(303, '/signin');

  const user = JSON.parse(sbUser);
  if (!user.userRole?.includes('Owner')) throw redirect(303, '/');

  // Fetch all events for the selector
  const { data: events } = await supabase
    .from('events')
    .select('id, title, start_date')
    .order('start_date', { ascending: false });

  return { events: events ?? [] };
};

export const actions = {
  // Load recipients for selected event — called on event select
getRecipients: async ({ request, cookies }) => {
  const sbUser = cookies.get('sb_user');
  if (!sbUser) return fail(401, { message: 'Not authenticated' });
  const user = JSON.parse(sbUser);
  if (!user.userRole?.includes('Owner')) return fail(403, { message: 'Access denied' });

  const form = await request.formData();
  const eventId = form.get('event_id')?.toString();
  if (!eventId) return fail(400, { message: 'Select an event' });

  // Step 1 — get participant user_ids
  const { data: participants, error } = await supabase
    .from('event_participants')
    .select('user_id')
    .eq('event_id', eventId)
    .neq('event_role', 'Event Director');

  if (error) return fail(500, { message: error.message });
  if (!participants || participants.length === 0) {
    return { recipients: [], eventId };
  }

  const userIds = participants.map(p => p.user_id);

  // Step 2 — fetch profiles for usernames
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', userIds);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.username]));

  // Step 3 — fetch emails from auth admin API in parallel batches
  const recipients: { email: string; username: string }[] = [];

  for (const uid of userIds) {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(uid);
      if (authUser?.user?.email) {
        recipients.push({
          email: authUser.user.email,
          username: profileMap.get(uid) || authUser.user.email
        });
      }
    } catch (e) {
      console.warn(`[mass email] failed to fetch auth user ${uid}:`, e);
    }
  }

  return { recipients, eventId };
},

  // Actually send the mass email
  send: async ({ request, cookies }) => {
    const sbUser = cookies.get('sb_user');
    if (!sbUser) return fail(401, { message: 'Not authenticated' });
    const user = JSON.parse(sbUser);
    if (!user.userRole?.includes('Owner')) return fail(403, { message: 'Access denied' });

    const form = await request.formData();
    const subject = form.get('subject')?.toString();
    const body = form.get('body')?.toString();
    const recipientsRaw = form.get('recipients')?.toString();

    if (!subject || !body || !recipientsRaw) {
      return fail(400, { message: 'Missing required fields' });
    }

    let recipients: { email: string; username: string }[];
    try {
      recipients = JSON.parse(recipientsRaw);
    } catch {
      return fail(400, { message: 'Invalid recipients data' });
    }

    if (recipients.length === 0) {
      return fail(400, { message: 'No recipients' });
    }

    const html = buildEmailHtml(body);

    const results = await sendMassEmail({ recipients, subject, html });

    return {
      success: true,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors
    };
  }
};

function buildEmailHtml(body: string): string {
  // Convert newlines to <br> for basic formatting
  const formattedBody = body
    .split('\n\n')
    .map(para => `<p style="color:#374151;line-height:1.6;margin:0 0 16px;">${para.replace(/\n/g, '<br>')}</p>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#d97706,#b45309);padding:32px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;">DancePoint</h1>
      </div>
      <div style="padding:32px;">
        <p style="color:#6b7280;margin:0 0 24px;">Hi {{username}},</p>
        ${formattedBody}
      </div>
      <div style="padding:24px 32px;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">
          © DancePoint · <a href="https://dancepoint.no" style="color:#9ca3af;">dancepoint.no</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}