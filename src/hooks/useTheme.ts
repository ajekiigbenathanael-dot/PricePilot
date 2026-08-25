import { useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'pricepilot-theme';

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === 'system') {
    const resolved = getSystemPreference();
    html.classList.toggle('dark', resolved === 'dark');
  } else {
    html.classList.toggle('dark', theme === 'dark');
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return (stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system') as Theme;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  }, [theme]);

  const set = useCallback((t: Theme) => setTheme(t), []);

  return { theme, setTheme: set };
}
