# Hero Fuel ⚡

A mobile-first PWA that tracks daily protein ("fuel") intake for a child with
PKU — strict 8.0 g/day budget by default — shared in real time between the
child (**Hero**) and parents (**Sidekicks**) on multiple phones. The whole UX
is a superhero game: an evolving avatar, an animated power meter, streaks
with shields, badges, weekly challenges and a comic-style label scanner.
Dutch UI (informal), dark "hero lair" theme, designed at 390 px.

The child-facing UI never says "eiwit/protein" — it says **brandstof (fuel)**.

## Quick start (zero setup)

```bash
npm install
npm run dev          # http://localhost:5173
```

Without Supabase keys the app runs on the keyless **local backend**
(IndexedDB + BroadcastChannel): every feature works on one device — accounts,
family codes, logging, gamification, the scanner, offline — and "realtime"
syncs across tabs/PWA windows. Perfect for demo and development. Add Supabase
keys (below) and the same UI runs on Auth + Postgres + Realtime across real
devices; the adapter (`src/lib/backend/`) picks the backend at startup.

Other commands:

```bash
npm run build        # typecheck + production build (PWA)
npm run lint         # ESLint over src, scripts and the edge function
npm run preview      # serve the production build
npm run db:test      # apply migrations to local Postgres + run the RLS proof
npm run icons        # regenerate PWA icons (Playwright)
npm run gen:foods    # regenerate the local seed-food module from the SQL seed
```

Verification scripts (Playwright, expects `npm run dev` on :5173 unless noted):

```bash
node scripts/verify-flow.mjs      # onboarding, logging, join, realtime (2 sessions)
node scripts/verify-scanner.mjs   # OCR happy path + low-confidence fallback
node scripts/verify-hq.mjs        # HQ, charts, history, settings, CSV, streak engine
node scripts/verify-pwa.mjs http://localhost:4173   # PWA/offline (run preview first)
node scripts/shoot-all.mjs        # screenshot every screen at 390px
```

## Supabase setup

The schema lives **exclusively** in `supabase/migrations/` — tables, RLS
policies, `join_family`/`create_family` functions, realtime publication,
storage bucket and the ~57-item Dutch food seed.

### Option A — hosted project (recommended for real families)

