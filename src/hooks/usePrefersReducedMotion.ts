import { useEffect, useState } from 'react';

/**
 * Reactively track the user's `prefers-reduced-motion` setting. Returns `true`
 * when the user has asked for reduced motion — components should then skip
 * looping/auto-playing animation and render a calm static state instead.
 *
 * SSR-safe (guards `window`) and updates live if the OS setting changes.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
