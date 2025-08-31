/**
 * AST module - Functional API for token tree operations
 */

export { createAST } from "./ast-builder.js";
export { resolveASTReferences } from "./ast-resolver.js";
export {
  findNode,
  traverseAST,
  visitGroups,
  visitTokens,
} from "./ast-traverser.js";
export {
  type CrossFileResolutionResult,
  resolveCrossFileReferences,
  validateCrossFileReferences,
} from "./cross-file-resolver.js";
export type { CycleDetectionResult } from "./cycle-detector/index.js";
export { detectCycles } from "./cycle-detector/index.js";
export {
  generatePermutationId,
  parseManifestAST,
  resolvePermutationFiles,
  updatePermutationAST,
} from "./manifest-parser.js";
export {
  buildCrossFileReferences,
  buildDependencyGraph,
  detectCircularDependencies,
  getResolutionOrder,
} from "./project-builder.js";
export {
  createReferenceGraph,
  filterTokens,
  findAllDependents,
  findAllTokens,
  findDependencies,
  findDependents,
  findTokenAliases,
  findTokensByType,
  findTokensWithReferences,
  findUnresolvedTokens,
  getGroup,
  getNode,
  getStatistics,
  getToken,
  getTokenReferenceInfo,
} from "./query.js";
export {
  astToDocument,
  createASTReferenceGraph,
} from "./resolver.js";
// Token types
export type {
  BorderToken,
  ColorToken,
  ColorValue,
  CubicBezierToken,
  DimensionToken,
  DimensionValue,
  DurationToken,
  FontFamilyToken,
  FontWeightToken,
  GradientToken,
  NumberToken,
  ShadowToken,
  StrokeStyleToken,
  TokenReference,
  TokenType,
  TokenValueForType,
  TransitionToken,
  TypedToken,
  TypographyToken,
} from "./token-types.js";
export {
  isBorderToken,
  isColorToken,
  isCubicBezierToken,
  isDimensionToken,
  isDurationToken,
  isFontFamilyToken,
  isFontWeightToken,
  isGradientToken,
  isNumberToken,
  isShadowToken,
  isStrokeStyleToken,
  isTokenReference,
  isTransitionToken,
  isTypographyToken,
} from "./token-types.js";
// Types
export type {
  AnyOfModifier,
  ASTNode,
  ASTStatistics,
  CrossFileReference,
  DependencyGraph,
  FileDependency,
  GenerateSpec,
  GroupNode,
  ManifestAST,
  ModifierAST,
  OneOfModifier,
  PermutationAST,
  ProjectAST,
  ReferenceGraph,
  ResolutionError,
  TokenAST,
  TokenNode,
  TokenSet,
  TokenSetAST,
  // Raw manifest types
  UPFTResolverManifest,
  ValidationResult,
} from "./types.js";
export { isUPFTManifest } from "./types.js";
