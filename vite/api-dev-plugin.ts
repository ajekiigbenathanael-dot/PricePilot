/**
 * api-dev-plugin.ts — serve the `/api` serverless functions during `npm run dev`.
 *
 * In production Vercel runs each file in `/api` as a serverless function. Locally
 * there is no Vercel runtime, so this Vite plugin reproduces just enough of it:
 * it intercepts `/api/*` requests, loads the matching handler module through
 * Vite's SSR pipeline (so the `.ts` is transformed and its imports — mongodb, the
 * `.mjs` scraper — resolve), and calls it with a minimal Vercel-style req/res.
 *
 * It also loads `.env` into `process.env` itself: Vite only exposes `VITE_`-
 * prefixed vars to the client, but the handlers need the SERVER-only `MONGODB_URI`
 * (and `MONGODB_DB`), so `npm run dev` serves a fully working API with no extra
 * CLI. `MONGODB_URI` stays server-side — it is read here, never bundled.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { URLSearchParams } from 'node:url';
import { loadEnv, type Plugin, type ViteDevServer } from 'vite';

/** A handler as loaded from an `/api/*.ts` module (typed loosely for the adapter). */
type Handler = (req: VercelLikeReq, res: VercelLikeRes) => unknown | Promise<unknown>;

interface VercelLikeReq {
  method?: string;
  query: Record<string, string>;
  body: unknown;
  headers: IncomingMessage['headers'];
}

interface VercelLikeRes {
  status(code: number): VercelLikeRes;
  json(data: unknown): VercelLikeRes;
  send(data: unknown): VercelLikeRes;
  setHeader(name: string, value: string | string[]): VercelLikeRes;
  getHeader(name: string): string | undefined;
}

/** Maps a request path (query stripped) to the handler module + any path params. */
interface Route {
  test: RegExp;
  module: string;
  params?: (match: RegExpMatchArray) => Record<string, string>;
}

// Fixed table for our endpoints. The `[id]` route requires a segment, so it
// never shadows the collection route (`/api/products`).
const ROUTES: Route[] = [
  {
    test: /^\/api\/products\/([^/]+)$/,
    module: '/api/products/[id].ts',
    params: (m) => ({ id: decodeURIComponent(m[1]) }),
  },
  { test: /^\/api\/products\/?$/, module: '/api/products/index.ts' },
  { test: /^\/api\/observations\/?$/, module: '/api/observations.ts' },
  { test: /^\/api\/check-price\/?$/, module: '/api/check-price.ts' },
  { test: /^\/api\/search-miss\/?$/, module: '/api/search-miss.ts' },
  { test: /^\/api\/auth\/register\/?$/, module: '/api/auth/register.ts' },
  { test: /^\/api\/auth\/login\/?$/, module: '/api/auth/login.ts' },
  { test: /^\/api\/auth\/me\/?$/, module: '/api/auth/me.ts' },
  { test: /^\/api\/auth\/logout\/?$/, module: '/api/auth/logout.ts' },
  { test: /^\/api\/auth\/profile\/?$/, module: '/api/auth/profile.ts' },
  { test: /^\/api\/auth\/password\/?$/, module: '/api/auth/password.ts' },
  { test: /^\/api\/wishlist\/?$/, module: '/api/wishlist/index.ts' },
  {
    test: /^\/api\/wishlist\/([^/]+)$/,
    module: '/api/wishlist/[productId].ts',
    params: (m) => ({ productId: decodeURIComponent(m[1]) }),
  },
  { test: /^\/api\/alerts\/?$/, module: '/api/alerts/index.ts' },
  {
    test: /^\/api\/alerts\/([^/]+)$/,
    module: '/api/alerts/[id].ts',
    params: (m) => ({ id: decodeURIComponent(m[1]) }),
  },
];

/** Read the full request body as a string (empty string when there is none). */
function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Adapt a Node ServerResponse to the `res.status().json()` API the handlers use. */
function makeVercelRes(res: ServerResponse): VercelLikeRes {
  const vRes: VercelLikeRes = {
    status(code) {
      res.statusCode = code;
      return vRes;
    },
    json(data) {
      if (!res.getHeader('content-type')) res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(data));
      return vRes;
    },
    send(data) {
      res.end(typeof data === 'string' ? data : JSON.stringify(data));
      return vRes;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
      return vRes;
    },
    getHeader(name) {
      return res.getHeader(name) as string | undefined;
    },
  };
  return vRes;
}

export function apiDevServer(mode: string): Plugin {
  return {
    name: 'pricepilot-api-dev',
    configureServer(server: ViteDevServer) {
      // Load ALL env vars (not just VITE_) so the handlers see server-only creds.
      // Don't clobber anything already set in the real process environment.
      const env = loadEnv(mode, process.cwd(), '');
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = value;
      }

      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/')) return next();

        const qIndex = url.indexOf('?');
        const pathname = qIndex === -1 ? url : url.slice(0, qIndex);
        const search = qIndex === -1 ? '' : url.slice(qIndex + 1);

        const route = ROUTES.find((r) => r.test.test(pathname));
        if (!route) return next();

        try {
          const mod = await server.ssrLoadModule(route.module);
          const handler = mod.default as Handler;

          const query: Record<string, string> = {};
          for (const [key, value] of new URLSearchParams(search)) query[key] = value;
          const match = pathname.match(route.test);
          if (route.params && match) Object.assign(query, route.params(match));

          let body: unknown;
          if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
            const raw = await readRequestBody(req);
            const contentType = String(req.headers['content-type'] ?? '');
            body = contentType.includes('application/json') && raw ? safeJsonParse(raw) : raw;
          }

          const vReq: VercelLikeReq = { method: req.method, query, body, headers: req.headers };
          await handler(vReq, makeVercelRes(res));
        } catch (err) {
          // Surface the error as JSON so the app's `{ error }` handling still works.
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(
            JSON.stringify({ error: err instanceof Error ? err.message : 'Dev API error.' }),
          );
        }
      });
    },
  };
}
