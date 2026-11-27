import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    env: { NODE_ENV: 'test' },
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    // Scope test discovery explicitly to our own tests. The default
    // `exclude` only works with `**`-prefixed globs — a bare
    // 'node_modules/' does NOT exclude nested files — so leaving that out
    // and instead restricting `include` is the safe way to avoid
    // accidentally running every vendored *.test.ts in node_modules.
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['app/**/*.ts', 'app/**/*.tsx', 'lib/**/*.ts', 'components/**/*.tsx'],
      exclude: ['**/*.config.ts', 'prisma/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
