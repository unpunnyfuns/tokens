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

// Register built-in resolvers
import { registerManifestResolver } from "./registry.js";
import { dtcgManifestResolver } from "./resolvers/dtcg-manifest-resolver.js";
import { dtcgResolver } from "./resolvers/dtcg-resolver.js";
import { upftResolver } from "./resolvers/upft-resolver.js";

registerManifestResolver(upftResolver);
registerManifestResolver(dtcgResolver);
registerManifestResolver(dtcgManifestResolver);
