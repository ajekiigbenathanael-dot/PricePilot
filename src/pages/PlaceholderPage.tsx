import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';

/**
 * Phase 1 placeholder screen. Every route renders one of these so the shell,
 * routing, and tokens are verifiable before real features land. Replaced
 * page-by-page in later phases.
 */
export function PlaceholderPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader
        title={title}
        description={description}
        actions={<Badge tone="primary">Phase 1 · placeholder</Badge>}
      />
      <Card className="mt-8 p-8">
        {children ?? (
          <p className="text-muted">
            This screen is scaffolded and ready. Feature work lands in a later phase.
          </p>
        )}
      </Card>
    </Container>
  );
}
