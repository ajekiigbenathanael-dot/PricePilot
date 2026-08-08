-- PricePilot — 0002 Row Level Security
-- Every table is RLS-protected. Default posture: deny; policies below open the
-- minimum needed. `products` is the only public-readable table.
-- Idempotent: each policy is dropped before (re)creation.

-- ---------------------------------------------------------------------------
-- profiles — a user may read and edit only their own row.
-- (Inserts normally happen via the handle_new_user trigger, which is
-- SECURITY DEFINER; the insert policy covers manual upserts from the client.)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles: select own" on public.profiles;
create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- products — public read (anon + authenticated). No public write: with RLS on
-- and no insert/update/delete policy, writes are denied for everyone except
-- the service_role key (used by seeding / admin tooling), which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.products enable row level security;

drop policy if exists "products: public read" on public.products;
create policy "products: public read"
  on public.products for select
  using (true);

-- ---------------------------------------------------------------------------
-- wishlist_items — owner-only. No update policy: rows have no editable fields
-- (add via insert, remove via delete).
-- ---------------------------------------------------------------------------
alter table public.wishlist_items enable row level security;

drop policy if exists "wishlist: select own" on public.wishlist_items;
create policy "wishlist: select own"
  on public.wishlist_items for select
  using (auth.uid() = user_id);

drop policy if exists "wishlist: insert own" on public.wishlist_items;
create policy "wishlist: insert own"
  on public.wishlist_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "wishlist: delete own" on public.wishlist_items;
create policy "wishlist: delete own"
  on public.wishlist_items for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- price_alerts — owner-only full CRUD (users change target_price / toggle active).
-- ---------------------------------------------------------------------------
alter table public.price_alerts enable row level security;

drop policy if exists "alerts: select own" on public.price_alerts;
create policy "alerts: select own"
  on public.price_alerts for select
  using (auth.uid() = user_id);

drop policy if exists "alerts: insert own" on public.price_alerts;
create policy "alerts: insert own"
  on public.price_alerts for insert
  with check (auth.uid() = user_id);

drop policy if exists "alerts: update own" on public.price_alerts;
create policy "alerts: update own"
  on public.price_alerts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "alerts: delete own" on public.price_alerts;
create policy "alerts: delete own"
  on public.price_alerts for delete
  using (auth.uid() = user_id);
