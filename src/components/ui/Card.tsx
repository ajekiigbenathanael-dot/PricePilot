import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Adds a subtle hover lift — for interactive/clickable cards. */
  interactive?: boolean;
}

/**
 * Surface container: white background, hairline border, 12px radius, soft
 * shadow. The base building block for product cards, panels, and forms.
 */
export function Card({ children, interactive = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface shadow-card',
        interactive &&
          'transition-shadow duration-150 ease-smooth hover:shadow-card-hover',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
