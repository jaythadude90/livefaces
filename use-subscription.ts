/**
 * LiveFaces — Subscription Management
 *
 * useSubscription hook + SubscriptionScreen component.
 * Handles: subscribe, cancel, status display.
 *
 * Place at:
 *   hooks/use-subscription.ts   (the hook)
 *   screens/SubscriptionScreen.tsx  (the UI)
 */

// ─────────────────────────────────────────────────────────────────────────────
// hooks/use-subscription.ts
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { useConfirmPayment } from '@stripe/stripe-react-native';
import { api } from '@/lib/trpc'; // adjust to your tRPC client

export type SubscriptionStatus =
  | 'idle'
  | 'loading'
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'error';

interface UseSubscriptionOptions {
  userId: string;
  userEmail: string;
  /** Existing Stripe customer ID from your DB, if already created */
  existingCustomerId?: string;
  /** Your Stripe price ID (from Dashboard → Products → Price) */
  priceId: string;
  onSubscribed?: (subscriptionId: string) => void;
  onCanceled?: () => void;
  onError?: (error: string) => void;
}

export function useSubscription({
  userId,
  userEmail,
  existingCustomerId,
  priceId,
  onSubscribed,
  onCanceled,
  onError,
}: UseSubscriptionOptions) {
  const [status, setStatus] = useState<SubscriptionStatus>('idle');
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(
    existingCustomerId ?? null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { confirmPayment } = useConfirmPayment();

  const createOrRetrieveCustomer =
    api.stripe.createOrRetrieveCustomer.useMutation();
  const createSubscription = api.stripe.createSubscription.useMutation();
  const cancelSubscription = api.stripe.cancelSubscription.useMutation();

  // ── Subscribe ─────────────────────────────────────────────────────────────

  const subscribe = useCallback(
    async (email: string) => {
      setStatus('loading');
      setErrorMessage(null);

      try {
        // 1. Get or create Stripe customer
        const { customerId: cid } =
          await createOrRetrieveCustomer.mutateAsync({
            email,
            userId,
            existingCustomerId: customerId ?? undefined,
          });
        setCustomerId(cid);

        // 2. Create subscription — returns clientSecret for first payment
        const { subscriptionId: subId, clientSecret } =
          await createSubscription.mutateAsync({
            customerId: cid,
            priceId,
          });

        if (!clientSecret) {
          // Subscription already active (e.g. free trial, or no payment needed)
          setSubscriptionId(subId);
          setStatus('active');
          onSubscribed?.(subId);
          return;
        }

        // 3. Confirm the initial payment
        const { error, paymentIntent } = await confirmPayment(clientSecret, {
          paymentMethodType: 'Card',
          paymentMethodData: { billingDetails: { email } },
        });

        if (error) throw new Error(error.message);
        if (!paymentIntent) throw new Error('Payment could not be confirmed');

        setSubscriptionId(subId);
        setStatus('active');
        onSubscribed?.(subId);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Subscription failed. Please try again.';
        setStatus('error');
        setErrorMessage(msg);
        onError?.(msg);
      }
    },
    [userId, customerId, priceId, createOrRetrieveCustomer, createSubscription, confirmPayment, onSubscribed, onError]
  );

  // ── Cancel ────────────────────────────────────────────────────────────────

  const cancel = useCallback(
    async (immediately = false) => {
      if (!subscriptionId) return;
      setStatus('loading');

      try {
        await cancelSubscription.mutateAsync({ subscriptionId, immediately });
        setStatus('canceled');
        onCanceled?.();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to cancel subscription.';
        setStatus('error');
        setErrorMessage(msg);
        onError?.(msg);
      }
    },
    [subscriptionId, cancelSubscription, onCanceled, onError]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  return {
    status,
    subscriptionId,
    customerId,
    errorMessage,
    isLoading: status === 'loading',
    isActive: status === 'active',
    isCanceled: status === 'canceled',
    subscribe,
    cancel,
    reset,
  };
}
