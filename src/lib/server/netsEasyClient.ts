import { NETS_SECRET_KEY, NETS_TEST_MODE } from '$env/static/private';

const BASE_URL =
  NETS_TEST_MODE === 'true'
    ? 'https://test.api.dibspayment.eu/v1'
    : 'https://api.dibspayment.eu/v1';

export async function createNetsPayment(payload: unknown): Promise<{
  paymentId: string;
  hostedPaymentPageUrl: string;
}> {
  const res = await fetch(`${BASE_URL}/payments`, {
    method: 'POST',
    headers: {
      Authorization: NETS_SECRET_KEY,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NETS Easy error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function fetchNetsPayment(paymentId: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/payments/${paymentId}`, {
    headers: { Authorization: NETS_SECRET_KEY }
  });

  if (!res.ok) throw new Error(`NETS Easy fetch failed: ${res.status}`);
  return res.json();
}
