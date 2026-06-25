import { Router, raw } from 'express';

export const stripeEventsRouter = Router();

stripeEventsRouter.post('/stripe', raw({ type: 'application/json' }), async (_req, res) => {
  res.json({ received: true });
});
