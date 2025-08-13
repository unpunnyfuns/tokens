import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "examples/",
        "scripts/",
        "*.config.ts",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/test-fixtures/**",
        "**/test-scenarios/**",
        "**/examples/**",
        "**/schemas/**",
        "src/index.ts",
        "src/types.ts",
        "src/cli/cli.ts",
        "src/linter/**",
      ],
    },
    // Use Node's native TypeScript stripping
    pool: "forks",
    poolOptions: {
      forks: {
        execArgv: ["--experimental-strip-types"],
      },
    },
  },
});
