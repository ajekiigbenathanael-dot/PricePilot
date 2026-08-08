import fs from 'node:fs';

// Read the TS source and extract the FEATURED_PRODUCTS array literal, then eval
// it as plain data so the seed can NEVER drift from sampleProducts.ts.
const src = fs.readFileSync('src/lib/sampleProducts.ts', 'utf8');
// Anchor on the assignment so we skip the `Product[]` type annotation's brackets.
const assignAt = src.indexOf('FEATURED_PRODUCTS: Product[] =');
const start = src.indexOf('[', src.indexOf('=', assignAt));
let depth = 0;
let end = -1;
for (let i = start; i < src.length; i++) {
  const c = src[i];
  if (c === '[') depth++;
  else if (c === ']') {
    depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }
}
const arrLit = src.slice(start, end + 1);
// eslint-disable-next-line no-eval
const products = eval('(' + arrLit + ')');

const esc = (s) => String(s).replace(/'/g, "''");
const jsonCol = (obj) => "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";

const rows = products
  .map((p) => {
    const offers = p.offers.map((o) => ({
      platform: o.platform,
      retailer: o.retailer,
      price: o.price,
      shipping: o.shipping,
      inStock: o.inStock,
      url: o.url,
    }));
    const img = p.image_url === null ? 'null' : "'" + esc(p.image_url) + "'";
    return [
      '(',
      "  '" + p.id + "',",
      "  '" + esc(p.title) + "', '" + p.category + "', '" + esc(p.brand) + "',",
      '  ' + img + ',',
      "  '" + esc(p.description) + "',",
      '  ' + p.lowest_price + ',',
      '  ' + jsonCol(offers) + ',',
      '  ' + jsonCol(p.price_history) + ',',
      '  ' + jsonCol(p.price_events),
      ')',
    ].join('\n');
  })
  .join(',\n');

const header = [
  '-- PricePilot — sample catalog seed (dev data only, no real ingestion yet).',
  '-- Products are public. Prices are realistic Nigerian street value in Naira.',
  '-- Offers are per-platform (Jumia/Konga/Slot/PayPorte/Temu); a platform that',
  '-- does not carry an item is simply absent ("Not listed") — never a fake price.',
  '-- Retailer links are store search URLs (not fabricated product pages).',
  '-- lowest_price = min(price + shipping) across in-stock offers.',
  '-- Fixed UUIDs + upsert => safe to re-run without breaking wishlist/alert refs.',
  '-- Run with the service_role key (RLS blocks anon/authenticated writes).',
  '-- Requires migration 0003 (widened category CHECK) to be applied first.',
  '-- GENERATED from src/lib/sampleProducts.ts by scripts/gen-seed.mjs — do not edit by hand.',
  '',
  'insert into public.products',
  '  (id, title, category, brand, image_url, description, lowest_price, offers, price_history, price_events)',
  'values',
  '',
].join('\n');

const footer = [
  '',
  'on conflict (id) do update set',
  '  title         = excluded.title,',
  '  category      = excluded.category,',
  '  brand         = excluded.brand,',
  '  image_url     = excluded.image_url,',
  '  description   = excluded.description,',
  '  lowest_price  = excluded.lowest_price,',
  '  offers        = excluded.offers,',
  '  price_history = excluded.price_history,',
  '  price_events  = excluded.price_events,',
  '  updated_at    = now();',
  '',
].join('\n');

fs.writeFileSync('supabase/seed.sql', header + rows + footer, 'utf8');
console.log('seed.sql written:', products.length, 'products');