1. Create a project at [supabase.com](https://supabase.com) (any region).
2. Link and push the schema:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

3. Copy the project URL + anon key (Project Settings → API) into `.env`:

   ```bash
   cp .env.example .env
   # fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   ```

4. In Authentication → Providers → Email, disable "Confirm email"
   (family devices sign in with email + password; the hero's device keeps a
   persistent session so the child never re-logs).
5. `npm run dev` — the app now runs on Supabase; sign up, create the family,
   and join from other devices with the 6-digit code.

### Option B — local stack (Docker)

```bash
npx supabase start        # boots Postgres/Auth/Realtime/Storage locally
```

Copy the printed `API URL` and `anon key` into `.env` as above. The CLI
applies `supabase/migrations/` automatically on start (or `npx supabase db reset`).

### Promoting a local setup to a hosted project

Nothing to migrate by hand — the schema is the migrations directory:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push      # replays the same migrations on the hosted DB
```

Then swap the two values in `.env` from the local keys to the hosted keys and
rebuild. Regenerate DB types against either target whenever the schema changes:

```bash
npx supabase gen types typescript --local  > src/lib/database.types.ts   # local
npx supabase gen types typescript --linked > src/lib/database.types.ts   # hosted
```

(`src/lib/database.types.ts` in this repo was hand-authored in exactly the
generator's format because the CLI couldn't reach a running stack in the
build sandbox — regenerating should produce an equivalent file.)

## Row Level Security — proof

Every family-scoped table is RLS-protected and scoped to `family_id`; `foods`
is read-only for clients. `npm run db:test` applies the **unmodified**
migrations to a scratch database on local PostgreSQL under a
Supabase-compatibility harness (`scripts/db/harness.sql`: `anon`/
`authenticated` roles, `auth.uid()` reading `request.jwt.claims`, realtime
publication, storage stubs) and then executes cross-family attacks exactly as
PostgREST would run them.

The captured run lives in [`docs/rls-proof.md`](docs/rls-proof.md) and shows,
among 14 assertion groups: a member of family B SELECTing family A's
`food_entries` → **0 rows**; INSERTing into family A → **denied**
(`new row violates row-level security policy`); UPDATE/DELETE → **0 rows
affected**; `join_family('000000')` → `invalid_family_code`; a fresh account
joining with the real code and then seeing the family's data; `foods` INSERT
→ denied; `anon` → no rows anywhere.

## OCR — switching providers

The Hero Scanner uses an `OcrProvider` interface (`src/lib/ocr/`).

- **Default: `tesseract`** — fully client-side, zero keys, works offline.
  Worker/wasm/traineddata are copied from npm into `public/` at
  dev/build time (`scripts/copy-ocr-assets.mjs`) and served same-origin, so
  no CDN is ever contacted. A nutrition-label parser repairs the classic
  OCR mistakes (glued units, dropped decimal commas) by exploiting the
  mathematical link between the per-100 g and per-portion columns.
- **Optional: `anthropic`** — the Supabase Edge Function
  `supabase/functions/ocr-label` reads the label with the Anthropic Messages
  API (`claude-sonnet-4-6`, strict JSON schema output). To switch:

  ```bash
  npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
  npx supabase functions deploy ocr-label
  # .env:
  VITE_OCR_PROVIDER=anthropic
  ```

Either way, results below the confidence threshold (0.55) drop the user into
a friendly manual-entry fallback ("Mijn scanner heeft hulp nodig! 🛠️").

## PWA & offline

- `vite-plugin-pwa` (autoUpdate) with generated icons (incl. maskable);
  installable via Add to Home Screen on iOS and Android.
- The app shell is precached — the app opens with no network.
- Writes go through an IndexedDB outbox when the backend is unreachable and
  flush FIFO on reconnect; entries carry a client-generated `client_id` and
  the backends upsert on it, so retries are idempotent and conflicts resolve
  last-write-wins on `updated_at`.
- OCR assets (multi-MB) are cached at runtime on first scan, keeping the
  install small.

## Architecture

```
src/
  components/   reusable UI (PowerMeter, HeroAvatar, BadgeModal, Sheet, …)
  screens/      one file per screen (dashboard, add, scanner, library, HQ, …)
  hooks/        useAppStore (zustand: auth/data/realtime/gamification), alerts
  lib/
    backend/    Backend interface + SupabaseBackend + LocalBackend
    ocr/        OcrProvider + Tesseract/Anthropic providers + label parser
    gamification.ts  XP, levels, zones, streaks, badges, weekly challenges
    outbox.ts   offline queue     csv.ts  dietitian export     i18n.ts  NL/EN
supabase/
  migrations/   schema + RLS + functions + realtime/storage + food seed
  functions/    ocr-label edge function (Anthropic; deploy-ready)
scripts/        db harness + RLS proof, OCR assets, icons, verify-* suites
```

## Decisions

- **Backend adapter with a keyless local default.** The brief demands "never
  block on external services": with no `.env` keys the app runs entirely
  local-first (IndexedDB + BroadcastChannel realtime) and is upgraded to
  Supabase by adding two env values — no code changes. The Supabase
  implementation is the production path and feature-complete (Auth,
  `postgres_changes` realtime scoped to the family, storage uploads,
  SECURITY-DEFINER RPCs).
- **Build-sandbox constraint, documented honestly:** this repository was
  built in a sandbox whose egress policy blocks `*.supabase.co`, Docker
  registries and CDNs. Hosted/local-stack Supabase could therefore not be
  exercised here; instead the real migrations were proven on a local
  PostgreSQL 16 (`npm run db:test`, `docs/rls-proof.md`) and every UX flow —
  including two-session realtime (186 ms) and offline — was verified in the
  browser on the local backend. First run against a real Supabase project:
  follow "Supabase setup" above (5 minutes).
- **Schema extras beyond the brief's model:** `profiles.streak_last_date` and
  `profiles.shields_refilled_on` (deterministic streak/shield bookkeeping),
  `profiles.language`, `food_entries.client_id` (offline idempotency),
  `custom_foods.emoji`, `updated_at` columns + triggers,
  `unique(profile_id, badge_type)` and `unique(family_id, week_start)`.
- **`join_family` only joins accounts that have no family yet** — no silent
  family switching; `create_family` generates the unique 6-digit code
  server-side. Both are SECURITY DEFINER and validated in the RLS proof.
- **Gamification is hero-centric:** XP, streaks, shields and badges land on
  the family's hero profile (falling back to the viewer before a hero has
  joined), so a parent logging for the child still powers the child's hero.
- **Streak rules:** only completed days count (today is always provisional);
  a day counts when it has ≥1 entry and stays within the limit; a missed or
  over-limit day consumes a shield if available, else resets; one shield
  refills each Monday; a gap of more than 30 days restarts evaluation.
- **Zones scale with the configured limit** (green < 75%, yellow < 87.5%,
  red ≤ 100%, over) — matching the brief's 6/7/8 for the default 8.0 g.
- **Favoriting a seeded food clones it into `custom_foods`** — favorites sync
  across the family and the values become editable (seed stays read-only).
- **Local seed foods are generated from the SQL migration**
  (`npm run gen:foods`) so the demo backend and Postgres serve identical
  libraries with one source of truth.
- **i18n:** Dutch is complete; the English option in Settings covers the core
  flows and falls back to Dutch for long-tail strings (badges/challenges are
  NL-only in V1).
- **Notifications are device-local in V1** (no push server): with permission,
  the open app warns when the budget is nearly full and when nothing was
  logged by 18:00 — labeled honestly in Settings.
- **Conflict resolution is last-write-wins** on `updated_at` with
  `client_id`-idempotent inserts. Concurrent offline XP updates from two
  devices can briefly under/over-count — acceptable at family scale.
- **Label photos** are downscaled to ≤640 px client-side; Supabase Storage
  (private bucket, family-scoped paths, signed URLs) or inline data URLs in
  local mode.
- **HashRouter** so the PWA works on any static host without rewrite rules.
- **Performance for older phones:** vendor chunk splitting; Recharts loads
  only for the HQ route and Tesseract only in the scanner; damped springs;
  `prefers-reduced-motion` respected globally.
- **Verification is scripted** (Playwright against the preinstalled
  Chromium): four suites cover onboarding→realtime, OCR both paths, HQ/CSV/
  streak engine, and PWA/offline — 38 checks total, all green at ship time.

## Known limitations (V1)

- Weekly-challenge progress for "log it yourself" needs a hero profile in the
  family (it counts entries logged by the hero's account).
- `scanner_pro` counts scans within the 60-day window the app keeps in memory.
- Local demo mode is per-browser: two *tabs* sync in realtime; two different
  browsers/devices need a Supabase project.

Out of scope per the brief (V2): barcode scanning, NEVO/RIVM import, PDF
dietitian report, multiple hero profiles, light theme, haptics, widgets.

---

⚠️ **Medical note:** protein values in the seeded library are indicative.
Always verify against product labels or your dietitian. This app supports —
but never replaces — professional dietary advice.
