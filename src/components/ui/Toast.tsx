import { useToast } from '@/hooks/useToast';
import { CheckIcon, AlertTriangleIcon, InfoIcon, XIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import type { ToastType } from '@/hooks/useToast';
import type { Toast } from '@/hooks/useToast';

const TOAST_ICON: Record<ToastType, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  success: CheckIcon,
  error: AlertTriangleIcon,
  info: InfoIcon,
};

const TOAST_BG: Record<ToastType, string> = {
  success: 'bg-savings/10 border-savings/30',
  error: 'bg-danger/10 border-danger/30',
  info: 'bg-primary/10 border-primary/30',
};

const TOAST_ICON_COLOR: Record<ToastType, string> = {
  success: 'text-savings',
  error: 'text-danger',
  info: 'text-primary',
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const Icon = TOAST_ICON[toast.type];
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-card border p-4 text-sm shadow-card',
        TOAST_BG[toast.type],
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', TOAST_ICON_COLOR[toast.type])} />
      <span className="flex-1 text-ink">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-1 text-muted hover:text-ink hover:bg-border/50"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
