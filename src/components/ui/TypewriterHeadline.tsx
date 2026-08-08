import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Rotating value-prop headline for the hero: types a phrase out
 * character-by-character, pauses, deletes it, then types the next — looping
 * forever with a blinking caret.
 *
 * Edit PHRASES freely. Keep them similar in length: the component reserves
 * height for the tallest phrase (invisible sizers stacked underneath), so the
 * page never shifts as phrases change — but wildly different lengths waste
 * vertical space.
 *
 * Accessibility: honors `prefers-reduced-motion` (shows the first phrase
 * statically, no animation) and exposes a stable, non-animated `aria-label` so
 * screen readers get a sensible headline instead of mid-type fragments.
 */
const PHRASES = [
  'Find the lowest price on your textbooks.',
  'Never overpay for dorm essentials again.',
  'Get alerted the second a price drops.',
  'Compare every store in one quick search.',
  'Keep more money in your student budget.',
];

/** Full, non-animated headline read by assistive tech. */
const ARIA_LABEL =
  'PricePilot helps students find the lowest prices and get alerted when they drop.';

const TYPING_MS = 60; // per character while typing
const DELETING_MS = 35; // per character while deleting (a touch faster)
const PAUSE_MS = 1200; // hold on a fully-typed phrase before deleting

/**
 * Character index where a phrase's final two words begin — everything from
 * here to the end renders italic + brand color. Returns 0 (whole phrase
 * styled) for phrases of two words or fewer.
 */
function lastTwoWordStart(phrase: string): number {
  const words = phrase.trim().split(/\s+/);
  if (words.length <= 2) return 0;
  const tail = words.slice(-2).join(' ');
  return phrase.length - tail.length;
}

/** Reactively track the user's reduced-motion preference. */
function usePrefersReducedMotion(): boolean {
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

interface TypewriterHeadlineProps {
  /** Extra classes for the outer <h1> (spacing, max-width, etc.). */
  className?: string;
}

export function TypewriterHeadline({ className }: TypewriterHeadlineProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const current = PHRASES[phraseIndex];

    // Finished typing → hold, then start deleting.
    if (!deleting && subIndex === current.length) {
      const t = setTimeout(() => setDeleting(true), PAUSE_MS);
      return () => clearTimeout(t);
    }

    // Finished deleting → advance to the next phrase and type it.
    if (deleting && subIndex === 0) {
      setDeleting(false);
      setPhraseIndex((i) => (i + 1) % PHRASES.length);
      return;
    }

    const t = setTimeout(
      () => setSubIndex((i) => i + (deleting ? -1 : 1)),
      deleting ? DELETING_MS : TYPING_MS,
    );
    return () => clearTimeout(t);
  }, [subIndex, deleting, phraseIndex, reducedMotion]);

  const activePhrase = reducedMotion ? PHRASES[0] : PHRASES[phraseIndex];
  const revealed = reducedMotion ? activePhrase.length : subIndex;

  // Split what's currently visible into a base part and the final-two-words
  // tail, so the tail styles in progressively as the caret types through it.
  const tailStart = lastTwoWordStart(activePhrase);
  const baseText = activePhrase.slice(0, Math.min(revealed, tailStart));
  const tailText = revealed > tailStart ? activePhrase.slice(tailStart, revealed) : '';

  // Caret holds steady while actively typing/deleting; blinks only at rest.
  const atRest = reducedMotion || (!deleting && subIndex === PHRASES[phraseIndex].length);

  return (
    <h1
      aria-label={ARIA_LABEL}
      className={cn(
        'font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl',
        className,
      )}
    >
      {/* Stack every phrase invisibly to reserve the tallest height, so the
          visible line (overlaid in the same grid cell) never shifts layout. */}
      <span aria-hidden="true" className="grid">
        {PHRASES.map((phrase) => (
          <span key={phrase} className="col-start-1 row-start-1 invisible">
            {phrase}
          </span>
        ))}
        <span className="col-start-1 row-start-1">
          {baseText}
          <span className="italic text-primary-hover">{tailText}</span>
          <span
            className={cn(
              'ml-0.5 inline-block w-[0.06em] self-stretch bg-primary align-[-0.1em]',
              // Use a real element (not a "|" glyph) so the caret height is
              // consistent across fonts/weights.
              'h-[1em]',
              atRest && 'animate-caret-blink',
            )}
          />
        </span>
      </span>
    </h1>
  );
}
