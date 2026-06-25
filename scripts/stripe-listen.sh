#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
ENDPOINT="localhost:${PORT}/api/webhooks/stripe"

echo "Starting Stripe CLI listener..."
echo "Forwarding events to: ${ENDPOINT}"
echo "Copy the webhook signing secret value Stripe prints into STRIPE_WEBHOOK_SECRET in your .env"

stripe listen --forward-to "${ENDPOINT}"
