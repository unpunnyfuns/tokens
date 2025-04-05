/**
 * Public validation API for token files
 * This module exports functions for validating design tokens against schemas
 */

// Export public validation functions
export { validateFiles } from "./example-validator.ts";
export {
  validateResolverManifest as validateResolver,
  resolveTokens,
} from "./resolver-validator.ts";
