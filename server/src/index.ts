import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { stripeEventsRouter } from './routes/stripeEvents.js';
import { checkoutRouter } from './routes/checkout.js';
import { subscriptionRouter } from './routes/subscription.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Stripe event route must be registered before JSON body parsing.
app.use('/api/webhooks', stripeEventsRouter);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'LiveFaces Stripe Server' });
});

app.use('/api/stripe', checkoutRouter);
app.use('/api', subscriptionRouter);

app.get('/success', (_req, res) => res.send('LiveFaces checkout success. You can close this window.'));
app.get('/cancel', (_req, res) => res.send('LiveFaces checkout canceled.'));

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`LiveFaces Stripe server running on http://localhost:${env.PORT}`);
});
