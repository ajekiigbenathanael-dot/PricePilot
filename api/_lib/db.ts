/**
 * api/_lib/db.ts — MongoDB access for the serverless API functions.
 *
 * Serverless invocations reuse a warm process, so we MUST cache one MongoClient
 * across requests instead of dialing a fresh connection each time (that would
 * exhaust the connection pool). We stash the connect() promise on `globalThis`
 * so it survives both Vercel warm starts and Vite dev HMR re-evaluation.
 *
 * This is the read/write path for the browser-facing API. The CLI/CI ingest has
 * its own short-lived connection in scripts/db.mjs.
 */
import { MongoClient, type Db } from 'mongodb';

const DEFAULT_DB = 'pricepilot';

// Cached across warm invocations / HMR. `indexed` ensures we only createIndex once.
const globalForMongo = globalThis as unknown as {
  __pricepilotMongo?: { promise: Promise<MongoClient> | null; indexed: boolean };
};

const store = (globalForMongo.__pricepilotMongo ??= { promise: null, indexed: false });

function clientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Server is missing MONGODB_URI.');
  if (!store.promise) {
    // Fail fast with a clear error instead of hanging on a slow/flaky network:
    // the driver default server-selection wait is 30s, which blows past Vercel's
    // function timeout and shows up as a dead page. Bound it, and keep the pool
    // small since serverless instances each hold their own.
    store.promise = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
    }).connect();
  }
  return store.promise;
}

/**
 * Get the app database, ensuring the read indexes exist once per cold start.
 * Index creation is idempotent and best-effort: if it fails (e.g. a read-only
 * user), reads still work, so we don't wedge the request on it.
 */
export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  const db = client.db(process.env.MONGODB_DB || DEFAULT_DB);

  if (!store.indexed) {
    try {
      await db.collection('products').createIndex({ category: 1 });
      await db
        .collection('price_observations')
        .createIndex({ product_id: 1, platform: 1, scraped_at: -1 });
      store.indexed = true;
    } catch {
      /* leave unindexed — the next request retries; reads work regardless */
    }
  }

  return db;
}
