-- PricePilot — sample catalog seed (dev data only, no real ingestion yet).
-- Products are public. Prices are realistic Nigerian street value in Naira.
-- Offers are per-platform (Jumia/Konga/Slot/PayPorte/Temu); a platform that
-- does not carry an item is simply absent ("Not listed") — never a fake price.
-- Retailer links are store search URLs (not fabricated product pages).
-- lowest_price = min(price + shipping) across in-stock offers.
-- Fixed UUIDs + upsert => safe to re-run without breaking wishlist/alert refs.
-- Run with the service_role key (RLS blocks anon/authenticated writes).
-- Requires migration 0003 (widened category CHECK) to be applied first.
-- GENERATED from src/lib/sampleProducts.ts by scripts/gen-seed.mjs — do not edit by hand.

insert into public.products
  (id, title, category, brand, image_url, description, lowest_price, offers, price_history, price_events)
values
(
  '00000000-0000-4000-8000-000000000001',
  'Sony WH-1000XM4 Wireless Noise-Cancelling Headphones', 'electronics', 'Sony',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
  'Industry-leading noise-cancelling over-ear headphones with 30-hour battery — a library and hostel staple.',
  385000,
  '[{"platform":"jumia","retailer":"Jumia","price":385000,"shipping":0,"inStock":true,"url":"https://www.jumia.com.ng/catalog/?q=sony+wh-1000xm4"},{"platform":"konga","retailer":"Konga","price":399000,"shipping":0,"inStock":true,"url":"https://www.konga.com/search?search=sony%20wh-1000xm4"},{"platform":"slot","retailer":"Slot","price":410000,"shipping":0,"inStock":true,"url":"https://slot.ng/?s=sony+wh-1000xm4&post_type=product"},{"platform":"temu","retailer":"Temu","price":296000,"shipping":7500,"inStock":true,"url":"https://www.temu.com/search_result.html?search_key=sony%20wh-1000xm4"}]'::jsonb,
  '[{"date":"2026-04-01","price":429000},{"date":"2026-05-01","price":418000},{"date":"2026-06-01","price":405000},{"date":"2026-07-01","price":394000},{"date":"2026-08-01","price":385000}]'::jsonb,
  '[{"platform":"temu","retailer":"Temu","direction":"down","delta":12000,"minutesAgo":195},{"platform":"jumia","retailer":"Jumia","direction":"down","delta":8000,"minutesAgo":1440},{"platform":"konga","retailer":"Konga","direction":"up","delta":5000,"minutesAgo":2880}]'::jsonb
),
(
  '00000000-0000-4000-8000-000000000002',
  'Tecno Spark 20 (4GB/128GB) — Dual SIM', 'phones', 'Tecno',
  'https://images.unsplash.com/photo-1511707171634-5c897ff02aa9?auto=format&fit=crop&w=800&q=80',
  'The best-selling budget Android in Nigeria — big battery, dual SIM, and a screen that survives lecture halls.',
  167000,
  '[{"platform":"jumia","retailer":"Jumia","price":167000,"shipping":0,"inStock":true,"url":"https://www.jumia.com.ng/catalog/?q=tecno+spark+20"},{"platform":"konga","retailer":"Konga","price":169900,"shipping":0,"inStock":true,"url":"https://www.konga.com/search?search=tecno%20spark%2020"},{"platform":"slot","retailer":"Slot","price":171000,"shipping":0,"inStock":true,"url":"https://slot.ng/?s=tecno+spark+20&post_type=product"},{"platform":"payporte","retailer":"PayPorte","price":172500,"shipping":0,"inStock":true,"url":"https://www.payporte.com/catalogsearch/result/?q=tecno%20spark%2020"}]'::jsonb,
  '[{"date":"2026-04-01","price":179000},{"date":"2026-05-01","price":175000},{"date":"2026-06-01","price":172500},{"date":"2026-07-01","price":169000},{"date":"2026-08-01","price":167000}]'::jsonb,
  '[{"platform":"konga","retailer":"Konga","direction":"down","delta":2500,"minutesAgo":95},{"platform":"jumia","retailer":"Jumia","direction":"down","delta":2000,"minutesAgo":4310}]'::jsonb
),
(
  '00000000-0000-4000-8000-000000000003',
  'HP 15 Laptop — Intel Core i5 / 8GB RAM / 512GB SSD', 'laptops', 'HP',
  'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
  'A dependable 15.6-inch workhorse for assignments, research and light coding — the most-bought student laptop.',
  615000,
  '[{"platform":"jumia","retailer":"Jumia","price":615000,"shipping":0,"inStock":true,"url":"https://www.jumia.com.ng/catalog/?q=hp+15+laptop+i5"},{"platform":"konga","retailer":"Konga","price":629000,"shipping":0,"inStock":true,"url":"https://www.konga.com/search?search=hp%2015%20laptop%20i5"},{"platform":"slot","retailer":"Slot","price":642000,"shipping":0,"inStock":true,"url":"https://slot.ng/?s=hp+15+laptop+i5&post_type=product"}]'::jsonb,
  '[{"date":"2026-04-01","price":668000},{"date":"2026-05-01","price":652000},{"date":"2026-06-01","price":640000},{"date":"2026-07-01","price":628000},{"date":"2026-08-01","price":615000}]'::jsonb,
  '[{"platform":"jumia","retailer":"Jumia","direction":"down","delta":9000,"minutesAgo":215},{"platform":"slot","retailer":"Slot","direction":"down","delta":6000,"minutesAgo":2890}]'::jsonb
),
(
  '00000000-0000-4000-8000-000000000004',
  'Power Bank 20,000mAh Fast Charging (Dual USB)', 'accessories', 'Oraimo',
  'https://images.unsplash.com/photo-1609091839311-d1315f9e8c0d?auto=format&fit=crop&w=800&q=80',
  'Two full phone charges for blackout nights and power cuts — the hostel essential that never loses charge.',
  18500,
  '[{"platform":"jumia","retailer":"Jumia","price":18500,"shipping":1000,"inStock":true,"url":"https://www.jumia.com.ng/catalog/?q=oraimo+power+bank+20000mah"},{"platform":"konga","retailer":"Konga","price":19500,"shipping":1000,"inStock":true,"url":"https://www.konga.com/search?search=power%20bank%2020000mah"},{"platform":"temu","retailer":"Temu","price":14900,"shipping":2500,"inStock":true,"url":"https://www.temu.com/search_result.html?search_key=power%20bank%2020000mah"},{"platform":"payporte","retailer":"PayPorte","price":22000,"shipping":0,"inStock":true,"url":"https://www.payporte.com/catalogsearch/result/?q=power%20bank"}]'::jsonb,
  '[{"date":"2026-04-01","price":22000},{"date":"2026-05-01","price":21000},{"date":"2026-06-01","price":20000},{"date":"2026-07-01","price":19000},{"date":"2026-08-01","price":18500}]'::jsonb,
  '[{"platform":"temu","retailer":"Temu","direction":"down","delta":1500,"minutesAgo":45},{"platform":"jumia","retailer":"Jumia","direction":"down","delta":1000,"minutesAgo":1490}]'::jsonb
),
(
  '00000000-0000-4000-8000-000000000005',
  'Calculus: Early Transcendentals (8th Edition)', 'textbooks', 'Cengage',
  null,
  'Stewart’s calculus text for the full engineering/math sequence. Buying used slashes the semester cost.',
  12500,
  '[{"platform":"jumia","retailer":"Jumia","price":12500,"shipping":1000,"inStock":true,"url":"https://www.jumia.com.ng/catalog/?q=stewart+calculus+8th+edition"},{"platform":"konga","retailer":"Konga","price":13500,"shipping":1000,"inStock":true,"url":"https://www.konga.com/search?search=stewart%20calculus"}]'::jsonb,
  '[{"date":"2026-04-01","price":14500},{"date":"2026-05-01","price":14000},{"date":"2026-06-01","price":13500},{"date":"2026-07-01","price":13000},{"date":"2026-08-01","price":12500}]'::jsonb,
  '[{"platform":"jumia","retailer":"Jumia","direction":"down","delta":500,"minutesAgo":250}]'::jsonb
),
(
  '00000000-0000-4000-8000-000000000006',
  'Logitech Wireless Mouse M170 (Black)', 'accessories', 'Logitech',
  'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80',
  'A reliable 2.4GHz wireless mouse with one-year battery life — small price, huge QoL for late-night typing.',
  9500,
  '[{"platform":"jumia","retailer":"Jumia","price":9500,"shipping":1000,"inStock":true,"url":"https://www.jumia.com.ng/catalog/?q=logitech+m170"},{"platform":"konga","retailer":"Konga","price":10000,"shipping":1000,"inStock":true,"url":"https://www.konga.com/search?search=logitech%20m170"},{"platform":"slot","retailer":"Slot","price":11000,"shipping":0,"inStock":true,"url":"https://slot.ng/?s=logitech+m170&post_type=product"},{"platform":"temu","retailer":"Temu","price":6900,"shipping":1500,"inStock":true,"url":"https://www.temu.com/search_result.html?search_key=logitech%20mouse"}]'::jsonb,
  '[{"date":"2026-04-01","price":11000},{"date":"2026-05-01","price":10500},{"date":"2026-06-01","price":10000},{"date":"2026-07-01","price":9800},{"date":"2026-08-01","price":9500}]'::jsonb,
  '[{"platform":"temu","retailer":"Temu","direction":"down","delta":900,"minutesAgo":120}]'::jsonb
),
(
  '00000000-0000-4000-8000-000000000007',
  'Canon PIXMA G3410 Wireless Printer', 'electronics', 'Canon',
  'https://images.unsplash.com/photo-1588872657578-7a4261e6e85f?auto=format&fit=crop&w=800&q=80',
  'Refillable ink-tank printer that brings cost-per-page way down — project reports without the print-shop markup.',
  255000,
  '[{"platform":"jumia","retailer":"Jumia","price":255000,"shipping":0,"inStock":true,"url":"https://www.jumia.com.ng/catalog/?q=canon+pixma+g3410"},{"platform":"konga","retailer":"Konga","price":262000,"shipping":0,"inStock":true,"url":"https://www.konga.com/search?search=canon%20pixma%20g3410"},{"platform":"slot","retailer":"Slot","price":269000,"shipping":0,"inStock":true,"url":"https://slot.ng/?s=canon+pixma+g3410&post_type=product"}]'::jsonb,
  '[{"date":"2026-04-01","price":279000},{"date":"2026-05-01","price":272000},{"date":"2026-06-01","price":266000},{"date":"2026-07-01","price":260000},{"date":"2026-08-01","price":255000}]'::jsonb,
  '[{"platform":"konga","retailer":"Konga","direction":"down","delta":4000,"minutesAgo":310}]'::jsonb
),
(
  '00000000-0000-4000-8000-000000000008',
  'Nike Air Force 1 Low (White)', 'fashion', 'Nike',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
  'The classic white sneaker that pairs with everything — campus uniform for a reason.',
  75000,
  '[{"platform":"jumia","retailer":"Jumia","price":75000,"shipping":0,"inStock":true,"url":"https://www.jumia.com.ng/catalog/?q=nike+air+force+1"},{"platform":"konga","retailer":"Konga","price":78000,"shipping":0,"inStock":true,"url":"https://www.konga.com/search?search=nike%20air%20force%201"},{"platform":"payporte","retailer":"PayPorte","price":82000,"shipping":0,"inStock":true,"url":"https://www.payporte.com/catalogsearch/result/?q=nike%20air%20force%201"}]'::jsonb,
  '[{"date":"2026-04-01","price":84000},{"date":"2026-05-01","price":82000},{"date":"2026-06-01","price":80000},{"date":"2026-07-01","price":78000},{"date":"2026-08-01","price":75000}]'::jsonb,
  '[{"platform":"jumia","retailer":"Jumia","direction":"down","delta":3000,"minutesAgo":175}]'::jsonb
),
(
  '00000000-0000-4000-8000-000000000009',
  'Digital Thermometer (Non-Contact Infrared)', 'health', 'Omron',
  'https://images.unsplash.com/photo-1583911860205-72f8ac8ddcbe?auto=format&fit=crop&w=800&q=80',
  'Instant forehead temperature reading — the first thing you reach for in a hostel fever scare.',
  6500,
  '[{"platform":"jumia","retailer":"Jumia","price":6500,"shipping":800,"inStock":true,"url":"https://www.jumia.com.ng/catalog/?q=infrared+thermometer"},{"platform":"konga","retailer":"Konga","price":7000,"shipping":800,"inStock":true,"url":"https://www.konga.com/search?search=infrared%20thermometer"},{"platform":"temu","retailer":"Temu","price":5900,"shipping":1000,"inStock":true,"url":"https://www.temu.com/search_result.html?search_key=thermometer"}]'::jsonb,
  '[{"date":"2026-04-01","price":8000},{"date":"2026-05-01","price":7600},{"date":"2026-06-01","price":7200},{"date":"2026-07-01","price":6900},{"date":"2026-08-01","price":6500}]'::jsonb,
  '[{"platform":"temu","retailer":"Temu","direction":"down","delta":600,"minutesAgo":90}]'::jsonb
),
(
  '00000000-0000-4000-8000-000000000010',
  'JanSport Big Student Backpack', 'bags', 'JanSport',
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
  'The 34L campus classic — padded laptop sleeve, two main compartments, and a warranty that outlasts the degree.',
  48000,
  '[{"platform":"jumia","retailer":"Jumia","price":48000,"shipping":0,"inStock":true,"url":"https://www.jumia.com.ng/catalog/?q=jansport+big+student"},{"platform":"konga","retailer":"Konga","price":50000,"shipping":0,"inStock":true,"url":"https://www.konga.com/search?search=jansport%20big%20student"},{"platform":"temu","retailer":"Temu","price":39000,"shipping":4500,"inStock":true,"url":"https://www.temu.com/search_result.html?search_key=jansport%20backpack"},{"platform":"payporte","retailer":"PayPorte","price":52000,"shipping":0,"inStock":true,"url":"https://www.payporte.com/catalogsearch/result/?q=jansport%20backpack"}]'::jsonb,
  '[{"date":"2026-04-01","price":55000},{"date":"2026-05-01","price":53000},{"date":"2026-06-01","price":51000},{"date":"2026-07-01","price":49500},{"date":"2026-08-01","price":48000}]'::jsonb,
  '[{"platform":"temu","retailer":"Temu","direction":"down","delta":3000,"minutesAgo":140}]'::jsonb
),
(
  '00000000-0000-4000-8000-000000000011',
  'Apteka Adjustable Laptop Stand (Aluminium)', 'laptops', 'Apteka',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
  'Aluminium riser that lifts a laptop to eye level — kinder to your neck through long study sessions.',
  21000,
  '[{"platform":"jumia","retailer":"Jumia","price":21000,"shipping":1000,"inStock":true,"url":"https://www.jumia.com.ng/catalog/?q=adjustable+laptop+stand"},{"platform":"konga","retailer":"Konga","price":22000,"shipping":1000,"inStock":true,"url":"https://www.konga.com/search?search=adjustable%20laptop%20stand"},{"platform":"slot","retailer":"Slot","price":24000,"shipping":0,"inStock":true,"url":"https://slot.ng/?s=laptop+stand&post_type=product"},{"platform":"temu","retailer":"Temu","price":17500,"shipping":2500,"inStock":true,"url":"https://www.temu.com/search_result.html?search_key=laptop%20stand"}]'::jsonb,
  '[{"date":"2026-04-01","price":26000},{"date":"2026-05-01","price":24500},{"date":"2026-06-01","price":23500},{"date":"2026-07-01","price":22000},{"date":"2026-08-01","price":21000}]'::jsonb,
  '[{"platform":"temu","retailer":"Temu","direction":"down","delta":1500,"minutesAgo":210}]'::jsonb
),
(
  '00000000-0000-4000-8000-000000000012',
  'Xiaomi Smart Band 8 Pro (Black)', 'electronics', 'Xiaomi',
  'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80',
  'Heart rate, sleep and notifications on your wrist — a fraction of the price of a flagship watch.',
  34000,
  '[{"platform":"jumia","retailer":"Jumia","price":34000,"shipping":1000,"inStock":true,"url":"https://www.jumia.com.ng/catalog/?q=xiaomi+smart+band+8+pro"},{"platform":"konga","retailer":"Konga","price":36000,"shipping":1000,"inStock":true,"url":"https://www.konga.com/search?search=xiaomi%20smart%20band"},{"platform":"temu","retailer":"Temu","price":29000,"shipping":3000,"inStock":true,"url":"https://www.temu.com/search_result.html?search_key=xiaomi%20smart%20band"},{"platform":"slot","retailer":"Slot","price":38000,"shipping":0,"inStock":true,"url":"https://slot.ng/?s=xiaomi+band&post_type=product"}]'::jsonb,
  '[{"date":"2026-04-01","price":42000},{"date":"2026-05-01","price":40000},{"date":"2026-06-01","price":38000},{"date":"2026-07-01","price":36000},{"date":"2026-08-01","price":34000}]'::jsonb,
  '[{"platform":"temu","retailer":"Temu","direction":"down","delta":2000,"minutesAgo":330},{"platform":"slot","retailer":"Slot","direction":"down","delta":1500,"minutesAgo":2880}]'::jsonb
),
(
  '00000000-0000-4000-8000-000000000013',
  '65W USB-C Laptop Charger (GaN Fast Charger + Cable)', 'accessories', 'Oraimo',
  'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
  'Universal 65W USB-C GaN power adapter that fast-charges most laptops and phones — the spare charger every student loses and re-buys.',
  12400,
  '[{"platform":"jumia","retailer":"Jumia","price":12500,"shipping":1000,"inStock":true,"url":"https://www.jumia.com.ng/catalog/?q=65w+usb-c+laptop+charger"},{"platform":"konga","retailer":"Konga","price":13500,"shipping":1000,"inStock":true,"url":"https://www.konga.com/search?search=65w%20usb-c%20laptop%20charger"},{"platform":"slot","retailer":"Slot","price":14000,"shipping":0,"inStock":true,"url":"https://slot.ng/?s=65w+laptop+charger&post_type=product"},{"platform":"temu","retailer":"Temu","price":9900,"shipping":2500,"inStock":true,"url":"https://www.temu.com/search_result.html?search_key=65w%20usb-c%20laptop%20charger"}]'::jsonb,
  '[{"date":"2026-04-01","price":15000},{"date":"2026-05-01","price":14500},{"date":"2026-06-01","price":14000},{"date":"2026-07-01","price":13000},{"date":"2026-08-01","price":12500}]'::jsonb,
  '[{"platform":"temu","retailer":"Temu","direction":"down","delta":1500,"minutesAgo":65},{"platform":"jumia","retailer":"Jumia","direction":"down","delta":500,"minutesAgo":1580}]'::jsonb
)
on conflict (id) do update set
  title         = excluded.title,
  category      = excluded.category,
  brand         = excluded.brand,
  image_url     = excluded.image_url,
  description   = excluded.description,
  lowest_price  = excluded.lowest_price,
  offers        = excluded.offers,
  price_history = excluded.price_history,
  price_events  = excluded.price_events,
  updated_at    = now();
