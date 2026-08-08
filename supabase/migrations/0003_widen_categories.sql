-- PricePilot — 0003 widen product categories
-- The initial CHECK (0001) allowed 6 slugs. The product taxonomy expanded to
-- the full 9 categories students actually shop for. This migration swaps the
-- constraint. Idempotent: drop-if-exists then re-add.
--
-- NOTE ON RETIRED SLUGS: 'desk-study' and 'wearables' are gone. 'desk-study'
-- items fold into 'laptops'/'dorm-supplies'; 'wearables' into 'electronics'.
-- If any rows already use a retired slug, remap them BEFORE the new CHECK is
-- added (the UPDATEs below are no-ops on a fresh DB).

update public.products set category = 'laptops'     where category = 'desk-study';
update public.products set category = 'electronics' where category = 'wearables';

alter table public.products drop constraint if exists products_category_check;

alter table public.products
  add constraint products_category_check
  check (category in (
    'phones',
    'accessories',
    'laptops',
    'electronics',
    'textbooks',
    'bags',
    'dorm-supplies',
    'fashion',
    'health'
  ));
