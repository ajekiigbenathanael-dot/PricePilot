# PricePilot — database

Postgres schema, Row Level Security, and sample data for Supabase.

```
supabase/
├── migrations/
│   ├── 0001_initial_schema.sql      tables, indexes, triggers, profile auto-create
│   ├── 0002_rls_policies.sql        RLS enabled + policies for every table
│   ├── 0003_widen_categories.sql    widen products.category CHECK to 9 slugs
│   └── 0004_price_observations.sql  append-only real price history + RLS
└── seed.sql                         sample products (dev data)
```

Apply **in order**: `0001` → `0002` → `0003` → `0004` → `seed.sql`.

## Option A — Supabase Dashboard (no CLI, quickest)

1. Open your project → **SQL Editor** → **New query**.
2. Paste the entire contents of `migrations/0001_initial_schema.sql`, **Run**.
3. New query → paste `migrations/0002_rls_policies.sql`, **Run**.
4. New query → paste `migrations/0003_widen_categories.sql`, **Run**.
5. New query → paste `migrations/0004_price_observations.sql`, **Run**.
6. New query → paste `seed.sql`, **Run**. (The SQL Editor runs as `service_role`, so it can write to the RLS-protected `products` table.)

Re-running is safe: migrations are idempotent, and the seed upserts by fixed IDs.

## Option B — Supabase CLI

```bash
# one-time
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>

# push schema + policies, then seed
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql   # or paste seed.sql in the SQL Editor
```

> `supabase db push` applies files in `migrations/`. `seed.sql` is applied automatically by `supabase db reset` on a **local** stack; against a linked remote, run it manually as shown.

## Schema at a glance

| Table | Purpose | Access (RLS) |
| --- | --- | --- |
| `profiles` | 1 row per auth user; auto-created on signup | owner read/write |
| `products` | public catalog (offers inline as JSONB) | **public read**, no public write |
| `price_observations` | append-only log of scraped prices over time | **public read**, service_role write |
| `wishlist_items` | saved products (`user_id`, `product_id`) | owner only |
| `price_alerts` | "notify below `target_price`" rule | owner only |

### Design notes

- **Offers live inline on `products`** as a JSONB array (`[{retailer, price, shipping, url}]`) rather than a separate table. This honors the four-table spec and fits the sample-data phase where there's no real ingestion. If/when we add live sourcing, offers graduate to their own `product_offers` table.
- **`lowest_price`** is denormalized and defined as the **minimum total (item price + shipping)** across offers — the honest "best price you'd actually pay," which the browse card and the product-detail "Best price" badge both key off. Seed data is validated so this always matches the offers.
- **`price_history`** (JSONB `[{date, price}]` on `products`) is legacy placeholder for the product-detail sparkline. The **real** price series now lives in the dedicated **`price_observations`** table; the ingest writes there and leaves this column untouched.
- **`price_observations`** is an **append-only** log — one row per scrape (`product_id`, `platform`, `price`, `currency`, `in_stock`, `scraped_at`). Price movement ("dropped/increased by ₦X") is **derived** by comparing two genuine rows — never stored as a claim, never estimated. A product+platform with fewer than 2 observations has no previous price, so no movement badge is shown. Written only by the server-side ingest (`service_role`); public-readable so the app can compute movement.
- **`profiles`** rows are created by the `handle_new_user` trigger (SECURITY DEFINER) on `auth.users` insert — no client insert needed on signup.
- **Writing products**: RLS blocks anon/authenticated writes. Seed and future admin tooling must use the `service_role` key (server-side only — never ship it to the browser).

## Ingesting live prices (Jumia)

`scripts/ingest-jumia.mjs` scrapes real Jumia prices and writes them server-side:
it **upserts** each product into `products` (keyed by a deterministic UUIDv5 of
the product URL, so re-runs update the same row) and **appends** one row to
`price_observations` per scrape.

```bash
# .env must contain SUPABASE_SERVICE_ROLE_KEY (the sb_secret_… key) — server-side
# only, never a VITE_ var. Requires migrations 0001–0004 applied.
npm run ingest:jumia -- "infinix hot" --category=phones [--limit=5]
```

Run it again later to record a **second** price — only then does genuine
"dropped/increased by ₦X" movement become computable (fewer than 2 observations
⇒ no movement shown). The `service_role` key is read only by this script and is
never imported by `src/**`, so it can never reach the frontend bundle.

## Live "Check current price" (Edge Function)

The product page's **Check current price** button does an on-demand version of
the ingest for a single product. The browser can't do this itself (store CORS,
the honest bot User-Agent, and the `service_role` write all have to stay
server-side), so it calls a Supabase **Edge Function**:

```
supabase/functions/
├── _shared/jumia.ts      portable JSON-LD parser (same extraction as the scraper)
└── check-price/index.ts  fetch one product page → append observation → update product
```

What it does per call: loads the product, finds its re-fetchable Jumia offer (a
real `….html` product URL, **not** a search URL), does **one** time-bounded
fetch (10s) unless a reading was recorded in the last ~10 minutes (rate guard),
then **appends** a `price_observations` row and reflects the price on the
`products` row. Every non-throttled check records a genuine observation — so a
second check is what unlocks a real movement badge.

```bash
# Deploy (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are auto-injected into the
# function by the platform — no secrets to set). --no-verify-jwt lets signed-out
# visitors use the button; the per-product rate guard bounds abuse.
supabase functions deploy check-price --no-verify-jwt
```

The button only appears for products that have a real Jumia product-page offer
(i.e. ones added by `ingest-jumia.mjs`); seed products use search URLs, so it
stays hidden for them. Before deploying, swap the placeholder contact URL/email
in the function's `UA` string for your project's real details.

## Keeping TypeScript in sync

The app's domain types in [`src/types/index.ts`](../src/types/index.ts) mirror this schema by hand. After schema changes, update them there (or later generate with `supabase gen types typescript`).
