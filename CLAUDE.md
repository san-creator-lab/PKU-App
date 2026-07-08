# Hero Fuel

Mobile-first PWA that tracks daily protein ("fuel") intake for a child (8) with PKU — strict 8.0 g/day budget — shared in real time between the child ("Hero") and parents ("Sidekicks"). Superhero game UX, not a medical tool.

## Stack

- **Frontend:** React 18 + Vite 5 + TypeScript, Tailwind CSS 3, Framer Motion, React Router 6, Zustand, Recharts
- **Backend:** Supabase (Auth, Postgres, Realtime, Storage, Edge Functions) behind a `Backend` adapter (`src/lib/backend/`). A keyless local-first `LocalBackend` (IndexedDB + BroadcastChannel) runs automatically when no Supabase env keys are set.
- **OCR:** `OcrProvider` interface (`src/lib/ocr/`). Default: Tesseract.js, fully client-side with bundled language data (offline, keyless). Optional: Supabase Edge Function `ocr-label` (Anthropic Messages API).
- **PWA:** vite-plugin-pwa (autoUpdate) + IndexedDB offline outbox with last-write-wins sync.

## Commands

- `npm run dev` — start the dev server (http://localhost:5173)
- `npm run build` — typecheck + production build
- `npm run lint` — ESLint over `src` and `scripts`
- `npm run db:test` — apply all migrations to local Postgres under a Supabase-compatible harness and run the RLS proof
- `npx supabase db push` — push migrations to the linked hosted project (see README for linking)
- `npm run icons` — regenerate PWA PNG icons from the SVG source (Playwright)

## Conventions

- Screens in `src/screens`, reusable components in `src/components`, hooks in `src/hooks`, clients/utils in `src/lib`
- Secrets only via `.env`; never hardcode keys; any server-side key exists only as a Supabase secret
- Schema changes only as SQL migrations in `supabase/migrations/`; RLS on every table, scoped to `family_id`
- Mobile-first: design at a 390px viewport, touch targets ≥ 48px
- UI copy in Dutch (informal "jij/je"); code, comments and commit messages in English
- The child-facing UI never says "protein/eiwit" — it says "fuel" (brandstof). Parent-facing (Sidekick HQ) screens may show gram values with the word "eiwit" since parents talk to dietitians
- Tone: always encouraging, never punishing. Going over the limit gets a gentle, hopeful message. The arcade game uses neutral obstacles (meteors) — never "bad foods"
- All hero rewards (XP, coins, game tokens, gear) go through `applyHeroDelta` in `useAppStore` — one profile write per action. Economy/shop rules live in `src/lib/economy.ts`, daily missions in `src/lib/missions.ts` (deterministic per date, always completable, no storage beyond the `gear` jsonb bag)
- Theme tokens live in `tailwind.config.js`: navy `#0F1B2D` background, electric blue `#00D4FF`, gold `#FFD700`, hero-red `#FF3B3B` (warnings only). Dark mode is the default and only theme (V1)
- All visual assets (avatar, badges, icons) are generated SVG/canvas — no external assets, no stock images
- Never block on external services: everything upgradeable (Supabase, OCR) sits behind an adapter interface with a keyless local default
