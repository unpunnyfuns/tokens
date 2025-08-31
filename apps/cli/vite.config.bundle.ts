import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: resolve(__dirname, "src/cli.ts"),
      name: "upft-cli",
      fileName: "cli",
      formats: ["es"],
    },
    rollupOptions: {
      external: (id) => {
        // Keep Node.js built-ins external
        return (
          id.startsWith("node:") ||
          [
            "fs",
            "path",
            "url",
            "events",
            "child_process",
            "process",
            "stream",
            "string_decoder",
          ].includes(id)
        );
      },
    },
    target: "node18",
    minify: true,
    sourcemap: false,
    outDir: "dist",
  },
  resolve: {
    alias: {
      "@upft/analysis": resolve(__dirname, "../../libs/analysis/src"),
      "@upft/ast": resolve(__dirname, "../../libs/ast/src"),
      "@upft/bundler": resolve(__dirname, "../../libs/bundler/src"),
      "@upft/foundation": resolve(__dirname, "../../libs/foundation/src"),
      "@upft/io": resolve(__dirname, "../../libs/io/src"),
      "@upft/linter": resolve(__dirname, "../../libs/linter/src"),
      "@upft/schemas/tokens/base": resolve(
        __dirname,
        "../../libs/schemas/src/tokens/base.schema.json",
      ),
      "@upft/schemas/tokens/full": resolve(
        __dirname,
        "../../libs/schemas/src/tokens/full.schema.json",
      ),
      "@upft/schemas/tokens/value-types": resolve(
        __dirname,
        "../../libs/schemas/src/tokens/value-types.schema.json",
      ),
      "@upft/schemas": resolve(__dirname, "../../libs/schemas/src"),
    },
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
