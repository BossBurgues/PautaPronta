import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['shared/**/*.test.js', 'worker/src/**/*.test.js', 'frontend/src/**/*.test.js'],
  },
});
