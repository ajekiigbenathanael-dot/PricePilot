# PricePilot — go-live checklist

Everything the app needs to show **live data** end to end. Work top to bottom;
each section has a checkbox list you can tick off.

The app renders **only real, scraped prices from Supabase** — there is no
fabricated fallback. So until the schema exists and the catalog has at least one
product, the UI correctly shows its empty states ("Prices on the way", "Deals
are on the way"). That's expected, not a bug.

> **What runs where (security).** The browser only ever uses the **anon** key
> (`VITE_*`), guarded by Row Level Security. The **service_role** key is
> server-side only — used by the ingest script and auto-injected into the Edge
> Function. It is never `VITE_`-prefixed and never imported by `src/**`, so it
> can't reach the browser bundle.

---

## 0. Prerequisites

- [ ] A Supabase project (note its **Project URL**, **anon key**, and
      **service_role key** from *Project Settings → API*).
- [ ] **Node 20.6+** (the ingest uses `node --env-file`).
- [ ] Dependencies installed: `npm install`.
- [ ] *(Optional, for migrations + Edge Function via CLI)* the Supabase CLI:
      ```bash
      npm install -g supabase
      supabase login
      supabase link --project-ref <your-project-ref>
      ```

---

## 1. Configure environment

- [ ] Copy the template and fill in your project's values:
      ```bash
      cp .env.example .env
      ```
- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (frontend).
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` (server-side ingest only).

`.env` is gitignored — never commit real keys.

---

## 2. Create the database schema

Apply the migrations **in order**: `0001 → 0002 → 0003 → 0004`. Full
instructions (Dashboard SQL Editor or `supabase db push`) live in
[`supabase/README.md`](supabase/README.md).

- [ ] `0001_initial_schema.sql` — tables, indexes, triggers
- [ ] `0002_rls_policies.sql` — Row Level Security + policies
- [ ] `0003_widen_categories.sql` — widen `products.category` to the 9 slugs
- [ ] `0004_price_observations.sql` — append-only real price history

Re-running is safe: migrations are idempotent.

---

## 3. Populate the catalog

Pick the path that matches your goal.

### Production / live (recommended)
Real, re-checkable prices scraped from Jumia. Only products added this way get
a working **"Check current price"** button and a real price-history chart.

- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` is set in `.env` (step 1).
- [ ] Run the ingest for the searches you want to list:
      ```bash
      npm run ingest:jumia -- "infinix hot" --category=phones
      npm run ingest:jumia -- "hp 15 laptop" --category=laptops --limit=5
      ```
      Valid categories: `phones` · `accessories` · `laptops` · `electronics` ·
      `textbooks` · `bags` · `dorm-supplies` · `fashion` · `health`.
- [ ] **Run each ingest again later** (hours/days apart). Price movement
      ("Down ₦X") is *derived* from two genuine observations — a single reading
      shows no trend by design.

### Demo / dev only (optional)
A quick sample catalog so the UI isn't empty while you evaluate it.

- [ ] Apply [`supabase/seed.sql`](supabase/seed.sql) (see `supabase/README.md`).

> Seed products use store **search** URLs, not deep product links — so they have
> **no** live-check button and **no** recorded observations (the history card
> shows "No price history recorded yet"). They're placeholders for layout, not
> live data. For anything real, use the ingest above.

---

## 4. Deploy the live "Check current price" function

The product page's live check calls the `check-price` Supabase Edge Function
(the browser can't fetch a store directly — CORS, the honest bot User-Agent, and
the service_role write all stay server-side).

- [ ] Edit [`supabase/functions/check-price/index.ts`](supabase/functions/check-price/index.ts)
      and replace the **placeholder contact URL/email** in the `UA` string with
      your project's real details.
- [ ] Deploy it:
      ```bash
      supabase functions deploy check-price --no-verify-jwt
      ```
      `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are auto-injected — no secrets
      to set. `--no-verify-jwt` lets signed-out visitors use the button; the
      per-product ~10-minute rate guard bounds abuse.

The button only appears on products with a real Jumia `.html` product offer
(i.e. ones added by the ingest in step 3), so it stays hidden until then.

---

## 5. Build & host the frontend (Vercel)

- [ ] Push the repo to GitHub/GitLab/Bitbucket and **import the project** into
      Vercel (or use the CLI path below).
- [ ] Leave build settings on **auto-detect** — Vercel recognizes Vite and uses
      build command `npm run build` and output directory `dist`. No overrides
      needed.
- [ ] Add environment variables under **Project → Settings → Environment
      Variables** (for **Production**, and **Preview** if you use preview
      deploys):
      - `VITE_SUPABASE_URL`
      - `VITE_SUPABASE_ANON_KEY`

      Vite **inlines** these at build time, so add them *before* the build and
      **redeploy** after any change.
- [ ] Confirm [`vercel.json`](vercel.json) is committed at the repo root. Its
      SPA rewrite sends every non-file request to `index.html`, so client-side
      routes like `/product/:id` load on refresh / direct navigation instead of
      404ing. (Vercel checks the filesystem first, so hashed assets in
      `/assets/*` are still served normally.)
- [ ] Deploy. Vercel builds and serves `dist/`.

**CLI alternative:**
```bash
npm install -g vercel
vercel          # preview deploy
vercel --prod   # production deploy
```
Set the same two env vars with `vercel env add` (or in the dashboard) before the
first production build.

To build locally for a smoke test: `npm run build` (runs `tsc -b && vite build`
→ `dist/`), then `npm run preview`.

---

## 6. Smoke test

- [ ] **Landing** (`/`) shows the hero comparison and trending deals from live
      products (not the "Prices on the way" placeholder).
- [ ] **Browse** (`/browse`) lists products; search fans out with a per-store
      summary; category filters work.
- [ ] **Product detail** (`/product/:id`) loads; the comparison table ranks
      stores cheapest-first.
- [ ] On an **ingested** product, **Check current price** appears, runs, and
      reports a price; a second run (after a real change) shows movement.
- [ ] **Price history** shows a chart once a product has ≥2 observations, and an
      honest empty/one-reading message otherwise.
- [ ] **Deep-link refresh**: hard-refresh (or open in a new tab) a
      `/product/:id` URL on the deployed site — it loads the page, *not* a 404.
      This confirms the `vercel.json` SPA rewrite is active.

---

### Keeping data fresh
Re-run the relevant `npm run ingest:jumia` commands on a schedule (cron, a CI
job, or manually). Every run appends one `price_observations` row per product,
which is what builds real history and unlocks movement badges over time.
