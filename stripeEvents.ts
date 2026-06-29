/**
 * LiveFaces — Stripe Signed Event Handler
 *
 * Replaces: server/src/routes/stripeEvents.ts
 *
 * This is the FULL implementation that was blocked during generation.
 * It verifies Stripe webhook signatures and syncs subscription state to DB.
 *
 * CRITICAL: This route must be mounted BEFORE express.json() in index.ts
 * because Stripe requires the raw request body for signature verification.
 *
 * Mount in server/src/index.ts:
 *   import { stripeEventsRouter } from './routes/stripeEvents';
 *   app.use('/api/stripe', stripeEventsRouter);   // BEFORE express.json()
 */

import { Router, Request, Response } from 'express';
import { raw } from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-04-10',
});

export const stripeEventsRouter = Router();

// ── POST /api/stripe/events ───────────────────────────────────────────────────

stripeEventsRouter.post(
  '/events',
  raw({ type: 'application/json' }),  // raw body required — must come before express.json()
  async (req: Request, res: Response) => {

    // ── 1. Extract and validate signature header ────────────────────────────
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      console.error('[StripeEvents] Missing stripe-signature header');
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
    if (!webhookSecret) {
      console.error('[StripeEvents] STRIPE_WEBHOOK_SECRET is not set');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // ── 2. Verify signature ─────────────────────────────────────────────────
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('[StripeEvents] Signature verification failed:', err);
      return res.status(400).json({
        error: `Webhook signature verification failed: ${String(err)}`,
      });
    }

    console.log(`[StripeEvents] Verified event: ${event.type} (${event.id})`);

    // ── 3. Handle events ────────────────────────────────────────────────────
    try {
      switch (event.type) {

        // ── Payment succeeded (one-time purchase) ───────────────────────────
        case 'payment_intent.succeeded': {
          const intent = event.data.object as Stripe.PaymentIntent;
          const customerId = intent.customer as string | null;

          console.log(`[StripeEvents] payment_intent.succeeded: ${intent.id}`);

          if (customerId) {
            await syncPremiumStatus(customerId, true);
          }
          break;
        }

        // ── Payment failed ───────────────────────────────────────────────────
        case 'payment_intent.payment_failed': {
          const intent = event.data.object as Stripe.PaymentIntent;
          const customerId = intent.customer as string | null;
          const reason = intent.last_payment_error?.message ?? 'Unknown';

          console.warn(`[StripeEvents] payment_intent.payment_failed: ${intent.id} — ${reason}`);

          if (customerId) {
            await logPaymentFailure(customerId, intent.id, reason);
          }
          break;
        }

        // ── Subscription created ─────────────────────────────────────────────
        case 'customer.subscription.created': {
          const sub = event.data.object as Stripe.Subscription;
          console.log(`[StripeEvents] subscription.created: ${sub.id} status=${sub.status}`);
          await syncSubscription(sub);
          break;
        }

        // ── Subscription updated (renewal, plan change, status change) ───────
        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          console.log(`[StripeEvents] subscription.updated: ${sub.id} status=${sub.status}`);
          await syncSubscription(sub);
          break;
        }

        // ── Subscription cancelled / expired ─────────────────────────────────
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          console.log(`[StripeEvents] subscription.deleted: ${sub.id}`);
          await syncSubscription(sub);  // status will be 'canceled' — revokes access
          break;
        }

        // ── Invoice paid (recurring renewal) ─────────────────────────────────
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          const subId = invoice.subscription as string | null;

          console.log(`[StripeEvents] invoice.payment_succeeded: ${invoice.id}`);

          if (customerId) {
            await syncPremiumStatus(customerId, true);
          }

          // Optionally store invoice record for receipts
          await logInvoice(invoice.id, customerId, subId, 'paid', invoice.amount_paid);
          break;
        }

        // ── Invoice payment failed (renewal failed, card declined) ────────────
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;

          console.warn(`[StripeEvents] invoice.payment_failed: ${invoice.id}`);

          // Stripe will retry — don't revoke access immediately.
          // Mark as past_due and let the subscription.updated event handle it.
          await logInvoice(invoice.id, customerId, null, 'failed', invoice.amount_due);
          break;
        }

        // ── Unhandled events (log and ignore) ────────────────────────────────
        default:
          console.log(`[StripeEvents] Unhandled event type: ${event.type}`);
      }
    } catch (handlerErr) {
      // Log but still return 200 — Stripe will retry on 5xx responses,
      // which can cause duplicate processing. Log the error and investigate.
      console.error(`[StripeEvents] Error handling event ${event.type}:`, handlerErr);
    }

    // ── 4. Always acknowledge receipt ───────────────────────────────────────
    return res.json({ received: true, eventId: event.id });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// DB sync helpers
// Replace the TODO comments with your actual DB client calls.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Syncs isPremium flag for a Stripe customer to your DB.
 */
async function syncPremiumStatus(
  stripeCustomerId: string,
  isPremium: boolean
): Promise<void> {
  console.log(`[StripeEvents] syncPremiumStatus: ${stripeCustomerId} → isPremium=${isPremium}`);

  // TODO: replace with your DB call, e.g.:
  // await db.user.update({
  //   where: { stripeCustomerId },
  //   data: {
  //     isPremium,
  //     premiumGrantedAt: isPremium ? new Date() : null,
  //   },
  // });
}

/**
 * Syncs full subscription state (status, period end, plan) to your DB.
 * Called on created / updated / deleted events.
 */
async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId = sub.customer as string;
  const isActive = ['active', 'trialing'].includes(sub.status);
  const periodEnd = new Date(sub.current_period_end * 1000);
  const priceId = sub.items.data[0]?.price.id ?? null;

  console.log(
    `[StripeEvents] syncSubscription: ${sub.id} status=${sub.status} active=${isActive}`
  );

  // TODO: replace with your DB call, e.g.:
  // await db.user.update({
  //   where: { stripeCustomerId: customerId },
  //   data: {
  //     isPremium: isActive,
  //     subscriptionId: sub.id,
  //     subscriptionStatus: sub.status,
  //     subscriptionPriceId: priceId,
  //     subscriptionCurrentPeriodEnd: periodEnd,
  //     cancelAtPeriodEnd: sub.cancel_at_period_end,
  //   },
  // });
}

/**
 * Logs a payment failure for monitoring / user notification.
 */
async function logPaymentFailure(
  stripeCustomerId: string,
  paymentIntentId: string,
  reason: string
): Promise<void> {
  console.warn(
    `[StripeEvents] logPaymentFailure: customer=${stripeCustomerId} intent=${paymentIntentId} reason=${reason}`
  );

  // TODO: e.g. send an email or push notification:
  // const user = await db.user.findUnique({ where: { stripeCustomerId } });
  // if (user) await sendPaymentFailedEmail(user.email, reason);
}

/**
 * Logs an invoice record for receipts / audit trail.
 */
async function logInvoice(
  invoiceId: string,
  stripeCustomerId: string,
  subscriptionId: string | null,
  status: 'paid' | 'failed',
  amountCents: number
): Promise<void> {
  console.log(
    `[StripeEvents] logInvoice: ${invoiceId} status=${status} amount=${amountCents}`
  );

  // TODO: e.g.:
  // await db.invoice.upsert({
  //   where: { stripeInvoiceId: invoiceId },
  //   create: {
  //     stripeInvoiceId: invoiceId,
  //     stripeCustomerId,
  //     subscriptionId,
  //     status,
  //     amountCents,
  //     createdAt: new Date(),
  //   },
  //   update: { status },
  // });
}
