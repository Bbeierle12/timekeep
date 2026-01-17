import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-for-testing-only',
      CSRF_ENABLED: 'false',
    },
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/test/**',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/index.ts',
        'src/db/seeds/**',
      ],
    },
    testTimeout: 10000,
  },
});
