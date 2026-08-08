# PricePilot

> Compare prices. Shop smarter.

A calm, trustworthy price-comparison platform for students  find the best price on everything students buy — electronics, textbooks, backpacks, dorm gear, wearables and more — across stores, and get alerted when prices drop.

Built to feel like the love-child of a clean banking app and a well-designed shopping app: airy, card-based, mobile-first, with color used **functionally** (green = savings, amber = price up, red = destructive only) so the numbers do the talking.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v3 (design tokens in `tailwind.config.ts`) |
| Routing | React Router v6 |
| Backend / DB / Auth | Supabase (Postgres, Supabase Auth, Row Level Security) |

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase & environment variables

1. Create a free project at **[supabase.com](https://supabase.com)** → **New project**.
2. In the dashboard, go to **Project Settings → API**.
3. Copy your credentials into a `.env` file (copy from `.env.example`):

   ```bash
   cp .env.example .env
   ```

   | Env var | Where to find it |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Project Settings → API → **Project URL** |
   | `VITE_SUPABASE_ANON_KEY` | Project Settings → API → Project API keys → **anon / public** |

   > ⚠️ Only the **anon/public** key belongs in the frontend. Never put the `service_role` key here — `VITE_`-prefixed vars are bundled into the client. `.env` is gitignored; only `.env.example` is committed.

### 3. Run the dev server

```bash
npm run dev
```

The app runs at [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Lint with ESLint |
| `npm run format` | Format with Prettier |

## Project structure

```
src/
├── components/
│   ├── layout/      App shell — Navbar, Footer, AppLayout
│   └── ui/          Reusable primitives — Button, Card, Badge, Container, PageHeader
├── hooks/           Reusable React hooks (auth, data — added in later phases)
├── lib/             supabase client, app constants, utils
├── pages/           Route-level screens (one per route)
├── routes/          Router configuration
└── types/           Shared TypeScript types (Product, Profile, WishlistItem, PriceAlert)
```

## Design system

All design tokens live in [`tailwind.config.ts`](./tailwind.config.ts) — **components consume tokens, never raw hex**.

- **Colors** — `primary` `#3D5AF1` (hover `#2E45C4`), `savings` `#12B76A`, `warning` `#F79009`, `danger` `#F04438`, `bg` `#F8FAFC`, `surface` `#FFFFFF`, `border` `#EAECF0`, `ink` `#0F172A`, `muted` `#64748B`.
- **Type** — Plus Jakarta Sans (`font-display`, headings) + Inter (`font-sans`, body). Prices use `tabular-nums` at weight 700+.
- **Shape** — `rounded-card` (12px), `rounded-control` (8px), `rounded-pill`. Soft `shadow-card`.
- **Layout** — `max-w-content` (1200px), generous padding, mobile-first.

## Database (Supabase)

Schema, Row Level Security, and sample data live in [`supabase/`](./supabase/) — see [supabase/README.md](./supabase/README.md) for how to apply them (Dashboard SQL Editor or the Supabase CLI).

| Table | Purpose | Access |
| --- | --- | --- |
| `profiles` | 1 row per user, auto-created on signup | owner only |
| `products` | public catalog (offers inline as JSONB) | public read |
| `wishlist_items` | saved products | owner only |
| `price_alerts` | "notify below target" rules | owner only |

Apply order: `migrations/0001` → `migrations/0002` → `seed.sql`. After running, the app can read 12 sample products across the six categories.

## Roadmap

Phase 1 (done) — app shell, routing, tokens, Supabase client.
Phase 2 (done) — database schema + RLS + sample data.
Upcoming — auth (email/password), browse/search, product-detail comparison, wishlist, price alerts.

## Status

🚧 **Scaffold + database ready.** Feature UIs are next; routes still render placeholders.
