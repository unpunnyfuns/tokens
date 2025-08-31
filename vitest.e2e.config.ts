import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts", "test/**/*.spec.ts"],
    timeout: 30000, // E2E tests can take longer
    testTimeout: 30000,
    hookTimeout: 30000,
    // Use Node's native TypeScript stripping
    pool: "forks",
    poolOptions: {
      forks: {
        execArgv: ["--experimental-strip-types"],
      },
    },
  },
});
