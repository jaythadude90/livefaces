import { Router, raw, Request, Response } from 'express';
import Stripe from 'stripe';
import { userStore } from '../db/userStore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export const stripeEventsRouter = Router();

// Raw middleware for Stripe signature verification (must use raw body)
stripeEventsRouter.post(
  '/stripe',
  raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      // Verify the webhook signature
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`Processing Stripe event: ${event.type}`);

    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'charge.succeeded':
          console.log(`Payment succeeded: ${(event.data.object as Stripe.Charge).id}`);
          break;

        case 'charge.failed':
          console.log(`Payment failed: ${(event.data.object as Stripe.Charge).id}`);
          break;

        case 'invoice.payment_succeeded':
          console.log(`Invoice payment succeeded: ${(event.data.object as Stripe.Invoice).id}`);
          break;

        case 'invoice.payment_failed':
          console.log(`Invoice payment failed: ${(event.data.object as Stripe.Invoice).id}`);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // Acknowledge receipt of the event
      res.json({ received: true });
    } catch (error: any) {
      console.error('Error processing webhook event:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;

  console.log(`Subscription created: ${subscriptionId} for customer ${customerId}`);

  // Find user by Stripe customer ID and update subscription status
  try {
    // Assuming you have a method to find user by stripeCustomerId
    // and update their subscription status in the database
    await userStore.updateSubscription(customerId, {
      stripeSubscriptionId: subscriptionId,
      status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });
  } catch (error: any) {
    console.error('Failed to update subscription on creation:', error.message);
  }
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;

  console.log(`Subscription updated: ${subscriptionId} - Status: ${status}`);

  try {
    await userStore.updateSubscription(customerId, {
      stripeSubscriptionId: subscriptionId,
      status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });
  } catch (error: any) {
    console.error('Failed to update subscription:', error.message);
  }
}

/**
 * Handle subscription cancellation/deletion
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;

  console.log(`Subscription deleted/cancelled: ${subscriptionId}`);

  try {
    await userStore.updateSubscription(customerId, {
      stripeSubscriptionId: subscriptionId,
      status: 'canceled',
      currentPeriodEnd: new Date(),
    });
  } catch (error: any) {
    console.error('Failed to cancel subscription:', error.message);
  }
}
