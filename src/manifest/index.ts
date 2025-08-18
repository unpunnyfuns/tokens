// Export functional API
export {
  generateAll as generateAllPermutations,
  type ResolverOptions,
  resolvePermutation,
} from "./manifest-core.js";
export { collectFiles, loadAndMergeFiles } from "./manifest-files.js";
export {
  filterFiles,
  shouldIncludeModifier,
  shouldIncludeSet,
} from "./manifest-filtering.js";
export {
  expandGenerateSpec,
  expandSpecWithFiltering,
} from "./manifest-generation.js";
export { readManifest } from "./manifest-reader.js";
export { validateInput } from "./manifest-validation.js";
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
