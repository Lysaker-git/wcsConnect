import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const stripe = new Stripe(STRIPE_SECRET_KEY);

export const GET: RequestHandler = async ({ url, cookies }) => {
  // 1. Get user from cookies (same pattern as your profiles page)
  const sbUser = cookies.get('sb_user');
  if (!sbUser) throw redirect(303, '/login');

  let user: any = null;
  try {
    user = JSON.parse(sbUser);
  } catch (e) {
    throw redirect(303, '/login');
  }

  // 2. Get their profile from Supabase
  const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await supabase
    .from('profiles')
    .select('userRole, stripe_account_id')
    .eq('id', user.id)
    .single();

  // 3. Check they're a Super User
  const roles: string[] = profile?.userRole ?? [];
  if (!roles.includes('Super User')) {
    return json({ error: 'Unauthorized' }, { status: 403 });
  }

  // 4. Create or reuse their Stripe Connect account
  let accountId = profile?.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({ type: 'express' });
    accountId = account.id;

    await supabase
      .from('profiles')
      .update({ stripe_account_id: accountId })
      .eq('id', user.id);
  }

  // 5. Create the onboarding link
  const origin = url.origin;
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/admin/stripe/refresh`,
    return_url: `${origin}/admin/stripe/return`,
    type: 'account_onboarding'
  });

  // 6. Redirect to Stripe's hosted onboarding
  throw redirect(303, accountLink.url);
};