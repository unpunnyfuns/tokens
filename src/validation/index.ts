/**
 * Public validation API for token files
 * This module exports functions for validating design tokens against schemas
 */

// Export public validation functions
export { validateFiles } from "./cli-validator.ts";
export {
  resolveTokens,
  validateResolverManifest as validateResolver,
} from "./manifest-validator.ts";
