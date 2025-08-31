import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.e2e.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    testTimeout: 30000, // E2E tests may take longer
  },
});
