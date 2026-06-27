import { firestore } from '../services/firebase.js';

export type LiveFacesPlan = 'free' | 'premium_monthly' | 'premium_yearly';

export type LiveFacesUserSubscription = {
  userId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus: 'free' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
  plan: LiveFacesPlan;
  currentPeriodEnd?: number;
  updatedAt: string;
};

const users = firestore.collection('users');
const invoices = firestore.collection('invoices');

export const userStore = {
  async upsertSubscription(data: LiveFacesUserSubscription) {
    await users.doc(data.userId).set(
      {
        subscriptionStatus: data.subscriptionStatus,
        subscriptionPlan: data.plan,
        subscriptionExpiresAt: data.currentPeriodEnd ?? null,
        stripeCustomerId: data.stripeCustomerId ?? null,
        stripeSubscriptionId: data.stripeSubscriptionId ?? null,
        updatedAt: data.updatedAt
      },
      { merge: true }
    );

    if (data.stripeSubscriptionId) {
      await invoices.doc(data.stripeSubscriptionId).set(
        {
          userId: data.userId,
          stripeCustomerId: data.stripeCustomerId ?? null,
          stripeSubscriptionId: data.stripeSubscriptionId,
          status: data.subscriptionStatus,
          plan: data.plan,
          currentPeriodEnd: data.currentPeriodEnd ?? null,
          updatedAt: data.updatedAt
        },
        { merge: true }
      );
    }

    return data;
  },

  async getSubscription(userId: string) {
    const snapshot = await users.doc(userId).get();

    if (!snapshot.exists) {
      return {
        userId,
        subscriptionStatus: 'free' as const,
        plan: 'free' as const,
        updatedAt: new Date().toISOString()
      };
    }

    const data = snapshot.data() ?? {};

    return {
      userId,
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      subscriptionStatus: data.subscriptionStatus ?? 'free',
      plan: data.subscriptionPlan ?? 'free',
      currentPeriodEnd: data.subscriptionExpiresAt ?? undefined,
      updatedAt: data.updatedAt ?? new Date().toISOString()
    } as LiveFacesUserSubscription;
  },

  async findUserByStripeCustomerId(stripeCustomerId: string) {
    const snapshot = await users.where('stripeCustomerId', '==', stripeCustomerId).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  async setPremium(userId: string) {
    return this.upsertSubscription({
      userId,
      subscriptionStatus: 'active',
      plan: 'premium_monthly',
      updatedAt: new Date().toISOString()
    });
  },

  async updateSubscriptionFailure(userId: string) {
    await users.doc(userId).set(
      {
        subscriptionStatus: 'past_due',
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  }
};
