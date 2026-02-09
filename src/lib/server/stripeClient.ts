import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';

// export const stripe = require("stripe")(STRIPE_SECRET_KEY);
export const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-01-28.clover'});