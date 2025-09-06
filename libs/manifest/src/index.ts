/**
 * UPFT manifest parsing and loading
 */

// Re-export from foundation
export { isUPFTManifest } from "@upft/foundation";
// Core exports
export {
  generatePermutationId,
  parseManifest,
  resolvePermutationFiles,
  updatePermutationAST,
} from "./parser.js";

// New registry system exports
export {
  detectManifestFormat,
  getRegisteredResolvers,
  type ManifestResolver,
  parseManifestWithRegistry,
  registerManifestResolver,
  validateManifestWithRegistry,
} from "./registry.js";
export {
  type DTCGManifest,
  dtcgManifestResolver,
  isDTCGManifestFormat,
} from "./resolvers/dtcg-manifest-resolver.js";
export {
  type DTCGResolverManifest,
  dtcgResolver,
  isDTCGManifest,
} from "./resolvers/dtcg-resolver.js";
// Resolver implementations
export { upftResolver } from "./resolvers/upft-resolver.js";

// No automatic registration at import time. Consumers may call
// registerBuiltInResolvers() or provide a custom registry.
export { registerBuiltInResolvers, createRegistry, getRegistry, setRegistry, clearRegistry } from "./registry.js";
