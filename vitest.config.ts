import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test-setup.ts'],
    dir: 'src',
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts', '**/playwright-report/**', '**/.git/**'],
    testTimeout: 10000, // 10s timeout per test
    hookTimeout: 10000, // 10s timeout for hooks
    // Ensure happy-dom is properly configured
    environmentOptions: {
      happyDOM: {
        width: 1024,
        height: 768,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.bench.ts',
        'src/types.ts',
        'src/test-utils.tsx',
        'src/test-setup.ts',
        '**/e2e/**',
      ],
    },
  },
})
