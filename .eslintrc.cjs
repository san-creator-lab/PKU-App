module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'dev-dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      // node driver scripts; verify-* scripts also contain page.evaluate
      // callbacks that run in the browser
      files: ['scripts/**/*.mjs'],
      env: { node: true, browser: true },
    },
    {
      // Supabase Edge Functions run on Deno
      files: ['supabase/functions/**/*.ts'],
      globals: { Deno: 'readonly' },
    },
  ],
}
