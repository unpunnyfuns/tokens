// Export functional API
export {
  resolvePermutation,
  generateAll as generateAllPermutations,
  type ResolverOptions,
} from "./resolver-core.js";

export { validateInput } from "./resolver-validation.js";
export { collectFiles, loadAndMergeFiles } from "./resolver-files.js";
export {
  expandGenerateSpec,
  expandSpecWithFiltering,
} from "./resolver-generation.js";
export {
  shouldIncludeSet,
  shouldIncludeModifier,
  filterFiles,
} from "./resolver-filtering.js";

export type {
  AnyOfModifier,
  GenerateSpec,
  InputValidation,
  OneOfModifier,
  ResolutionInput,
  ResolvedPermutation,
  UPFTResolverManifest,
} from "./upft-types.js";

export {
  isAnyOfModifier,
  isOneOfModifier,
  isUPFTManifest,
} from "./upft-types.js";

export { readManifest } from "./manifest-reader.js";
