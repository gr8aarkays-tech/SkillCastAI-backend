import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // Exclude integration tests from default run — they require Docker Redis + Supabase.
    // Run integration tests with: npm run test:integration
    exclude: ['**/node_modules/**', 'test/**/*.spec.ts'],
  },
});
