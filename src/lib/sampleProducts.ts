import type { Product } from '@/types';

/**
 * Illustrative product data for the marketing landing page (hero comparison +
 * "trending deals"). Mirrors a subset of `supabase/seed.sql` — same IDs, so the
 * cards deep-link correctly to `/product/:id` once the catalog is live.
 *
 * Pricing is realistic Nigerian street value in Naira (₦) as of mid-2026.
 * Offers follow the platform reality rule:
 *   - Slot carries phones/laptops/electronics, NOT books or fashion — omitted.
 *   - PayPorte carries fashion/phones/general goods, NOT textbooks — omitted.
 *   - Temu ships accessories, dorm gear and small electronics — books, phones
 *     and large laptops realistically don't appear — omitted.
 *   - Never a fake price: "Not listed" is simply an absent offer.
 * `price_events` power the "live" card ticker; `price_history` the sparkline.
 */
export const FEATURED_PRODUCTS: Product[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Sony WH-1000XM4 Wireless Noise-Cancelling Headphones',
    category: 'electronics',
    brand: 'Sony',
    image_url:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    description:
      'Industry-leading noise-cancelling over-ear headphones with 30-hour battery — a library and hostel staple.',
    lowest_price: 385000,
    offers: [
      { platform: 'jumia', retailer: 'Jumia', price: 385000, shipping: 0, inStock: true, url: 'https://www.jumia.com.ng/catalog/?q=sony+wh-1000xm4' },
      { platform: 'konga', retailer: 'Konga', price: 399000, shipping: 0, inStock: true, url: 'https://www.konga.com/search?search=sony%20wh-1000xm4' },
      { platform: 'slot', retailer: 'Slot', price: 410000, shipping: 0, inStock: true, url: 'https://slot.ng/?s=sony+wh-1000xm4&post_type=product' },
      { platform: 'temu', retailer: 'Temu', price: 296000, shipping: 7500, inStock: true, url: 'https://www.temu.com/search_result.html?search_key=sony%20wh-1000xm4' },
    ],
    price_history: [
      { date: '2026-04-01', price: 429000 },
      { date: '2026-05-01', price: 418000 },
      { date: '2026-06-01', price: 405000 },
      { date: '2026-07-01', price: 394000 },
      { date: '2026-08-01', price: 385000 },
    ],
    price_events: [
      { platform: 'temu', retailer: 'Temu', direction: 'down', delta: 12000, minutesAgo: 195 },
      { platform: 'jumia', retailer: 'Jumia', direction: 'down', delta: 8000, minutesAgo: 1440 },
      { platform: 'konga', retailer: 'Konga', direction: 'up', delta: 5000, minutesAgo: 2880 },
    ],
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-08-08T09:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    title: 'Tecno Spark 20 (4GB/128GB) — Dual SIM',
    category: 'phones',
    brand: 'Tecno',
    image_url:
      'https://images.unsplash.com/photo-1511707171634-5c897ff02aa9?auto=format&fit=crop&w=800&q=80',
    description:
      'The best-selling budget Android in Nigeria — big battery, dual SIM, and a screen that survives lecture halls.',
    lowest_price: 167000,
    offers: [
      { platform: 'jumia', retailer: 'Jumia', price: 167000, shipping: 0, inStock: true, url: 'https://www.jumia.com.ng/catalog/?q=tecno+spark+20' },
      { platform: 'konga', retailer: 'Konga', price: 169900, shipping: 0, inStock: true, url: 'https://www.konga.com/search?search=tecno%20spark%2020' },
      { platform: 'slot', retailer: 'Slot', price: 171000, shipping: 0, inStock: true, url: 'https://slot.ng/?s=tecno+spark+20&post_type=product' },
      { platform: 'payporte', retailer: 'PayPorte', price: 172500, shipping: 0, inStock: true, url: 'https://www.payporte.com/catalogsearch/result/?q=tecno%20spark%2020' },
    ],
    price_history: [
      { date: '2026-04-01', price: 179000 },
      { date: '2026-05-01', price: 175000 },
      { date: '2026-06-01', price: 172500 },
      { date: '2026-07-01', price: 169000 },
      { date: '2026-08-01', price: 167000 },
    ],
    price_events: [
      { platform: 'konga', retailer: 'Konga', direction: 'down', delta: 2500, minutesAgo: 95 },
      { platform: 'jumia', retailer: 'Jumia', direction: 'down', delta: 2000, minutesAgo: 4310 },
    ],
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-08-08T09:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    title: 'HP 15 Laptop — Intel Core i5 / 8GB RAM / 512GB SSD',
    category: 'laptops',
    brand: 'HP',
    image_url:
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
    description:
      'A dependable 15.6-inch workhorse for assignments, research and light coding — the most-bought student laptop.',
    lowest_price: 615000,
    offers: [
      { platform: 'jumia', retailer: 'Jumia', price: 615000, shipping: 0, inStock: true, url: 'https://www.jumia.com.ng/catalog/?q=hp+15+laptop+i5' },
      { platform: 'konga', retailer: 'Konga', price: 629000, shipping: 0, inStock: true, url: 'https://www.konga.com/search?search=hp%2015%20laptop%20i5' },
      { platform: 'slot', retailer: 'Slot', price: 642000, shipping: 0, inStock: true, url: 'https://slot.ng/?s=hp+15+laptop+i5&post_type=product' },
    ],
    price_history: [
      { date: '2026-04-01', price: 668000 },
      { date: '2026-05-01', price: 652000 },
      { date: '2026-06-01', price: 640000 },
      { date: '2026-07-01', price: 628000 },
      { date: '2026-08-01', price: 615000 },
    ],
    price_events: [
      { platform: 'jumia', retailer: 'Jumia', direction: 'down', delta: 9000, minutesAgo: 215 },
      { platform: 'slot', retailer: 'Slot', direction: 'down', delta: 6000, minutesAgo: 2890 },
    ],
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-08-08T09:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    title: 'Power Bank 20,000mAh Fast Charging (Dual USB)',
    category: 'accessories',
    brand: 'Oraimo',
    image_url:
      'https://images.unsplash.com/photo-1609091839311-d1315f9e8c0d?auto=format&fit=crop&w=800&q=80',
    description:
      'Two full phone charges for blackout nights and power cuts — the hostel essential that never loses charge.',
    lowest_price: 18500,
    offers: [
      { platform: 'jumia', retailer: 'Jumia', price: 18500, shipping: 1000, inStock: true, url: 'https://www.jumia.com.ng/catalog/?q=oraimo+power+bank+20000mah' },
      { platform: 'konga', retailer: 'Konga', price: 19500, shipping: 1000, inStock: true, url: 'https://www.konga.com/search?search=power%20bank%2020000mah' },
      { platform: 'temu', retailer: 'Temu', price: 14900, shipping: 2500, inStock: true, url: 'https://www.temu.com/search_result.html?search_key=power%20bank%2020000mah' },
      { platform: 'payporte', retailer: 'PayPorte', price: 22000, shipping: 0, inStock: true, url: 'https://www.payporte.com/catalogsearch/result/?q=power%20bank' },
    ],
    price_history: [
      { date: '2026-04-01', price: 22000 },
      { date: '2026-05-01', price: 21000 },
      { date: '2026-06-01', price: 20000 },
      { date: '2026-07-01', price: 19000 },
      { date: '2026-08-01', price: 18500 },
    ],
    price_events: [
      { platform: 'temu', retailer: 'Temu', direction: 'down', delta: 1500, minutesAgo: 45 },
      { platform: 'jumia', retailer: 'Jumia', direction: 'down', delta: 1000, minutesAgo: 1490 },
    ],
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-08-08T09:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    title: 'Calculus: Early Transcendentals (8th Edition)',
    category: 'textbooks',
    brand: 'Cengage',
    image_url: null,
    description:
      'Stewart’s calculus text for the full engineering/math sequence. Buying used slashes the semester cost.',
    lowest_price: 12500,
    offers: [
      { platform: 'jumia', retailer: 'Jumia', price: 12500, shipping: 1000, inStock: true, url: 'https://www.jumia.com.ng/catalog/?q=stewart+calculus+8th+edition' },
      { platform: 'konga', retailer: 'Konga', price: 13500, shipping: 1000, inStock: true, url: 'https://www.konga.com/search?search=stewart%20calculus' },
    ],
    price_history: [
      { date: '2026-04-01', price: 14500 },
      { date: '2026-05-01', price: 14000 },
      { date: '2026-06-01', price: 13500 },
      { date: '2026-07-01', price: 13000 },
      { date: '2026-08-01', price: 12500 },
    ],
    price_events: [
      { platform: 'jumia', retailer: 'Jumia', direction: 'down', delta: 500, minutesAgo: 250 },
    ],
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-08-08T09:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    title: 'Logitech Wireless Mouse M170 (Black)',
    category: 'accessories',
    brand: 'Logitech',
    image_url:
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80',
    description:
      'A reliable 2.4GHz wireless mouse with one-year battery life — small price, huge QoL for late-night typing.',
    lowest_price: 9500,
    offers: [
      { platform: 'jumia', retailer: 'Jumia', price: 9500, shipping: 1000, inStock: true, url: 'https://www.jumia.com.ng/catalog/?q=logitech+m170' },
      { platform: 'konga', retailer: 'Konga', price: 10000, shipping: 1000, inStock: true, url: 'https://www.konga.com/search?search=logitech%20m170' },
      { platform: 'slot', retailer: 'Slot', price: 11000, shipping: 0, inStock: true, url: 'https://slot.ng/?s=logitech+m170&post_type=product' },
      { platform: 'temu', retailer: 'Temu', price: 6900, shipping: 1500, inStock: true, url: 'https://www.temu.com/search_result.html?search_key=logitech%20mouse' },
    ],
    price_history: [
      { date: '2026-04-01', price: 11000 },
      { date: '2026-05-01', price: 10500 },
      { date: '2026-06-01', price: 10000 },
      { date: '2026-07-01', price: 9800 },
      { date: '2026-08-01', price: 9500 },
    ],
    price_events: [
      { platform: 'temu', retailer: 'Temu', direction: 'down', delta: 900, minutesAgo: 120 },
    ],
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-08-08T09:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000007',
    title: 'Canon PIXMA G3410 Wireless Printer',
    category: 'electronics',
    brand: 'Canon',
    image_url:
      'https://images.unsplash.com/photo-1588872657578-7a4261e6e85f?auto=format&fit=crop&w=800&q=80',
    description:
      'Refillable ink-tank printer that brings cost-per-page way down — project reports without the print-shop markup.',
    lowest_price: 255000,
    offers: [
      { platform: 'jumia', retailer: 'Jumia', price: 255000, shipping: 0, inStock: true, url: 'https://www.jumia.com.ng/catalog/?q=canon+pixma+g3410' },
      { platform: 'konga', retailer: 'Konga', price: 262000, shipping: 0, inStock: true, url: 'https://www.konga.com/search?search=canon%20pixma%20g3410' },
      { platform: 'slot', retailer: 'Slot', price: 269000, shipping: 0, inStock: true, url: 'https://slot.ng/?s=canon+pixma+g3410&post_type=product' },
    ],
    price_history: [
      { date: '2026-04-01', price: 279000 },
      { date: '2026-05-01', price: 272000 },
      { date: '2026-06-01', price: 266000 },
      { date: '2026-07-01', price: 260000 },
      { date: '2026-08-01', price: 255000 },
    ],
    price_events: [
      { platform: 'konga', retailer: 'Konga', direction: 'down', delta: 4000, minutesAgo: 310 },
    ],
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-08-08T09:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000008',
    title: 'Nike Air Force 1 Low (White)',
    category: 'fashion',
    brand: 'Nike',
    image_url:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    description:
      'The classic white sneaker that pairs with everything — campus uniform for a reason.',
    lowest_price: 75000,
    offers: [
      { platform: 'jumia', retailer: 'Jumia', price: 75000, shipping: 0, inStock: true, url: 'https://www.jumia.com.ng/catalog/?q=nike+air+force+1' },
      { platform: 'konga', retailer: 'Konga', price: 78000, shipping: 0, inStock: true, url: 'https://www.konga.com/search?search=nike%20air%20force%201' },
      { platform: 'payporte', retailer: 'PayPorte', price: 82000, shipping: 0, inStock: true, url: 'https://www.payporte.com/catalogsearch/result/?q=nike%20air%20force%201' },
    ],
    price_history: [
      { date: '2026-04-01', price: 84000 },
      { date: '2026-05-01', price: 82000 },
      { date: '2026-06-01', price: 80000 },
      { date: '2026-07-01', price: 78000 },
      { date: '2026-08-01', price: 75000 },
    ],
    price_events: [
      { platform: 'jumia', retailer: 'Jumia', direction: 'down', delta: 3000, minutesAgo: 175 },
    ],
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-08-08T09:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000009',
    title: 'Digital Thermometer (Non-Contact Infrared)',
    category: 'health',
    brand: 'Omron',
    image_url:
      'https://images.unsplash.com/photo-1583911860205-72f8ac8ddcbe?auto=format&fit=crop&w=800&q=80',
    description:
      'Instant forehead temperature reading — the first thing you reach for in a hostel fever scare.',
    lowest_price: 6500,
    offers: [
      { platform: 'jumia', retailer: 'Jumia', price: 6500, shipping: 800, inStock: true, url: 'https://www.jumia.com.ng/catalog/?q=infrared+thermometer' },
      { platform: 'konga', retailer: 'Konga', price: 7000, shipping: 800, inStock: true, url: 'https://www.konga.com/search?search=infrared%20thermometer' },
      { platform: 'temu', retailer: 'Temu', price: 5900, shipping: 1000, inStock: true, url: 'https://www.temu.com/search_result.html?search_key=thermometer' },
    ],
    price_history: [
      { date: '2026-04-01', price: 8000 },
      { date: '2026-05-01', price: 7600 },
      { date: '2026-06-01', price: 7200 },
      { date: '2026-07-01', price: 6900 },
      { date: '2026-08-01', price: 6500 },
    ],
    price_events: [
      { platform: 'temu', retailer: 'Temu', direction: 'down', delta: 600, minutesAgo: 90 },
    ],
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-08-08T09:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000010',
    title: 'JanSport Big Student Backpack',
    category: 'bags',
    brand: 'JanSport',
    image_url:
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    description:
      'The 34L campus classic — padded laptop sleeve, two main compartments, and a warranty that outlasts the degree.',
    lowest_price: 48000,
    offers: [
      { platform: 'jumia', retailer: 'Jumia', price: 48000, shipping: 0, inStock: true, url: 'https://www.jumia.com.ng/catalog/?q=jansport+big+student' },
      { platform: 'konga', retailer: 'Konga', price: 50000, shipping: 0, inStock: true, url: 'https://www.konga.com/search?search=jansport%20big%20student' },
      { platform: 'temu', retailer: 'Temu', price: 39000, shipping: 4500, inStock: true, url: 'https://www.temu.com/search_result.html?search_key=jansport%20backpack' },
      { platform: 'payporte', retailer: 'PayPorte', price: 52000, shipping: 0, inStock: true, url: 'https://www.payporte.com/catalogsearch/result/?q=jansport%20backpack' },
    ],
    price_history: [
      { date: '2026-04-01', price: 55000 },
      { date: '2026-05-01', price: 53000 },
      { date: '2026-06-01', price: 51000 },
      { date: '2026-07-01', price: 49500 },
      { date: '2026-08-01', price: 48000 },
    ],
    price_events: [
      { platform: 'temu', retailer: 'Temu', direction: 'down', delta: 3000, minutesAgo: 140 },
    ],
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-08-08T09:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000011',
    title: 'Apteka Adjustable Laptop Stand (Aluminium)',
    category: 'laptops',
    brand: 'Apteka',
    image_url:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
    description:
      'Aluminium riser that lifts a laptop to eye level — kinder to your neck through long study sessions.',
    lowest_price: 21000,
    offers: [
      { platform: 'jumia', retailer: 'Jumia', price: 21000, shipping: 1000, inStock: true, url: 'https://www.jumia.com.ng/catalog/?q=adjustable+laptop+stand' },
      { platform: 'konga', retailer: 'Konga', price: 22000, shipping: 1000, inStock: true, url: 'https://www.konga.com/search?search=adjustable%20laptop%20stand' },
      { platform: 'slot', retailer: 'Slot', price: 24000, shipping: 0, inStock: true, url: 'https://slot.ng/?s=laptop+stand&post_type=product' },
      { platform: 'temu', retailer: 'Temu', price: 17500, shipping: 2500, inStock: true, url: 'https://www.temu.com/search_result.html?search_key=laptop%20stand' },
    ],
    price_history: [
      { date: '2026-04-01', price: 26000 },
      { date: '2026-05-01', price: 24500 },
      { date: '2026-06-01', price: 23500 },
      { date: '2026-07-01', price: 22000 },
      { date: '2026-08-01', price: 21000 },
    ],
    price_events: [
      { platform: 'temu', retailer: 'Temu', direction: 'down', delta: 1500, minutesAgo: 210 },
    ],
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-08-08T09:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000012',
    title: 'Xiaomi Smart Band 8 Pro (Black)',
    category: 'electronics',
    brand: 'Xiaomi',
    image_url:
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80',
    description:
      'Heart rate, sleep and notifications on your wrist — a fraction of the price of a flagship watch.',
    lowest_price: 34000,
    offers: [
      { platform: 'jumia', retailer: 'Jumia', price: 34000, shipping: 1000, inStock: true, url: 'https://www.jumia.com.ng/catalog/?q=xiaomi+smart+band+8+pro' },
      { platform: 'konga', retailer: 'Konga', price: 36000, shipping: 1000, inStock: true, url: 'https://www.konga.com/search?search=xiaomi%20smart%20band' },
      { platform: 'temu', retailer: 'Temu', price: 29000, shipping: 3000, inStock: true, url: 'https://www.temu.com/search_result.html?search_key=xiaomi%20smart%20band' },
      { platform: 'slot', retailer: 'Slot', price: 38000, shipping: 0, inStock: true, url: 'https://slot.ng/?s=xiaomi+band&post_type=product' },
    ],
    price_history: [
      { date: '2026-04-01', price: 42000 },
      { date: '2026-05-01', price: 40000 },
      { date: '2026-06-01', price: 38000 },
      { date: '2026-07-01', price: 36000 },
      { date: '2026-08-01', price: 34000 },
    ],
    price_events: [
      { platform: 'temu', retailer: 'Temu', direction: 'down', delta: 2000, minutesAgo: 330 },
      { platform: 'slot', retailer: 'Slot', direction: 'down', delta: 1500, minutesAgo: 2880 },
    ],
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-08-08T09:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000013',
    title: '65W USB-C Laptop Charger (GaN Fast Charger + Cable)',
    category: 'accessories',
    brand: 'Oraimo',
    image_url:
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
    description:
      'Universal 65W USB-C GaN power adapter that fast-charges most laptops and phones — the spare charger every student loses and re-buys.',
    lowest_price: 12400,
    offers: [
      { platform: 'jumia', retailer: 'Jumia', price: 12500, shipping: 1000, inStock: true, url: 'https://www.jumia.com.ng/catalog/?q=65w+usb-c+laptop+charger' },
      { platform: 'konga', retailer: 'Konga', price: 13500, shipping: 1000, inStock: true, url: 'https://www.konga.com/search?search=65w%20usb-c%20laptop%20charger' },
      { platform: 'slot', retailer: 'Slot', price: 14000, shipping: 0, inStock: true, url: 'https://slot.ng/?s=65w+laptop+charger&post_type=product' },
      { platform: 'temu', retailer: 'Temu', price: 9900, shipping: 2500, inStock: true, url: 'https://www.temu.com/search_result.html?search_key=65w%20usb-c%20laptop%20charger' },
    ],
    price_history: [
      { date: '2026-04-01', price: 15000 },
      { date: '2026-05-01', price: 14500 },
      { date: '2026-06-01', price: 14000 },
      { date: '2026-07-01', price: 13000 },
      { date: '2026-08-01', price: 12500 },
    ],
    price_events: [
      { platform: 'temu', retailer: 'Temu', direction: 'down', delta: 1500, minutesAgo: 65 },
      { platform: 'jumia', retailer: 'Jumia', direction: 'down', delta: 500, minutesAgo: 1580 },
    ],
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-08-08T09:00:00Z',
  },
];

/** The headline product in the hero — biggest, most student-relatable saving. */
export const HERO_PRODUCT: Product = FEATURED_PRODUCTS[0];
