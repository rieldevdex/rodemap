// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

const presentational = ['src/components/**/*.{ts,tsx}', 'src/pages/**/*.{ts,tsx}'];

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'test-results', 'playwright-report', 'screenshots', 'public'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['src/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,
      // Inline styles may only set CSS custom properties (values come from tokens.css).
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='style'] Property[key.type='Identifier']",
          message: 'Inline styles may only set CSS custom properties (e.g. {"--x": value}). Use a class and tokens.css.',
        },
        {
          selector: "JSXAttribute[name.name='style'] Property[key.type='Literal'][key.value!=/^--/]",
          message: 'Inline styles may only set CSS custom properties.',
        },
      ],
    },
  },
  {
    files: presentational,
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Components are presentational: persistence lives in src/state/persistence.ts.' },
        { name: 'sessionStorage', message: 'Components are presentational.' },
        { name: 'fetch', message: 'Components are presentational: network calls live in src/mochi/client.ts.' },
      ],
      'no-restricted-imports': [
        'error',
        { paths: [{ name: '../../mochi/client', message: 'Use the Mochi hooks from src/state, not the API client.' }] },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  {
    files: ['eslint.config.js', 'tests/tools/**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
);
