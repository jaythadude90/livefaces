# Codex Prompt: Apply Corrected LiveFaces Backend Files

Apply only the files in this package to the `livefaces` repository.

Requirements:
1. Copy `.env.example` to the project root.
2. Copy `.gitignore`, preserving existing project-specific ignores if needed.
3. Copy `railway.json` to the project root.
4. Copy the `server/` folder into the repository root.
5. Copy `scripts/stripe-listen.sh`.
6. Run `cd server && npm install`.
7. Confirm `server/src/index.ts` registers `/api/webhooks` before `express.json()`.
8. Keep Stripe and Firebase secrets out of GitHub.
9. Do not commit `.env`.
10. Commit changes with: `feat: add stripe firebase railway backend`.
