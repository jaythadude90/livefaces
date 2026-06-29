import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { userStore } from './db/userStore.js';

export type TrpcContext = {
  userId?: string;
};

export async function createTrpcContext(): Promise<TrpcContext> {
  return {};
}

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  health: publicProcedure.query(() => {
    return {
      ok: true,
      app: 'LiveFaces',
      service: 'trpc'
    };
  }),

  subscription: publicProcedure
    .input(
      z.object({
        userId: z.string().min(1)
      })
    )
    .query(async ({ input }) => {
      const subscription = await userStore.getSubscription(input.userId);
      const isSubscribed = ['active', 'trialing'].includes(subscription.subscriptionStatus);

      return {
        subscription,
        isSubscribed
      };
    })
});

export type AppRouter = typeof appRouter;
