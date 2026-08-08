import type { Config } from 'tailwindcss';

/**
 * PricePilot design system — "Trust Blue + Savings Green".
 *
 * Single source of truth for color, type, shape, and elevation.
 * Components MUST consume these tokens (e.g. `bg-primary`, `text-muted`,
 * `rounded-card`) — never hardcode hex values.
 *
 * Color is functional:
 *   primary  → brand, structure, primary actions
 *   savings  → good price / price drop / alert-hit (green)
 *   warning  → price increase (amber, calm — not alarming)
 *   danger   → destructive actions ONLY (never "price went up")
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand / structure
        primary: {
          DEFAULT: '#3D5AF1',
          hover: '#2E45C4', // hover / pressed
        },
        // Semantic price signals
        savings: '#12B76A', // best price, price-drop, alert-hit
        warning: '#F79009', // price increase (amber)
        danger: '#F04438', // destructive only

        // Neutrals / surfaces
        bg: '#F8FAFC', // page background (soft cool gray)
        surface: '#FFFFFF', // cards, modals, nav
        border: '#EAECF0', // hairlines, dividers, input outlines

        // Text
        ink: '#0F172A', // headings, prices (text primary)
        muted: '#64748B', // labels, secondary info
      },
      fontFamily: {
        // Headings / display — geometric, modern, friendly
        display: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Body / UI — razor-sharp for data-dense tables
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px', // cards
        control: '8px', // buttons, inputs
        pill: '9999px', // badges
      },
      boxShadow: {
        // Low, soft elevation — no heavy drop shadows
        card: '0 1px 3px rgba(16, 24, 40, 0.08)',
        'card-hover': '0 4px 12px rgba(16, 24, 40, 0.12)',
      },
      maxWidth: {
        content: '1200px', // max content width
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        // Hard on/off blink for the typewriter caret (not a soft fade).
        'caret-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        'caret-blink': 'caret-blink 1s step-end infinite',
      },
    },
  },
  plugins: [],
};

export default config;
