import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [resolve(__dirname, "src/cli.ts")],
  bundle: true,
  outfile: "dist/cli.js",
  format: "esm",
  platform: "node",
  target: "node18",
  minify: true,
  sourcemap: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
  external: [
    // Keep Node.js built-ins external
    "node:*",
  ],
  alias: {
    "@upft/analysis": resolve(__dirname, "../../libs/analysis/src"),
    "@upft/ast": resolve(__dirname, "../../libs/ast/src"),
    "@upft/bundler": resolve(__dirname, "../../libs/bundler/src"),
    "@upft/foundation": resolve(__dirname, "../../libs/foundation/src"),
    "@upft/linter": resolve(__dirname, "../../libs/linter/src"),
    "@upft/manifest": resolve(__dirname, "../../libs/manifest/src"),
    "@upft/schema-validator": resolve(
      __dirname,
      "../../libs/schema-validator/src",
    ),
    "@upft/schemas": resolve(__dirname, "../../libs/schemas/src"),
  },
  loader: {
    ".json": "json",
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
