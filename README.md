# PricePilot

> Compare prices. Shop smarter.

A calm, trustworthy price-comparison platform for students — find the best price on everything students buy — electronics, textbooks, backpacks, dorm gear, wearables and more — across stores, and get alerted when prices drop.

Built to feel like the love-child of a clean banking app and a well-designed shopping app: airy, card-based, mobile-first, with color used **functionally** (green = savings, amber = price up, red = destructive only) so the numbers do the talking.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v3 (design tokens in `tailwind.config.ts`) |
| Routing | React Router v6 |
| API | Vercel serverless functions under [`api/`](./api/) (same-origin `/api`) |
| Database | MongoDB (official Node driver) |
| Prices | Node ingest scraping Jumia (sitemap + JSON-LD) — [`scripts/`](./scripts/) |

MongoDB has no browser SDK, so — unlike a Supabase-style setup — the React app
never touches the database directly. Every read/write goes through the app's own
**same-origin `/api`**, which holds the MongoDB connection server-side. In
production Vercel runs each file in `api/` as a serverless function; in dev a small
Vite plugin mounts the same handlers in-process (`npm run dev` just works).

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up MongoDB & environment variables

1. Provision a **MongoDB** database — a free **[MongoDB Atlas](https://www.mongodb.com/atlas)**
   cluster (`mongodb+srv://…`) for production, or a local one for dev
   (`mongodb://localhost:27017`, e.g. `docker run -p 27017:27017 mongo:7`).
2. Copy your values into a `.env` file (copy from `.env.example`):

   ```bash
   cp .env.example .env
   ```

   | Env var | Purpose |
   | --- | --- |
   | `MONGODB_URI` | Connection string (Atlas `mongodb+srv://…` or `mongodb://localhost:27017`) |
   | `MONGODB_DB` *(optional)* | Database name (defaults to `pricepilot`) |
   | `SCRAPER_CONTACT` *(recommended)* | Real email/URL for the scraper's honest User-Agent |

   > ⚠️ `MONGODB_URI` is **server-side only** — never prefix it with `VITE_` and
   > never import it from `src/**`; `VITE_`-prefixed vars get bundled into the
   > client. The browser needs no env var: it calls same-origin `/api` by default.
   > `.env` is gitignored; only `.env.example` is committed.

There is **no schema/migration step** — MongoDB is schemaless and the app creates
its collections and indexes automatically on first connect. The catalog is
populated by scraping (see the ingest below and [DEPLOYMENT.md](./DEPLOYMENT.md)).

### 3. Run the dev server

```bash
npm run dev
```

The app runs at [http://localhost:5173](http://localhost:5173), with the `/api`
functions served in-process (they read `MONGODB_URI` from `.env`).

### 4. Populate the catalog

Real, re-checkable prices are scraped from Jumia by the ingest:

```bash
npm run ingest:jumia -- "infinix hot" --category=phones
```

Run it again hours/days later to build price history (movement badges and the
chart need ≥2 genuine observations). Full go-live path — Atlas, Vercel env vars,
and the scheduled cron — is in [DEPLOYMENT.md](./DEPLOYMENT.md).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server (app + `/api`) |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Type-check without emitting (app + `/api`) |
| `npm run lint` | Lint with ESLint |
| `npm run format` | Format with Prettier |
| `npm run scrape:jumia` | Scrape a Jumia search to a JSON file (no DB write) |
| `npm run ingest:jumia -- "<query>" --category=<slug>` | Scrape + write one search to MongoDB |
| `npm run ingest:all` | Run every target in `scripts/ingest-targets.json` |

## Project structure

```
api/                 Vercel serverless functions (the app's backend)
├── _lib/            db connection (cached), JSON serializers, http helpers
├── products/        GET catalog + GET one product
├── observations.ts  GET price history for a product
├── check-price.ts   POST live re-check of one product's Jumia offer
└── search-miss.ts   POST live Jumia search when the catalog has no match

scripts/             Node ingest + scraper (server-side, writes to MongoDB)
vite/                dev-only plugin that serves api/ during `npm run dev`

src/
├── components/
│   ├── layout/      App shell — Navbar, Footer, AppLayout
│   └── ui/          Reusable primitives — Button, Card, Badge, Container, PageHeader
├── hooks/           Data-loading hooks (useProducts, useProduct, useObservations)
├── lib/             API client (api.ts), data-access modules, constants, utils
├── pages/           Route-level screens (one per route)
├── routes/          Router configuration
└── types/           Shared TypeScript types (Product, Offer, PriceObservation, …)
```

## Design system

All design tokens live in [`tailwind.config.ts`](./tailwind.config.ts) — **components consume tokens, never raw hex**.

- **Colors** — `primary` `#3D5AF1` (hover `#2E45C4`), `savings` `#12B76A`, `warning` `#F79009`, `danger` `#F04438`, `bg` `#F8FAFC`, `surface` `#FFFFFF`, `border` `#EAECF0`, `ink` `#0F172A`, `muted` `#64748B`.
- **Type** — Plus Jakarta Sans (`font-display`, headings) + Inter (`font-sans`, body). Prices use `tabular-nums` at weight 700+.
- **Shape** — `rounded-card` (12px), `rounded-control` (8px), `rounded-pill`. Soft `shadow-card`.
- **Layout** — `max-w-content` (1200px), generous padding, mobile-first.

## Data (MongoDB)

The browser never connects to MongoDB — it reads and writes through the
same-origin `/api`. Two collections back the app:

| Collection | Purpose |
| --- | --- |
| `products` | Public catalog; offers stored inline. `_id` is a deterministic UUIDv5 of the product URL, so `/product/:id` links stay stable across re-ingests. |
| `price_observations` | Append-only real price history — one document per reading, behind the movement badge and the history chart. |

Account features (profiles, wishlist, price alerts) have placeholder types and UI
but are **not wired to a backend** — see "Roadmap" below. Provisioning, indexes,
and the scraping pipeline are documented in [DEPLOYMENT.md](./DEPLOYMENT.md).

## Roadmap

- **Done** — app shell, routing, and design tokens; live browse/search and
  product-detail comparison reading the real catalog via `/api`; live "Check
  current price" re-check; live Jumia search when the catalog has no match; the
  scheduled ingest that builds price history.
- **Upcoming** — auth (email/password), and wiring wishlist + price alerts to it.

## Status

✅ **Core price-comparison flow is live** end to end (real scraped data, no
fabricated fallback). Auth-gated features (wishlist, alerts) remain placeholders.
