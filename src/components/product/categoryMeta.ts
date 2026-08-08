import type { SVGProps } from 'react';
import type { CategorySlug } from '@/lib/constants';
import {
  BagIcon,
  BookIcon,
  HeadphonesIcon,
  HeartPulseIcon,
  LampIcon,
  LaptopIcon,
  PhoneIcon,
  PlugIcon,
  ShirtIcon,
} from '@/components/ui/icons';

type IconComponent = (props: SVGProps<SVGSVGElement>) => JSX.Element;

/** Glyph shown for each category (placeholder thumbnails, category tiles). */
export const CATEGORY_ICON: Record<CategorySlug, IconComponent> = {
  phones: PhoneIcon,
  accessories: PlugIcon,
  laptops: LaptopIcon,
  electronics: HeadphonesIcon,
  textbooks: BookIcon,
  bags: BagIcon,
  'dorm-supplies': LampIcon,
  fashion: ShirtIcon,
  health: HeartPulseIcon,
};

/** One-line descriptor for the "Shop by category" tiles. */
export const CATEGORY_BLURB: Record<CategorySlug, string> = {
  phones: 'Android & iPhone — new and clean',
  accessories: 'Chargers, power banks & cables',
  laptops: 'Laptops, mice & everyday computing',
  electronics: 'Audio, TVs & smart gadgets',
  textbooks: 'Coursebooks, calculators & stationery',
  bags: 'Backpacks, laptop bags & totes',
  'dorm-supplies': 'Lamps, kettles & room essentials',
  fashion: 'Sneakers, clothing & footwear',
  health: 'Thermometers, care & personal items',
};
