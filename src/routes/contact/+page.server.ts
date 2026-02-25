
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { RESEND_API_KEY } from '$env/static/private';

const FROM = 'DancePoint <events@dancepoint.no>';

async function sendEmail({ to, subject, html }: {
  to: string;
  subject: string;
  html: string;
}) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: FROM, to, subject, html })
  });

  if (!res.ok) {
    const error = await res.text();
    console.error('[email] Resend error:', error);
    throw new Error(`Failed to send email: ${error}`);
  }

  return res.json();
}


function escapeHtml(s: string) {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const name = form.get('name')?.toString().trim();
		const email = form.get('email')?.toString().trim();
		const message = form.get('message')?.toString().trim();

		if (!name || !email || !message) {
			return fail(400, { message: 'Please provide name, email and message' });
		}

		const to = 'lysakerwcs@hotmail.com';
		const subject = `Website contact from ${name}`;

		const html = `
			<div>
				<p>New contact form submission</p>
				<p><strong>Name:</strong> ${escapeHtml(name)}<br/>
				<strong>Email:</strong> ${escapeHtml(email)}</p>
				<hr/>
				<div>${escapeHtml(message).replace(/\n/g, '<br/>')}</div>
			</div>
		`;

		try {
			await sendEmail({ to, subject, html });
			return { success: true };
		} catch (err: any) {
			return fail(500, { message: 'Failed to send email', detail: err?.message ?? String(err) });
		}
	}
};

