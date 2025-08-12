/**
 * Public bundler API
 * Re-exports all bundler functionality for external consumption
 */

// Main bundling function
export { type BundleOptions, bundle } from "./bundle.ts";
// Core utilities
// Advanced API (for plugins and custom integrations)
export {
  Bundler,
  type BundlerConfig,
  mergeTokens,
  selectFilesFromManifest,
  type TokenSource,
  transformTokens,
} from "./bundler-core.ts";

// Format conversion
export { convertToDTCG } from "./dtcg-exporter.ts";
// External reference handling
export {
  checkForExternalReferences,
  resolveExternalReferences,
} from "./external-resolver.ts";
