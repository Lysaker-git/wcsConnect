import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const stripe = new Stripe(STRIPE_SECRET_KEY);

export const load: PageServerLoad = async ({ cookies }) => {
  // Get user from cookies
  const sbUser = cookies.get('sb_user');
  if (!sbUser) throw redirect(303, '/login');

  let user: any = null;
  try {
    user = JSON.parse(sbUser);
  } catch (e) {
    throw redirect(303, '/login');
  }

  const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single();

  if (profile?.stripe_account_id) {
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    const complete = account.details_submitted;

    await supabase
      .from('profiles')
      .update({ stripe_onboarding_complete: complete })
      .eq('id', user.id);
  }

  throw redirect(303, '/dashboard?stripe=connected');
};