import { Router } from 'express';
import { userStore } from '../db/userStore.js';

export const subscriptionRouter = Router();

subscriptionRouter.get('/subscription/:userId', async (req, res, next) => {
  try {
    const subscription = await userStore.getSubscription(req.params.userId);
    const isSubscribed = ['active', 'trialing'].includes(subscription.subscriptionStatus);

    res.json({ subscription, isSubscribed });
  } catch (error) {
    next(error);
  }
});
