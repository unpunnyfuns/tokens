/**
 * AST-specific types
 */

import type {
  AnyOfModifier,
  GenerateSpec,
  OneOfModifier,
  TokenDocument,
  TokenSet,
  UPFTResolverManifest,
} from "@upft/foundation";
import type { TokenReference, TokenType, TypedToken } from "./token-types.js";

// Base AST Node types
export interface ASTNode {
  type: "token" | "group" | "file" | "manifest" | "project";
  path: string;
  name: string;
  parent?: ASTNode;
  metadata?: Record<string, unknown>;
}

// Type-aware TokenNode using discriminated unions
export interface TokenNode<T extends TokenType = TokenType> extends ASTNode {
  type: "token";
  /** Optional to allow untyped tokens at parse time (pre-validation) */
  tokenType?: T;
  /** Present when tokenType is known */
  typedValue?: TypedToken & { $type: T };
  references?: TokenReference[];
  resolved?: boolean;
  /** Present when resolved and tokenType is known */
  resolvedValue?: TypedToken & { $type: T };
}

export interface GroupNode extends ASTNode {
  type: "group";
  children: Map<string, ASTNode | TokenNode>;
  tokens: Map<string, TokenNode>;
  groups: Map<string, GroupNode>;
}

// Reference resolution types
export interface ResolutionError {
  type: "missing" | "circular" | "invalid" | "depth" | "cross-file";
  path: string;
  message: string;
  reference?: string;
  filePath?: string; // for cross-file errors
  targetFile?: string;
}

export interface ReferenceGraph {
  nodes: Map<string, TokenNode>;
  edges: Map<string, Set<string>>;
  reverseEdges: Map<string, Set<string>>;
}

export interface ASTStatistics {
  totalTokens: number;
  totalGroups: number;
  totalNodes: number;
  tokensByType: Record<string, number>;
  maxDepth: number;
  tokensWithReferences: number;
  unresolvedTokens: number;
  totalFiles?: number;
  crossFileReferences?: number;
  manifestPermutations?: number;
}

// Multi-file and project-level types
export interface TokenAST extends ASTNode {
  type: "file";
  filePath: string;
  lastModified?: Date;
  checksum?: string;
  crossFileReferences: Map<string, CrossFileReference[]>;
  children: Map<string, ASTNode | TokenNode>;
  tokens: Map<string, TokenNode>;
  groups: Map<string, GroupNode>;
}

export interface CrossFileReference {
  fromToken: string; // path within current file
  toFile: string; // target file path
  toToken: string; // path within target file
  reference: string; // original reference string
  resolved?: boolean;
}

export interface ProjectAST extends ASTNode {
  type: "project";
  files: Map<string, TokenAST>;
  manifest?: ManifestAST;
  crossFileReferences: Map<string, CrossFileReference[]>;
  dependencyGraph: Map<string, Set<string>>;
  basePath: string;
}

// Manifest AST types
export interface ManifestAST extends ASTNode {
  type: "manifest";
  manifestType: "upft" | "dtcg" | "dtcg-manifest";
  sets: Map<string, TokenSetAST>;
  modifiers: Map<string, ModifierAST>;
  permutations: Map<string, PermutationAST>;
  options?: ManifestOptionsAST;
}

export interface TokenSetAST extends ASTNode {
  files: string[];
}

export interface ModifierAST extends ASTNode {
  constraintType: "oneOf" | "anyOf";
  options: string[];
  values: Map<string, string[]>; // option -> file paths
  defaultValue?: string | string[];
  description?: string;
}

export interface PermutationAST extends ASTNode {
  input: Record<string, string | string[]>;
  resolvedFiles: string[];
  tokens: TokenDocument;
  resolvedTokens?: TokenDocument;
  outputPath?: string;
}

export interface ManifestOptionsAST {
  resolveReferences?: boolean;
  validation?: {
    mode?: "strict" | "loose";
  };
}

// File dependency tracking
export interface FileDependency {
  filePath: string;
  dependencies: Set<string>; // files this file depends on
  dependents: Set<string>; // files that depend on this file
  lastAnalyzed?: Date;
}

export interface DependencyGraph {
  nodes: Map<string, FileDependency>;
  hasCycles: boolean;
  cycles?: string[][];
  resolutionOrder?: string[];
}

// Re-export raw manifest types from foundation
export type {
  AnyOfModifier,
  GenerateSpec,
  OneOfModifier,
  TokenSet,
  UPFTResolverManifest,
};

// Type guard functions
export { isUPFTManifest } from "@upft/foundation";

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  permutationResults?: Array<{
    permutation: string;
    valid: boolean;
    errors: string[];
  }>;
}
