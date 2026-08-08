import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Centered content wrapper enforcing the design system's max content width
 * (1200px) and responsive horizontal padding. Use to constrain page content.
 */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  );
}
