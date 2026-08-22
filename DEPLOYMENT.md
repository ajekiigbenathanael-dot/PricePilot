# PricePilot — go-live checklist

Everything the app needs to show **live data** end to end. Work top to bottom;
each section has a checkbox list you can tick off.

The app renders **only real, scraped prices** — there is no fabricated fallback.
So until MongoDB is reachable and the catalog has at least one product, the UI
correctly shows its empty states ("Prices on the way", "Deals are on the way").
That's expected, not a bug.

> **What runs where (security).** The browser never talks to the database. It
> only calls the app's own **same-origin `/api`** (Vercel serverless functions),
> which hold the MongoDB connection server-side. `MONGODB_URI` is a **server-only**
> secret — it is **never** `VITE_`-prefixed and never imported by `src/**`, so it
> can't reach the browser bundle. (There is no anon/service-role split to reason
> about anymore — MongoDB has no browser SDK, so all DB access is server-side by
> construction.)

---

## 0. Prerequisites

- [ ] A **MongoDB** database. Either:
      - **MongoDB Atlas** free tier (recommended for production) — create a
        cluster, a database user with **readWrite** on the `pricepilot` database,
        and grab the `mongodb+srv://…` connection string from *Database → Connect
        → Drivers*; **or**
      - a **local** MongoDB for dev: `mongodb://localhost:27017` (e.g.
        `docker run -p 27017:27017 mongo:7`).
- [ ] **Node 20.6+** (the ingest uses `node --env-file`).
- [ ] Dependencies installed: `npm install`.

> **Atlas network access:** Vercel and GitHub Actions connect from **dynamic IPs**,
> so in *Atlas → Network Access* either allow `0.0.0.0/0` (relying on the strong
> password in the connection string) or use Atlas's Vercel integration. A narrow
> IP allowlist will silently block the functions and the cron.

---

## 1. Configure environment

- [ ] Copy the template and fill in your values:
      ```bash
      cp .env.example .env
      ```
- [ ] Set `MONGODB_URI` (server-side only) — your Atlas `mongodb+srv://…` string
      or `mongodb://localhost:27017`.
- [ ] *(Optional)* `MONGODB_DB` — the database name (defaults to `pricepilot`).
- [ ] *(Recommended)* `SCRAPER_CONTACT` — a real email or URL for the scraper's
      User-Agent (see step 6).

`.env` is gitignored — never commit real credentials. The browser needs **no**
env var: it calls same-origin `/api` by default. (`VITE_API_BASE_URL` exists only
to point the browser at a *different* API origin — rare, and it must be an origin
URL, never a secret.)

---

## 2. Create the database schema

Nothing to run. **MongoDB is schemaless**, and the app creates its indexes
automatically the first time the API or the ingest connects (`ensureIndexes()` in
[`api/_lib/db.ts`](api/_lib/db.ts) and [`scripts/db.mjs`](scripts/db.mjs)):

- **`products`** — `_id` is a deterministic UUIDv5 of the product URL, so
  `/product/:id` links are stable across re-ingests. Index on `{ category: 1 }`.
- **`price_observations`** — append-only real price history. Index on
  `{ product_id: 1, platform: 1, scraped_at: -1 }` (the hot "latest reading"
  read behind movement badges and the chart).

So the first ingest (step 3) both creates the collections/indexes and populates
them. There is no migration step.

---

## 3. Populate the catalog

Real, re-checkable prices scraped from Jumia. Only products added this way get a
working **"Check current price"** button and a real price-history chart.

- [ ] Confirm `MONGODB_URI` is set in `.env` (step 1).
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

> There is no demo `seed.sql` anymore — the ingest **is** the data path. If you
> need a placeholder catalog for a pure-layout review, the sample data in
> [`src/lib/sampleProducts.ts`](src/lib/sampleProducts.ts) is retained as seed
> material (a small `scripts/seed-mongo.mjs` is a possible follow-up), but it has
> no live-check button and no recorded observations. For anything real, ingest.

---

## 4. Run it locally

`npm run dev` serves the app **and** the `/api` functions from one process — a
small Vite plugin ([`vite/api-dev-plugin.ts`](vite/api-dev-plugin.ts)) mounts each
`api/*.ts` handler in-process and loads `.env` (including the server-only
`MONGODB_URI`) into `process.env`. No separate function server or CLI is needed.

- [ ] `npm run dev` → open http://localhost:5173.
- [ ] Browse and a product page load from `/api/products`; the category filter
      works; on an ingested product, **Check current price** returns a price.

In production there is no dev plugin — **Vercel** runs each file under `/api` as a
real serverless function (see step 5).

---

## 5. Build & host the frontend + API (Vercel)

- [ ] Push the repo to GitHub/GitLab/Bitbucket and **import the project** into
      Vercel (or use the CLI path below).
- [ ] Leave build settings on **auto-detect** — Vercel recognizes Vite (build
      `npm run build`, output `dist`) and automatically deploys every file under
      [`api/`](api/) as a Node serverless function. No overrides needed.
- [ ] Add environment variables under **Project → Settings → Environment
      Variables** (for **Production**, and **Preview** if you use preview deploys):
      - `MONGODB_URI` — **required.** The serverless functions read it at runtime
        (it is *not* inlined into the client, unlike `VITE_` vars). Do **not**
        prefix it with `VITE_`.
      - `MONGODB_DB` — *optional* (defaults to `pricepilot`).
      - `SCRAPER_CONTACT` — *recommended* for the live-check function's User-Agent.

      Redeploy after adding or changing any of these so the functions pick them up.
