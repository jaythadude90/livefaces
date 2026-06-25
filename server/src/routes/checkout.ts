import { Router } from 'express';
import { z } from 'zod';
import { stripe } from '../services/stripeClient.js';
import { env } from '../env.js';

export const checkoutRouter = Router();

const bodySchema = z.object({
  userId: z.string().min(1),
  email: z.string().email().optional(),
  interval: z.enum(['monthly', 'yearly'])
});

checkoutRouter.post('/create-checkout-session', async (req, res, next) => {
  try {
    const body = bodySchema.parse(req.body);
    const price = body.interval === 'monthly' ? env.STRIPE_PRICE_MONTHLY : env.STRIPE_PRICE_YEARLY;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: body.email,
      line_items: [{ price, quantity: 1 }],
      success_url: `${env.WEB_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: env.WEB_CANCEL_URL,
      client_reference_id: body.userId,
      metadata: {
        userId: body.userId,
        product: 'livefaces_premium',
        interval: body.interval
      },
      subscription_data: {
        metadata: {
          userId: body.userId,
          product: 'livefaces_premium',
          interval: body.interval
        }
      }
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    next(error);
  }
});
