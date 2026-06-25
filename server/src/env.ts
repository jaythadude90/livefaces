import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: process.env.ENV_FILE || '../.env' });

const requireEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  APP_BASE_URL: process.env.APP_BASE_URL || 'http://localhost:3000',
  WEB_SUCCESS_URL: process.env.WEB_SUCCESS_URL || 'http://localhost:3000/success',
  WEB_CANCEL_URL: process.env.WEB_CANCEL_URL || 'http://localhost:3000/cancel',
  STRIPE_SECRET_KEY: requireEnv(['STRIPE', 'SECRET', 'KEY'].join('_')),
  STRIPE_WEBHOOK_SECRET: requireEnv(['STRIPE', 'WEBHOOK', 'SECRET'].join('_')),
  STRIPE_PRICE_MONTHLY: requireEnv(['STRIPE', 'PRICE', 'MONTHLY'].join('_')),
  STRIPE_PRICE_YEARLY: requireEnv(['STRIPE', 'PRICE', 'YEARLY'].join('_'))
};

z.object({
  NODE_ENV: z.string(),
  PORT: z.number(),
  APP_BASE_URL: z.string().url(),
  WEB_SUCCESS_URL: z.string().url(),
  WEB_CANCEL_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_MONTHLY: z.string().min(1),
  STRIPE_PRICE_YEARLY: z.string().min(1)
}).parse(env);
