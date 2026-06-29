import { router } from '../_core/trpc';
import { stripeRouter } from './stripe';

export const appRouter = router({
  stripe: stripeRouter,
});

export type AppRouter = typeof appRouter;
