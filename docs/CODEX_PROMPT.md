# Codex Prompt: Integrate LiveFaces Stripe Setup

Apply the LiveFaces Stripe setup package to this repository.

Requirements:
1. Copy `.env.example` to the project root.
2. Add the `server/` folder as a Node/Express TypeScript backend.
3. Install server dependencies with `cd server && npm install`.
4. Confirm the webhook route is registered before `express.json()`.
5. Keep Stripe secret values server-only.
6. Use public Stripe publishable values only in frontend/mobile code.
7. Add premium gates to caption generation, high-res export, and unlimited avatars by reading `/api/subscription/:userId`.
8. Do not commit `.env`.
9. Commit changes with: `feat: add stripe setup package`.
