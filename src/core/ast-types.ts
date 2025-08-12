/**
 * @module core/ast-types
 * @description Type definitions for AST structures
 */

/**
 * DTCG token structure
 */
export interface Token {
  $type?: string;
  $value?: unknown;
  $description?: string;
  $ref?: string;
  [key: string]: unknown;
}

export interface ASTToken {
  type: "Token";
  path: string;
  name: string;
  tokenType?: string;
  value: unknown;
  description?: string;
  extensions: Record<string, unknown> | null;
  hasReference: boolean;
  // Enhanced metadata from multi-pass
  resolvedType?: string; // Type after inference
  referenceDepth: number; // How many hops to a non-reference token
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface ASTGroup {
  type: "TokenGroup";
  path: string;
  name: string;
  description?: string;
  children: (ASTToken | ASTGroup)[];
  tokens: ASTToken[];
  groups: ASTGroup[];
}

export interface ReferenceInfo {
  from: string;
  to: string | null;
  isValid: boolean;
  resolvedPath?: string; // Actual token path after resolution
  isCircular?: boolean;
}

export interface ASTStats {
  totalTokens: number;
  totalGroups: number;
  totalReferences: number;
  validReferences: number;
  invalidReferences: number;
  circularReferences: number;
  maxReferenceDepth: number;
  tokensWithInferredTypes: number;
}

export interface EnhancedAST {
  type: "TokenTree";
  children: (ASTToken | ASTGroup)[];
  tokens: ASTToken[];
  groups: ASTGroup[];
  references: ReferenceInfo[];
  referencedBy: Record<string, string[]>;
  // Enhanced metadata
  tokenMap: Map<string, ASTToken>; // Fast lookup
  groupMap: Map<string, ASTGroup>; // Fast lookup
  circularReferences: Array<{ chain: string[]; token: string }>;
  unresolvedReferences: string[];
  typeInference: Map<string, string>; // Inferred types for tokens without explicit $type
  stats: ASTStats;
}
