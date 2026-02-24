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

export async function sendRegistrationApprovedEmail({
  to,
  username,
  eventTitle,
  eventStartDate,
  participantId
}: {
  to: string;
  username: string;
  eventTitle: string;
  eventStartDate: string;
  participantId: string;
}) {
  const formattedDate = new Date(eventStartDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const manageUrl = `https://dancepoint.no/profile/${participantId}`;

  await sendEmail({
    to,
    subject: `You're approved for ${eventTitle} 🎉`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#d97706,#b45309);padding:32px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;">DancePoint</h1>
      </div>

      <!-- Body -->
      <div style="padding:32px;">
        <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">
          You're approved! 🎉
        </h2>
        <p style="color:#6b7280;margin:0 0 24px;">Hi ${username},</p>
        <p style="color:#374151;line-height:1.6;margin:0 0 24px;">
          Great news — your registration for <strong>${eventTitle}</strong> has been approved.
          The event starts on <strong>${formattedDate}</strong>.
        </p>
      <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
        To secure your spot, please complete your payment within <strong>14 days</strong> of receiving this email.
      </p>

      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:0 0 32px;">
        <p style="margin:0;color:#92400e;font-size:14px;line-height:1.5;">
          ⚠️ <strong>Please note:</strong> Unpaid registrations may be cancelled at the event director's discretion after the payment deadline has passed.
        </p>
      </div>

      <a href="${manageUrl}"
           style="display:inline-block;padding:14px 28px;background:#d97706;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">
          Complete Payment →
        </a>
      </div>

      <!-- Footer -->
      <div style="padding:24px 32px;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">
          © DancePoint · dancepoint.no
        </p>
      </div>

    </div>
  </div>
</body>
</html>
    `
  });
}

export async function sendPaymentConfirmedEmail({
  to,
  username,
  eventTitle,
  eventStartDate,
  amount,
  currency,
  participantId
}: {
  to: string;
  username: string;
  eventTitle: string;
  eventStartDate: string;
  amount: number;
  currency: string;
  participantId: string;
}) {
  const formattedDate = new Date(eventStartDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const manageUrl = `https://dancepoint.no/profile/${participantId}`;
  const formattedAmount = amount.toFixed(2);

  await sendEmail({
    to,
    subject: `Payment confirmed for ${eventTitle} ✅`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#d97706,#b45309);padding:32px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;">DancePoint</h1>
      </div>

      <!-- Body -->
      <div style="padding:32px;">
        <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">
          Payment confirmed ✅
        </h2>
        <p style="color:#6b7280;margin:0 0 24px;">Hi ${username},</p>
        <p style="color:#374151;line-height:1.6;margin:0 0 24px;">
          Your payment for <strong>${eventTitle}</strong> has been received. 
          You're all set for <strong>${formattedDate}</strong>!
        </p>

        <!-- Receipt box -->
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:0 0 32px;">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Receipt</p>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:#374151;">${eventTitle}</span>
            <span style="color:#111827;font-weight:700;">${formattedAmount} ${currency.toUpperCase()}</span>
          </div>
        </div>

        <a href="${manageUrl}"
           style="display:inline-block;padding:14px 28px;background:#d97706;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">
          View Registration →
        </a>
      </div>

      <!-- Footer -->
      <div style="padding:24px 32px;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">
          © DancePoint · dancepoint.no
        </p>
      </div>

    </div>
  </div>
</body>
</html>
    `
  });
}