/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { serviceWorkerPlugin } from './scripts/sw-plugin';

export default defineConfig({
  plugins: [react(), serviceWorkerPlugin()],
  server: {
    proxy: { '/api': 'http://localhost:8788' },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts', 'worker/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts', 'src/state/**/*.ts', 'src/mochi/**/*.ts'],
      exclude: ['**/*.test.ts', '**/test-fixtures.ts', 'src/domain/types.ts', 'src/mochi/protocol.ts', 'src/mochi/client.ts', 'src/mochi/system-prompt.ts', 'src/state/effects.ts', 'src/state/hooks.ts', 'src/state/context.ts'],
      thresholds: {
        'src/domain/**/*.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
      },
    },
  },
});
