/**
 * db.mjs — MongoDB connection helper for the server-side scripts (ingest).
 *
 * Zero-dep beyond the `mongodb` driver. Each script runs as a short-lived
 * process, so this just opens ONE client, hands back the db handle, and leaves
 * closing to the caller (which must do so in a `finally`, or the process hangs
 * on the open socket). The serverless API has its own connection-cached client
 * in api/_lib/db.ts — this module is for the CLI/CI ingest only.
 *
 * Env (read from process.env — supplied by `node --env-file=.env` locally, or the
 * CI environment):
 *   MONGODB_URI  — connection string (required), e.g. mongodb+srv://…/  or
 *                  mongodb://localhost:27017
 *   MONGODB_DB   — database name (optional, defaults to "pricepilot")
 */
import { MongoClient } from 'mongodb';

export const DEFAULT_DB = 'pricepilot';

/** Resolve { uri, dbName } from the environment (uri may be undefined). */
export function mongoConfig() {
  return {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB || DEFAULT_DB,
  };
}

/**
 * Open a MongoDB connection and return { client, db, uri }. Throws (rather than
 * exits) when MONGODB_URI is missing so callers can present their own message.
 * The caller owns the client and MUST `await client.close()` when done.
 */
export async function connect() {
  const { uri, dbName } = mongoConfig();
  if (!uri) {
    throw new Error(
      'missing MONGODB_URI. Add it to .env (server-side only — never a VITE_ var) ' +
        'and run with `node --env-file=.env` (or provide it via the CI env). ' +
        'Use an Atlas connection string or mongodb://localhost:27017 for a local db.',
    );
  }
  const client = new MongoClient(uri);
  await client.connect();
  return { client, db: client.db(dbName), uri };
}

/**
 * Create the indexes the app reads against. Idempotent (createIndex is a no-op
 * if the index already exists), so it's safe to call on every ingest run.
 *   • products.category          — browse's category narrow
 *   • price_observations (product_id, platform, scraped_at desc)
 *                                — the hot "latest observation(s) per product+platform" read
 */
export async function ensureIndexes(db) {
  await db.collection('products').createIndex({ category: 1 });
  await db
    .collection('price_observations')
    .createIndex({ product_id: 1, platform: 1, scraped_at: -1 });
}
