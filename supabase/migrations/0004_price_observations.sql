-- PricePilot — 0004 price_observations (real price history)
-- An APPEND-ONLY log of genuinely scraped prices: one row per scrape, per
-- product, per platform. This is the system of record for price movement.
--
-- WHY A TABLE (not the products.price_history jsonb):
--   • movement must be PER PLATFORM (product_id + platform), which the
--     {date, price} jsonb can't express;
--   • the ingest upserts (overwrites) the products row every run — appending
--     history there would mean read-modify-write of a growing blob on a hot row;
--   • the jsonb column was only ever placeholder sparkline data.
--
-- INTEGRITY GUARANTEE: "price dropped/increased by ₦X" is DERIVED by comparing
-- two real rows here — there is no stored delta anyone could fake. A product+
-- platform with fewer than 2 observations has no previous price, so the UI shows
-- the current price with NO change indicator. Real history only, never estimated.
--
-- Idempotent: safe to re-run (guarded with if-not-exists / drop-if-exists).

create table if not exists public.price_observations (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  -- CHECK mirrors PLATFORMS in src/lib/constants.ts — keep the two in sync.
  platform    text not null
                check (platform in ('jumia', 'konga', 'slot', 'payporte', 'temu')),
  price       numeric(10, 2) not null check (price >= 0), -- matches products.lowest_price
  currency    text not null default 'NGN',
  in_stock    boolean,
  -- When the price was observed (set by the ingest from the scrape time).
  scraped_at  timestamptz not null default now()
);

-- The hot read is "the latest observation(s) for this product+platform", used to
-- derive current price and the last real movement — index it newest-first.
create index if not exists price_observations_product_platform_time_idx
  on public.price_observations (product_id, platform, scraped_at desc);

-- ---------------------------------------------------------------------------
-- RLS: public read (so the app can derive movement client-side); no write
-- policy, so with RLS enabled only the service_role key (server-side ingest,
-- which bypasses RLS) can insert. Append-only: never updated or deleted.
-- ---------------------------------------------------------------------------
alter table public.price_observations enable row level security;

drop policy if exists "price_observations: public read" on public.price_observations;
create policy "price_observations: public read"
  on public.price_observations for select
  using (true);
