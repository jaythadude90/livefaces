# Stripe Integration Skill Demo

This document demonstrates the capabilities of the newly added `stripe-integration` skill for Manus. It provides concrete examples and workflows for integrating Stripe payment processing into React Native and Expo mobile apps.

## Overview

The `stripe-integration` skill equips your mobile applications with robust payment processing capabilities. It covers essential workflows, including adding subscription payments, processing one-time purchases, rendering payment forms, and handling webhooks. It is particularly useful for implementing dual payment options, such as offering Stripe alongside Apple In-App Purchases (IAP).

## Automated Project Setup

The skill includes a Python script (`setup_stripe.py`) that automates the initial scaffolding of a project. By running this script against your project directory, it automatically generates foundational files to accelerate your development process.

```bash
python /home/ubuntu/skills/stripe-integration/scripts/setup_stripe.py /path/to/project
```

Running the setup script will generate the following assets:

1.  **Environment Template (`.env.example`)**: A template containing the required environment variables for Stripe test mode, including `STRIPE_SECRET_KEY`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET`.
2.  **Backend Router (`server/routers/stripe.ts`)**: A basic tRPC router template that includes a mock implementation for creating payment intents. This provides a clear structure for where to implement the actual Stripe Node.js SDK logic.
3.  **Payment Hook (`hooks/use-stripe-payment.ts`)**: A React hook that manages the loading and error states during the payment process, providing a clean interface for frontend components to trigger payments.

*Note: The setup script generates scaffold and mock code. You must implement the actual Stripe SDK calls within the generated router.*

## Reusable UI Components

The skill provides pre-built, reusable React Native components located in the `templates/` directory. These components handle the user interface for collecting payment details and initiating transactions.

### Stripe Payment Button

The `StripePaymentButton` (`stripe-payment-button.tsx`) is a customizable button component that handles the payment processing state and provides haptic feedback to the user.

```tsx
import { StripePaymentButton } from '@/components/stripe-payment-button';

// Usage example
<StripePaymentButton
  amount={499} // Amount in cents ($4.99)
  currency="usd"
  description="Premium Subscription"
  onSuccess={(paymentIntentId) => console.log('Success:', paymentIntentId)}
  onError={(error) => console.error('Payment failed:', error)}
/>
```

### Stripe Payment Form Modal

The `StripePaymentForm` (`stripe-payment-form.tsx`) is a comprehensive modal component that collects the user's email, card number, expiry date, and CVC. It handles input formatting, validation, and integrates the `StripePaymentButton`.

```tsx
import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { StripePaymentForm } from '@/components/stripe-payment-form';

export default function UpgradeScreen() {
  const [showPayment, setShowPayment] = useState(false);

  return (
    <>
      <Pressable onPress={() => setShowPayment(true)}>
        <Text>Upgrade to Premium</Text>
      </Pressable>

      <StripePaymentForm
        visible={showPayment}
        amount={999} // $9.99
        title="Upgrade to Premium"
        onClose={() => setShowPayment(false)}
        onPaymentSuccess={(paymentIntentId) => {
          // Handle successful payment (e.g., update user status in DB)
          console.log('Payment Intent:', paymentIntentId);
        }}
      />
    </>
  );
}
```

## Backend Integration Workflow

To process actual payments securely, you must implement the backend logic using the Stripe Node.js SDK. The skill's reference documentation (`references/backend-integration.md`) outlines the required structure.

First, install the Stripe SDK in your backend environment:

```bash
npm install stripe
```

Next, implement the payment intent creation logic in your tRPC router. This securely creates a payment intent on the server and returns the `clientSecret` to the frontend.

```typescript
import Stripe from 'stripe';
import { publicProcedure, router } from '../_core/trpc';
import { z } from 'zod';

// Initialize Stripe with your secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
});

export const stripeRouter = router({
  createPaymentIntent: publicProcedure
    .input(z.object({
      amount: z.number().min(1),
      currency: z.string().default('usd'),
    }))
    .mutation(async ({ input }) => {
      // Create a PaymentIntent with the order amount and currency
      const intent = await stripe.paymentIntents.create({
        amount: input.amount,
        currency: input.currency,
      });
      
      // Return the client secret to the frontend
      return { clientSecret: intent.client_secret };
    }),
});
```

## Security Best Practices

The skill emphasizes crucial security practices to ensure safe payment processing:

| Variable | Location | Exposure Risk |
| :--- | :--- | :--- |
| `STRIPE_SECRET_KEY` | Backend `.env` only | ❌ **Never expose.** Keep strictly on the server. |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Frontend `.env` | ✅ Safe to expose in the client application. |
| `STRIPE_WEBHOOK_SECRET` | Backend `.env` only | ❌ **Never expose.** Used to verify webhook signatures. |

Furthermore, the documentation mandates that full card numbers should never be stored on your servers. You should rely on Stripe's secure elements or SDKs for card collection and validate all transaction amounts server-side.

## Testing Your Integration

During development, you should use Stripe's test mode keys (`pk_test_...` and `sk_test_...`). The skill provides standard test card numbers to simulate different transaction outcomes:

*   **Successful Transaction:** `4242 4242 4242 4242` (Any future expiry, any 3-digit CVC)
*   **Declined Transaction:** `4000 0000 0000 0002` (Any future expiry, any 3-digit CVC)

By following the workflows and utilizing the templates provided by the `stripe-integration` skill, you can rapidly and securely implement payment processing in your mobile applications.
