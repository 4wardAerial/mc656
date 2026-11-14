import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Never pick tests up from the build output or from Stryker's sandbox.
    exclude: [...configDefaults.exclude, 'dist/**', '.stryker-tmp/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // The pipeline fails if coverage drops below these levels.
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
});