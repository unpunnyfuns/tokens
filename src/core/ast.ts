/**
 * @module core/ast
 * @description Multi-pass AST builder for design tokens
 * Provides validation, type inference, and rich metadata
 */

// Re-export all types
export type {
  ASTGroup,
  ASTStats,
  ASTToken,
  EnhancedAST,
  ReferenceInfo,
  Token,
} from "./ast-types.ts";

// Import processing modules
import { pass1_buildStructure } from "./ast-builder.ts";
import { pass4_inferTypes } from "./ast-inference.ts";
import { pass5_calculateMetadata } from "./ast-metadata.ts";
import {
  pass2_resolveReferences,
  pass3_detectCircularReferences,
} from "./ast-references.ts";
import type { EnhancedAST } from "./ast-types.ts";

/**
 * Multi-pass AST builder
 */
export function buildEnhancedAST(tokens: Record<string, unknown>): EnhancedAST {
  const ast: EnhancedAST = {
    type: "TokenTree",
    children: [],
    tokens: [],
    groups: [],
    references: [],
    referencedBy: {},
    tokenMap: new Map(),
    groupMap: new Map(),
    circularReferences: [],
    unresolvedReferences: [],
    typeInference: new Map(),
    stats: {
      totalTokens: 0,
      totalGroups: 0,
      totalReferences: 0,
      validReferences: 0,
      invalidReferences: 0,
      circularReferences: 0,
      maxReferenceDepth: 0,
      tokensWithInferredTypes: 0,
    },
  };

  // Pass 1: Build basic structure and collect all tokens/groups
  pass1_buildStructure(tokens, ast);

  // Pass 2: Resolve and validate references
  pass2_resolveReferences(ast);

  // Pass 3: Detect circular references
  pass3_detectCircularReferences(ast);

  // Pass 4: Infer types through reference chains
  pass4_inferTypes(ast);

  // Pass 5: Calculate metadata and statistics
  pass5_calculateMetadata(ast);

  return ast;
}
