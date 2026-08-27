/**
 * uuid.mjs — deterministic RFC 4122 v5 (SHA-1) UUID from a name string.
 *
 * Zero-dependency (uses only node:crypto). Extracted so the same id scheme is
 * shared by every writer: the server-side ingest (scripts/ingest-jumia.mjs) and
 * the live search-miss API (api/search-miss.ts). Hashing each Jumia product URL
 * under the fixed URL namespace yields a STABLE product id — the same URL always
 * maps to the same document, so re-scraping updates the same row instead of
 * duplicating it, and `/product/:id` deep links never change.
 */
import { createHash } from 'node:crypto';

// RFC 4122 URL namespace — a fixed, standard constant.
export const URL_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

function uuidToBytes(uuid) {
  const hex = uuid.replace(/-/g, '');
  const bytes = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/** Deterministic RFC 4122 v5 (SHA-1) UUID from a name string. */
export function uuidv5(name, namespace = URL_NAMESPACE) {
  const hash = createHash('sha1')
    .update(Buffer.concat([uuidToBytes(namespace), Buffer.from(name, 'utf8')]))
    .digest();
  const b = hash.subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50; // version 5
  b[8] = (b[8] & 0x3f) | 0x80; // variant RFC 4122
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
