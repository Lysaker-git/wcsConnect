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
    <p style="color:#9ca3af;font-size:12px;margin:16px 0 0;">
      You may be asked to sign in before being redirected to your registration.
    </p>

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


// ---------------------------------------------------------------
// Norwegian-compliant receipt (kvittering / faktura)
// Required by bokføringsloven and merverdiavgiftsloven
// ---------------------------------------------------------------

const PLATFORM_NAME  = 'DancePoint AS';
const PLATFORM_URL   = 'dancepoint.no';

type ReceiptProduct = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  mvaRate: number;
  mvaAmount: number;
};

type ReceiptSeller = {
  name: string;
  orgNumber?: string | null;
  address?: string | null;
  email?: string | null;
};

export async function sendReceiptEmail({
  to,
  invoiceNumber,
  buyerName,
  eventTitle,
  seller,
  products,
  totalExclMva,
  totalMva,
  totalInclMva,
  currency,
  stripeRef,
  participantId
}: {
  to: string;
  invoiceNumber: string;
  buyerName: string;
  eventTitle: string;
  seller: ReceiptSeller;
  products: ReceiptProduct[];
  totalExclMva: number;
  totalMva: number;
  totalInclMva: number;
  currency: string;
  stripeRef: string;
  participantId: string;
}) {
  const cur = currency.toUpperCase();
  const fmt = (n: number) => n.toFixed(2);
  const invoiceDate = new Date().toLocaleDateString('nb-NO', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });

  // Build seller block — only include lines that are filled in
  const sellerBlock = [
    `<strong>${seller.name}</strong>`,
    seller.orgNumber ? `Org.nr: ${seller.orgNumber}` : null,
    seller.address,
    seller.email
  ].filter(Boolean).join('<br>');

  const lineItemsHtml = products.map(p => `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 8px 10px 0;color:#374151;font-size:13px;">${p.name}</td>
      <td style="padding:10px 4px;text-align:center;color:#374151;font-size:13px;">${p.quantity}</td>
      <td style="padding:10px 4px;text-align:right;color:#374151;font-size:13px;">${fmt(p.unitPrice)}</td>
      <td style="padding:10px 4px;text-align:right;color:#374151;font-size:13px;">${p.mvaRate}%</td>
      <td style="padding:10px 4px;text-align:right;color:#374151;font-size:13px;">${fmt(p.mvaAmount)}</td>
      <td style="padding:10px 0 10px 4px;text-align:right;color:#111827;font-weight:600;font-size:13px;">${fmt(p.subtotal)}</td>
    </tr>`).join('');

  await sendEmail({
    to,
    subject: `Kvittering – ${eventTitle} (${invoiceNumber})`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#d97706,#b45309);padding:28px 32px;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">${PLATFORM_NAME}</h1>
        <p style="margin:4px 0 0;color:#fef3c7;font-size:13px;">${PLATFORM_URL}</p>
      </div>

      <!-- Invoice meta + seller info -->
      <div style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="vertical-align:top;padding-right:16px;">
              <h2 style="margin:0 0 10px;color:#111827;font-size:20px;font-weight:700;">Kvittering</h2>
              <table style="border-collapse:collapse;font-size:13px;">
                <tr>
                  <td style="padding:2px 12px 2px 0;color:#6b7280;">Fakturanr:</td>
                  <td style="color:#111827;font-weight:700;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding:2px 12px 2px 0;color:#6b7280;">Fakturadato:</td>
                  <td style="color:#374151;">${invoiceDate}</td>
                </tr>
              </table>
            </td>
            <td style="vertical-align:top;text-align:right;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Selger</p>
              <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">${sellerBlock}</p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Buyer info -->
      <div style="padding:16px 32px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Kjøper</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.5;">
          ${buyerName}<br>
          <span style="font-size:13px;color:#6b7280;">${to}</span>
        </p>
      </div>

      <!-- Event banner -->
      <div style="padding:12px 32px;background:#fffbeb;border-bottom:1px solid #fde68a;">
        <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">${eventTitle}</p>
      </div>

      <!-- Line items -->
      <div style="padding:24px 32px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid #e5e7eb;">
              <th style="text-align:left;padding-bottom:8px;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Beskrivelse</th>
              <th style="text-align:center;padding-bottom:8px;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Ant.</th>
              <th style="text-align:right;padding-bottom:8px;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Enhetspris</th>
              <th style="text-align:right;padding-bottom:8px;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">MVA%</th>
              <th style="text-align:right;padding-bottom:8px;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">MVA</th>
              <th style="text-align:right;padding-bottom:8px;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Beløp</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div style="padding:16px 32px 0;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;max-width:320px;margin-left:auto;">
          <tr>
            <td style="padding:5px 0;color:#6b7280;">Subtotal eks. MVA</td>
            <td style="padding:5px 0;text-align:right;color:#374151;">${fmt(totalExclMva)} ${cur}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#6b7280;">MVA</td>
            <td style="padding:5px 0;text-align:right;color:#374151;">${fmt(totalMva)} ${cur}</td>
          </tr>
          <tr style="border-top:2px solid #111827;">
            <td style="padding:12px 0 6px;color:#111827;font-size:15px;font-weight:700;">Totalt inkl. MVA</td>
            <td style="padding:12px 0 6px;text-align:right;color:#111827;font-size:15px;font-weight:700;">${fmt(totalInclMva)} ${cur}</td>
          </tr>
        </table>
      </div>

      <!-- Payment info -->
      <div style="padding:16px 32px 24px;">
        <div style="padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">Betalingsinformasjon</p>
          <p style="margin:0;color:#374151;">Betalingsmåte: Kortbetaling (Stripe)</p>
          <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;word-break:break-all;">Ref: ${stripeRef}</p>
        </div>
      </div>

      <!-- CTA -->
      <div style="padding:0 32px 28px;text-align:center;">
        <a href="https://dancepoint.no/profile/${participantId}"
           style="display:inline-block;padding:12px 24px;background:#d97706;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
          Se din registrering →
        </a>
      </div>

      <!-- Footer -->
      <div style="padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">Takk for betalingen!</p>
        <p style="margin:6px 0 0;font-size:11px;color:#d1d5db;">Betaling formidlet av ${PLATFORM_NAME} · ${PLATFORM_URL}</p>
      </div>

    </div>
  </div>
</body>
</html>`
  });
}


export async function sendMassEmail({
  recipients,
  subject,
  html
}: {
  recipients: { email: string; username: string }[];
  subject: string;
  html: string;
}) {
  const CHUNK_SIZE = 100;
  const results = { sent: 0, failed: 0, errors: [] as string[] };

  // Split into chunks of 100
  for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + CHUNK_SIZE);

    // Resend batch API
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(
        chunk.map(r => ({
          from: FROM,
          to: r.email,
          subject,
          html: html.replaceAll('{{username}}', r.username)
        }))
      )
    });

    if (!res.ok) {
      const error = await res.text();
      console.error(`[mass email] Resend batch error (chunk ${i}):`, error);
      results.failed += chunk.length;
      results.errors.push(`Chunk ${i}–${i + chunk.length}: ${error}`);
    } else {
      results.sent += chunk.length;
    }

    // Small delay between chunks to be kind to the API
    if (i + CHUNK_SIZE < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}