import Stripe from 'stripe';
import { env } from '../env.js';

export const stripe = new Stripe(env[['STRIPE', 'SECRET', 'KEY'].join('_') as keyof typeof env] as string, {
  apiVersion: '2025-02-24.acacia'
});
