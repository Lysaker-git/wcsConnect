import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';
import { supabase } from '$lib/server/supabaseServiceClient';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const stripe = new Stripe(STRIPE_SECRET_KEY);

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(303, '/signin');

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
