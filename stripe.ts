/**
 * LiveFaces — Stripe Webhook Express Endpoint
 *
 * Place at: server/webhooks/stripe.ts
 * Mount in your Express app BEFORE the JSON body parser middleware.
 *
 * CRITICAL: Stripe requires the raw request body to verify signatures.
 * This route must use express.raw(), not express.json().
 *
 * Mount example in server/index.ts:
 *   import { stripeWebhookRouter } from './webhooks/stripe';
 *   app.use('/api/stripe', stripeWebhookRouter);
 *
 * Stripe Dashboard setup:
 *   Developers → Webhooks → Add endpoint
 *   URL: https://your-app.com/api/stripe/webhook
 *   Events: payment_intent.succeeded, payment_intent.payment_failed,
 *           customer.subscription.updated, customer.subscription.deleted
 */

import { Router, raw, Request, Response } from 'express';
import Stripe from 'stripe';

// ── Adjust these imports to match your project structure ──────────────────────
// import { db } from '../_core/db';
// import { sendPaymentFailedEmail } from '../services/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-04-10',
});

export const stripeWebhookRouter = Router();

stripeWebhookRouter.post(
  '/webhook',
  raw({ type: 'application/json' }),   // ← raw body required for signature check
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      console.error('⚠ Missing stripe-signature header');
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    // ── Verify signature ────────────────────────────────────────────────────
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET ?? ''
      );
    } catch (err) {
      console.error('⚠ Webhook signature verification failed:', err);
      return res.status(400).json({ error: `Webhook Error: ${String(err)}` });
    }

    console.log(`📨 Stripe webhook received: ${event.type}`);

    // ── Handle events ───────────────────────────────────────────────────────
    try {
      switch (event.type) {

        // ── One-time payment succeeded ──────────────────────────────────────
        case 'payment_intent.succeeded': {
          const intent = event.data.object as Stripe.PaymentIntent;
          const customerId = intent.customer as string | null;

          console.log('✅ Payment succeeded:', intent.id, 'customer:', customerId);

          if (customerId) {
            // TODO: grant premium access
            // await db.user.update({
            //   where: { stripeCustomerId: customerId },
            //   data: { isPremium: true, premiumGrantedAt: new Date() },
            // });
          }
          break;
        }

        // ── Payment failed ──────────────────────────────────────────────────
        case 'payment_intent.payment_failed': {
          const intent = event.data.object as Stripe.PaymentIntent;
          const customerId = intent.customer as string | null;
          const failureMessage = intent.last_payment_error?.message ?? 'Unknown error';

          console.log('❌ Payment failed:', intent.id, failureMessage);

          if (customerId) {
            // TODO: notify the user
            // const user = await db.user.findUnique({ where: { stripeCustomerId: customerId } });
            // if (user) await sendPaymentFailedEmail(user.email, failureMessage);
          }
          break;
        }

        // ── Subscription updated (status change, plan change, etc.) ─────────
        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          const customerId = sub.customer as string;

          console.log('🔄 Subscription updated:', sub.id, '→', sub.status);

          const isActive = ['active', 'trialing'].includes(sub.status);

          // TODO: sync status to your DB
          // await db.user.update({
          //   where: { stripeCustomerId: customerId },
          //   data: {
          //     subscriptionId: sub.id,
          //     subscriptionStatus: sub.status,
          //     isPremium: isActive,
          //     subscriptionCurrentPeriodEnd: new Date(sub.current_period_end * 1000),
          //   },
          // });
          break;
        }

        // ── Subscription cancelled / expired ────────────────────────────────
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          const customerId = sub.customer as string;

          console.log('🚫 Subscription cancelled:', sub.id);

          // TODO: revoke premium access
          // await db.user.update({
          //   where: { stripeCustomerId: customerId },
          //   data: {
          //     isPremium: false,
          //     subscriptionStatus: 'canceled',
          //     subscriptionId: null,
          //   },
          // });
          break;
        }

        // ── Invoice payment succeeded (recurring billing) ───────────────────
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;

          console.log('💰 Invoice paid:', invoice.id, 'customer:', customerId);

          // TODO: extend subscription period in DB if needed
          // This fires on every successful renewal — usually handled via
          // customer.subscription.updated, but useful for invoice records.
          break;
        }

        // ── Invoice payment failed (renewal failed) ─────────────────────────
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;

          console.log('⚠ Invoice payment failed:', invoice.id);

          // TODO: send dunning email / mark account as past_due
          // Stripe will retry automatically based on your retry settings.
          break;
        }

        default:
          console.log(`ℹ Unhandled event type: ${event.type}`);
      }
    } catch (handlerErr) {
      // Don't return 500 — Stripe will retry. Log and return 200.
      console.error('Error processing webhook event:', handlerErr);
    }

    // Always return 200 quickly so Stripe doesn't retry
    return res.json({ received: true });
  }
);

/*
 * ── Local testing with Stripe CLI ────────────────────────────────────────────
 *
 * 1. Install: https://stripe.com/docs/stripe-cli
 * 2. Login:   stripe login
 * 3. Forward: stripe listen --forward-to localhost:3000/api/stripe/webhook
 * 4. The CLI prints a webhook signing secret — set it as STRIPE_WEBHOOK_SECRET
 *    in your .env for local development (different from the Dashboard secret).
 *
 * Trigger test events:
 *   stripe trigger payment_intent.succeeded
 *   stripe trigger customer.subscription.updated
 * ─────────────────────────────────────────────────────────────────────────────
 */
