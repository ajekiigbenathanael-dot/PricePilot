-- PricePilot — 0001 initial schema
-- Tables: profiles, products, wishlist_items, price_alerts.
-- RLS is enabled and policed in 0002_rls_policies.sql (kept separate for clarity).
-- Safe to re-run: guarded with "if not exists" / "or replace" where possible.

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh on any row update.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user (1:1 with auth.users).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile when a new auth user signs up. SECURITY DEFINER so the
-- insert bypasses RLS (the new user has no session yet at trigger time).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- products — public catalog. Offers are stored inline as jsonb for the
-- sample-data phase (no separate offers table yet); see README for rationale.
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  category      text not null
                  check (category in (
                    'electronics', 'textbooks', 'dorm-supplies',
                    'bags', 'desk-study', 'wearables'
                  )),
  brand         text,
  image_url     text,
  description   text,
  -- Lowest *total* (item price + shipping) across offers. Denormalized so
  -- browse cards ("from $X across N stores") stay a single-column read.
  lowest_price  numeric(10, 2) not null check (lowest_price >= 0),
  -- [{ "retailer": text, "price": number, "shipping": number, "url": text }]
  offers        jsonb not null default '[]'::jsonb,
  -- [{ "date": "YYYY-MM-DD", "price": number }] — placeholder sparkline data.
  price_history jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- wishlist_items — per-user saved products (one row per user+product).
-- ---------------------------------------------------------------------------
create table if not exists public.wishlist_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists wishlist_items_user_id_idx on public.wishlist_items (user_id);

-- ---------------------------------------------------------------------------
-- price_alerts — "notify me below target_price" rule (one per user+product).
-- The checker is a placeholder; last_triggered_at is set by it in a later phase.
-- ---------------------------------------------------------------------------
create table if not exists public.price_alerts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  product_id        uuid not null references public.products (id) on delete cascade,
  target_price      numeric(10, 2) not null check (target_price > 0),
  is_active         boolean not null default true,
  last_triggered_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists price_alerts_user_id_idx on public.price_alerts (user_id);

drop trigger if exists price_alerts_set_updated_at on public.price_alerts;
create trigger price_alerts_set_updated_at
  before update on public.price_alerts
  for each row execute function public.set_updated_at();
