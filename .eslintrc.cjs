module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  // `supabase/` holds Deno Edge Functions — a separate runtime (Deno globals,
  // https:// imports) with its own type-checker (`supabase functions deploy`).
  // Linting them with this browser/Node config would only produce false errors.
  ignorePatterns: ['dist', '.eslintrc.cjs', 'vite.config.ts', 'tailwind.config.ts', 'supabase'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // `sampleProducts.ts` is dev-only seed data — read as text by
    // `scripts/gen-seed.mjs` to build `supabase/seed.sql`. It must NEVER be
    // imported by the app: PricePilot renders only live, scraped Supabase data,
    // never fabricated sample prices. This turns that invariant into a hard
    // error so it can't silently regress. (gen-seed reads the file via `fs`,
    // not `import`, so it's unaffected.)
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/lib/sampleProducts', '**/sampleProducts'],
            message:
              'sampleProducts is dev seed data (scripts/gen-seed.mjs → supabase/seed.sql). App code must read live Supabase data, never fabricated samples.',
          },
        ],
      },
    ],
  },
};
