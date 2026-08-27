/**
 * THROWAWAY probe (delete after use): fetch real Jumia product pages with our
 * honest UA and dump where category info lives in their JSON-LD, so we can wire
 * a real category into scrapeProduct(). One request per page, spaced politely.
 */
import { setTimeout as sleep } from 'node:timers/promises';
import { UA } from './scrape-jumia.mjs';

const URLS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      // a real phone
      'https://www.jumia.com.ng/hot-50-6.78-8gb-ram256gb-rom-android-14-5000mah-green-infinix-mpg11971476.html',
      // a phone case (accessory) — should classify differently than the phone
      'https://www.jumia.com.ng/generic-infinix-hot-60i-quality-flip-case-419212966.html',
    ];

function ldNodes(html) {
  const blocks = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].map((m) => m[1].trim());
  const nodes = [];
  for (const b of blocks) {
    try {
      const p = JSON.parse(b);
      if (Array.isArray(p)) nodes.push(...p);
      else if (Array.isArray(p['@graph'])) nodes.push(...p['@graph']);
      else nodes.push(p);
    } catch (e) {
      console.log('  (unparseable ld+json block):', e.message);
    }
  }
  return { nodes, blockCount: blocks.length };
}

for (const url of URLS) {
  console.log('\n============================================================');
  console.log('URL:', url);
  const res = await fetch(url, {
    headers: { 'user-agent': UA, 'accept-language': 'en-NG,en;q=0.9' },
    redirect: 'follow',
  });
  console.log('HTTP', res.status, '→', res.url);
  if (!res.ok) {
    await sleep(1000);
    continue;
  }
  const html = await res.text();
  const { nodes, blockCount } = ldNodes(html);
  console.log('ld+json blocks:', blockCount, '| nodes:', nodes.length);

  for (const n of nodes) {
    const t = n && n['@type'];
    const isProduct = t === 'Product' || (Array.isArray(t) && t.includes('Product'));
    const isCrumbs = t === 'BreadcrumbList' || (Array.isArray(t) && t.includes('BreadcrumbList'));
    if (isProduct) {
      console.log('  [Product] keys:', Object.keys(n).join(', '));
      console.log('  [Product] category:', JSON.stringify(n.category));
    } else if (isCrumbs) {
      const trail = (n.itemListElement || []).map(
        (el) => el?.name ?? el?.item?.name ?? null,
      );
      console.log('  [BreadcrumbList] trail:', JSON.stringify(trail));
    } else {
      console.log('  [' + JSON.stringify(t) + ']');
    }
  }
  await sleep(1000);
}