- [ ] Confirm [`vercel.json`](vercel.json) is committed at the repo root. Its
      SPA rewrite uses a negative lookahead — `"/((?!api/).*)" → "/index.html"` —
      so client-side routes like `/product/:id` load on refresh **without**
      swallowing `/api/*` requests. (Vercel checks the filesystem and functions
      first, so hashed assets in `/assets/*` and the API are served normally.)
- [ ] Deploy. Vercel builds `dist/` and provisions the `/api` functions.

**CLI alternative:**
```bash
npm install -g vercel
vercel          # preview deploy
vercel --prod   # production deploy
```
Set the same env vars with `vercel env add` (or in the dashboard) before the
first production build.

To build locally for a smoke test: `npm run build` (runs `tsc -b && vite build`
→ `dist/`), then `npm run preview`. Note that `preview` serves only the static
`dist/` — the `/api` functions are exercised by `npm run dev` (step 4) or on the
deployed Vercel site.

---

## 6. Scraper contact (honest User-Agent)

The live check and the ingest fetch Jumia with an **identifying** User-Agent
(never a fake browser). Jumia's crawler policy requires a reachable owner.

- [ ] Set `SCRAPER_CONTACT` (a real email or URL) — in `.env` locally, as a
      **Vercel env var** for the live-check function, and as a **GitHub Actions
      repo secret** for the cron (step 8). Unset, it falls back to the committed
      placeholder in [`scripts/scrape-jumia.mjs`](scripts/scrape-jumia.mjs) — fine
      for a test run, not for volume crawling; also update the placeholder repo
      URL in that file's `UA` string.

The **Check current price** button only appears on products with a real Jumia
`.html` product offer (i.e. ones added by the ingest in step 3), so it stays
hidden until then.

---

## 7. Smoke test

- [ ] **Landing** (`/`) shows the hero comparison and trending deals from live
      products (not the "Prices on the way" placeholder).
- [ ] **Browse** (`/browse`) lists products; search fans out with a per-store
      summary; category filters work. A search with no catalog match triggers
      `/api/search-miss` and renders live Jumia results inline.
- [ ] **Product detail** (`/product/:id`) loads; the comparison table ranks
      stores cheapest-first.
- [ ] On an **ingested** product, **Check current price** appears, runs, and
      reports a price; a second run (after a real change) shows movement.
- [ ] **Price history** shows a chart once a product has ≥2 observations, and an
      honest empty/one-reading message otherwise.
- [ ] **Deep-link refresh**: hard-refresh (or open in a new tab) a
      `/product/:id` URL on the deployed site — it loads the page, *not* a 404.
      This confirms the `vercel.json` SPA rewrite is active and does not shadow
      `/api`.

---

## 8. Keeping data fresh — automated scraping (GitHub Actions)

Price *movement* (the "Down ₦X" badges and the history chart) is derived from
**≥2 genuine `price_observations` documents per product**, so the catalog has to
be re-scraped on a schedule for history to build up. That's automated by the
[`ingest`](.github/workflows/ingest.yml) workflow, which runs
[`scripts/ingest-all.mjs`](scripts/ingest-all.mjs) over a curated list of search
targets and writes to MongoDB. One-time setup:

- [ ] **Add repo secrets** under *GitHub → Settings → Secrets and variables →
      Actions → New repository secret*:
      - `MONGODB_URI` — the same server-side connection string the ingest uses
        locally. Storing it here is safe: Actions secrets are encrypted, masked in
        logs, and the workflow never runs on `pull_request`, so fork PRs can't read
        it. It stays out of the browser bundle entirely. (The ingest also redacts
        the credentials when it logs the connection target.)
      - `MONGODB_DB` *(optional)* — the database name if not `pricepilot`.
      - `SCRAPER_CONTACT` *(recommended)* — a real email or URL for the scraper's
        User-Agent (see step 6).
      Make sure Atlas Network Access permits GitHub's dynamic IPs (step 0).
- [ ] **Curate the targets** in
      [`scripts/ingest-targets.json`](scripts/ingest-targets.json) — an array of
      `{ "q": "<search>", "category": "<slug>", "limit": <N> }`. Categories must
      be one of the 9 valid slugs. Edit these to the products you want tracked.
- [ ] **Test it now** without waiting for the cron: *Actions → ingest → Run
      workflow* (the `workflow_dispatch` button). Watch the log for the per-target
      tally, then confirm `price_observations` document counts rose in MongoDB.
- [ ] **Cadence** defaults to every 6 hours (`cron: '17 */6 * * *'`, UTC). To
      change it, edit the `schedule` in the workflow: `'0 * * * *'` for hourly,
      `'17 6,18 * * *'` for twice daily. Hourly mostly records identical prices
      (little signal) and uses more Actions minutes on private repos.

> **Heads-up:** GitHub disables scheduled workflows after **60 days with no repo
> commits** (it emails the last committer) — just re-enable it in the Actions tab.
> Cron timing is best-effort and can lag a few minutes under load; that's fine
> for price history.

You can still run ingests by hand anytime — `npm run ingest:all` (all targets)
or `npm run ingest:jumia -- "<query>" --category=<slug>` (a single one).
