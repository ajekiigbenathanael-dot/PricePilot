import { useEffect, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

export interface ToastOptions {
  duration?: number;
}

const DEFAULT_DURATION = 4000;

let toasts: Toast[] = [];
const listeners = new Set<(t: Toast[]) => void>();

function broadcast() {
  listeners.forEach((l) => l(toasts));
}

function addToast(type: ToastType, message: string, duration = DEFAULT_DURATION) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const toast: Toast = { id, type, message, duration };
  toasts = [...toasts, toast];
  broadcast();

  if (duration > 0) {
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      broadcast();
    }, duration);
  }
}

export const toast = {
  success: (message: string, opts?: ToastOptions) => addToast('success', message, opts?.duration ?? DEFAULT_DURATION),
  error: (message: string, opts?: ToastOptions) => addToast('error', message, opts?.duration ?? DEFAULT_DURATION),
  info: (message: string, opts?: ToastOptions) => addToast('info', message, opts?.duration ?? DEFAULT_DURATION),
  dismiss: (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    broadcast();
  },
};

export function useToast() {
  const [state, setToasts] = useState<Toast[]>(toasts);

  useEffect(() => {
    const listener = (t: Toast[]) => setToasts(t);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const dismiss = useCallback((id: string) => toast.dismiss(id), []);

  return { toasts: state, dismiss };
}
