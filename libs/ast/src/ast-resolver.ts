/**
 * AST-specific reference resolution
 * This belongs in AST package since it's AST-specific logic
 */

// Self-contained AST resolution - implements core resolution logic internally
import { visitTokens } from "./ast-traverser.js";
import type { TypedToken } from "./token-types.js";
import type { ASTNode, ResolutionError, TokenNode } from "./types.js";

/**
 * Resolve all references in an AST using self-contained resolution logic
 */
export function resolveASTReferences(ast: ASTNode): ResolutionError[] {
  const errors: ResolutionError[] = [];
  const resolved = new Map<string, TypedToken>();

  // Simple resolution: mark tokens with references as unresolved for now
  // This is a basic implementation - full resolution would require building dependency graphs
  visitTokens(ast, (token: TokenNode) => {
    if (token.references && token.references.length > 0) {
      token.resolved = false;
      errors.push({
        type: "missing",
        path: token.path,
        message: `Token has unresolved references: ${token.references.join(", ")}`,
      });
    } else {
      token.resolved = true;
      if (token.typedValue !== undefined) {
        token.resolvedValue = token.typedValue;
        resolved.set(token.path, token.typedValue);
      }
    }
    return true; // Continue traversal
  });

  return errors;
}

// Note: AST resolution is now self-contained and doesn't depend on external resolvers
// For full reference resolution, use the cross-file resolver or project-level resolution
