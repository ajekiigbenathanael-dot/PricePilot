# PricePilot — database

Postgres schema, Row Level Security, and sample data for Supabase.

```
supabase/
├── migrations/
│   ├── 0001_initial_schema.sql   tables, indexes, triggers, profile auto-create
│   └── 0002_rls_policies.sql     RLS enabled + policies for every table
└── seed.sql                      12 sample products (dev data)
```

Apply **in order**: `0001` → `0002` → `seed.sql`.

## Option A — Supabase Dashboard (no CLI, quickest)

1. Open your project → **SQL Editor** → **New query**.
2. Paste the entire contents of `migrations/0001_initial_schema.sql`, **Run**.
3. New query → paste `migrations/0002_rls_policies.sql`, **Run**.
4. New query → paste `seed.sql`, **Run**. (The SQL Editor runs as `service_role`, so it can write to the RLS-protected `products` table.)

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
| `wishlist_items` | saved products (`user_id`, `product_id`) | owner only |
| `price_alerts` | "notify below `target_price`" rule | owner only |

### Design notes

- **Offers live inline on `products`** as a JSONB array (`[{retailer, price, shipping, url}]`) rather than a separate table. This honors the four-table spec and fits the sample-data phase where there's no real ingestion. If/when we add live sourcing, offers graduate to their own `product_offers` table.
- **`lowest_price`** is denormalized and defined as the **minimum total (item price + shipping)** across offers — the honest "best price you'd actually pay," which the browse card and the product-detail "Best price" badge both key off. Seed data is validated so this always matches the offers.
- **`price_history`** is placeholder JSONB (`[{date, price}]`) for the product-detail sparkline; the real series arrives with ingestion.
- **`profiles`** rows are created by the `handle_new_user` trigger (SECURITY DEFINER) on `auth.users` insert — no client insert needed on signup.
- **Writing products**: RLS blocks anon/authenticated writes. Seed and future admin tooling must use the `service_role` key (server-side only — never ship it to the browser).

## Keeping TypeScript in sync

The app's domain types in [`src/types/index.ts`](../src/types/index.ts) mirror this schema by hand. After schema changes, update them there (or later generate with `supabase gen types typescript`).
