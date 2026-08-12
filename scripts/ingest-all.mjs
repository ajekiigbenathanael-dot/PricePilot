/**
 * ingest-all.mjs — the scheduled BATCH ingest.
 *
 * Reads scripts/ingest-targets.json (a curated list of { q, category, limit? }
 * search targets) and runs each one through the exact same write path the manual
 * CLI uses — ingestSearch() in scripts/ingest-jumia.mjs — with the service_role
 * key from the environment. This is what the GitHub Actions cron invokes
 * (.github/workflows/ingest.yml) to build up real price history over time.
 *
 * Design:
 *   • SEQUENTIAL, one target at a time. The scraper already paces its own
 *     requests (~66 rpm); running targets sequentially keeps that global "one
 *     request at a time" courtesy instead of bursting the source from parallel
 *     workers, and adds a short pause between targets.
 *   • RESILIENT. One bad query (no results, a transient block) must not fail the
 *     whole run and discard the good data. Each target is caught independently;
 *     the process exits non-zero ONLY if every target failed — a signal worth
 *     alerting on (bad credentials, source blocking us, missing migrations).
 *
 * Env: SUPABASE_URL (or VITE_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY, read
 * directly from process.env — so it works both locally (`npm run ingest:all`,
 * which supplies --env-file=.env) and in CI (env injected from repo secrets).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { createIngestClient, ingestSearch, CATEGORY_SLUGS } from './ingest-jumia.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TARGETS_PATH = join(HERE, 'ingest-targets.json');

// A brief pause between targets, on top of the scraper's per-request pacing —
// keeps the whole batch gentle on the source.
const BETWEEN_TARGETS_MS = 2000;

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function loadTargets() {
  let raw;
  try {
    raw = readFileSync(TARGETS_PATH, 'utf8');
  } catch (err) {
    fail(`could not read ${TARGETS_PATH}: ${err.message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    fail(`${TARGETS_PATH} is not valid JSON: ${err.message}`);
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    fail(`${TARGETS_PATH} must be a non-empty JSON array of { q, category, limit? }.`);
  }
  return parsed;
}

/** Validate a target's shape up front, so a typo fails cleanly without a fetch. */
function targetError(t, i) {
  const n = i + 1;
  if (typeof t !== 'object' || t === null) return `target #${n} is not an object`;
  if (typeof t.q !== 'string' || !t.q.trim()) return `target #${n} is missing a non-empty "q"`;
  if (typeof t.category !== 'string' || !CATEGORY_SLUGS.includes(t.category)) {
    return `target #${n} ("${t.q}") has invalid category "${t.category}". Valid: ${CATEGORY_SLUGS.join(', ')}`;
  }
  if (t.limit !== undefined && (!Number.isInteger(t.limit) || t.limit < 1)) {
    return `target #${n} ("${t.q}") has invalid limit "${t.limit}" (must be a positive integer)`;
  }
  return null;
}

function describeTarget(t) {
  if (t && typeof t === 'object') return `"${t.q ?? '?'}" (${t.category ?? '?'})`;
  return JSON.stringify(t);
}

async function main() {
  const targets = loadTargets();
  const { client, url } = createIngestClient();

  console.log(`\nPricePilot · scheduled batch ingest`);
  console.log(`targets : ${targets.length}`);
  console.log(`target  : ${url}`);

  const succeeded = [];
  const failed = [];

  for (const [i, t] of targets.entries()) {
    const invalid = targetError(t, i);
    if (invalid) {
      console.error(`\n✖ skipping ${invalid}\n`);
      failed.push({ target: t, error: invalid });
      continue;
    }

    console.log(`\n──────────────────────────────────────────────────────────`);
    console.log(`[${i + 1}/${targets.length}] "${t.q}" → ${t.category}`);

    try {
      // supabaseUrl is omitted on purpose — the batch header already printed the
      // target, so each per-target block stays tighter.
      const summary = await ingestSearch({ client, keyword: t.q, category: t.category, limit: t.limit });
      succeeded.push(summary);
    } catch (err) {
      console.error(`\n✖ "${t.q}" (${t.category}) failed: ${err.message}\n`);
      failed.push({ target: t, error: err.message });
    }

    // Be gentle: brief pause before the next target (skip after the last).
    if (i < targets.length - 1) await sleep(BETWEEN_TARGETS_MS);
  }

  /* -------------------------------------------------------------- tally --- */
  const foundTotal = succeeded.reduce((n, s) => n + s.found, 0);
  const obsTotal = succeeded.reduce((n, s) => n + s.observations, 0);

  console.log(`\n══════════════════════════════════════════════════════════`);
  console.log(
    `Batch complete: ${succeeded.length} ok, ${failed.length} failed of ${targets.length} target(s).`,
  );
  console.log(`Products found: ${foundTotal}  ·  observations logged: ${obsTotal}.`);
  if (failed.length) {
    console.log(`\nFailed targets:`);
    for (const f of failed) console.log(`  · ${describeTarget(f.target)} — ${f.error}`);
  }
  console.log('');

  // Fail (exit 1) only when EVERY target failed — otherwise a single bad query
  // would sink the whole cron and throw away the observations we did collect.
  if (succeeded.length === 0) process.exit(1);
}

main().catch((err) => {
  console.error(`\n✖ batch ingest crashed: ${err.message}\n`);
  process.exit(1);
});
