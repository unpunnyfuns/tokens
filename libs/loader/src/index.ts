/**
 * UPFT Pipeline Loader - Orchestrates file loading, validation, and parsing
 */

export {
  clearCache,
  createLoader,
  type LoaderState,
  loadFile,
  loadFiles,
} from "./loader.js";
// Project AST creation (with file I/O)
export { createProjectAST } from "./multi-pass-resolver.js";
export type {
  PipelineOptions,
  PipelineResult,
} from "./pipeline.js";
// High-level multi-pass pipeline
export { runPipeline } from "./pipeline.js";
export type {
  PipelineResolutionInput,
  PipelineResolvedPermutation,
} from "./pipeline-resolver.js";
// Pure pipeline resolver functions
export {
  generateAllPermutations,
  resolvePermutation,
} from "./pipeline-resolver.js";
export type {
  FileInfo,
  LoadedFile,
  LoadOptions,
  LoadResult,
} from "./types.js";
