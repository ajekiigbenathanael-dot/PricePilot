/**
 * Merge conditional class names, resolving Tailwind conflicts.
 * Lightweight local implementation to avoid extra deps in the scaffold;
 * swap for `clsx` + `tailwind-merge` later if class conflicts grow.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format a number as a Nigerian Naira price string, e.g. 45000 → "₦45,000".
 * Kobo is dropped: retail prices are quoted in whole Naira, and hiding the
 * ".00" keeps the comparison tables clean and scannable.
 */
export function formatPrice(value: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
