# LiveFaces

LiveFaces is a 3D avatar and live emoji app project.

## Stripe backend checkpoint

This branch adds a TypeScript Express backend scaffold for premium access support.

Included:

- `.env.example`
- `server/` backend
- Checkout session route
- Subscription status route
- Local in-memory subscription store
- Event route registered before JSON parsing
- CLI listener helper
- Codex integration prompt

## Local setup

```bash
cp .env.example .env
cd server
npm install
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

Subscription status check:

```bash
curl http://localhost:3000/api/subscription/test_user_123
```

Replace `server/src/db/userStore.ts` with your real database after Firebase, Prisma, Supabase, or another database is wired.

Premium gates should check `isSubscribed === true` before allowing AI captions, high-resolution export, or unlimited saved avatars.
