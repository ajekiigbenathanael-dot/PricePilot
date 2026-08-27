module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'vite.config.ts', 'tailwind.config.ts'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // `sampleProducts.ts` is demo/seed data — a fixed sample catalog kept for
    // local demos and seeding, NOT for the running app. PricePilot renders only
    // live, scraped prices (fetched from `/api`), never fabricated samples, so
    // app code must never import it. This turns that invariant into a hard error
    // so it can't silently regress.
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/lib/sampleProducts', '**/sampleProducts'],
            message:
              'sampleProducts is demo/seed data. App code must render the live catalog from /api, never fabricated samples.',
          },
        ],
      },
    ],
  },
};
