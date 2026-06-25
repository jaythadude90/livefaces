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

const memoryStore = new Map<string, LiveFacesUserSubscription>();

export const userStore = {
  async upsertSubscription(data: LiveFacesUserSubscription) {
    memoryStore.set(data.userId, data);
    console.log('[userStore] upsertSubscription', data);
    return data;
  },

  async getSubscription(userId: string) {
    return memoryStore.get(userId) ?? {
      userId,
      subscriptionStatus: 'free',
      plan: 'free',
      updatedAt: new Date().toISOString()
    };
  }
};

/*
Replace the memory store with your real DB once wired up.
Example fields to persist:
subscriptionStatus, stripeCustomerId, stripeSubscriptionId, plan, currentPeriodEnd.
*/
