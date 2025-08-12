/**
 * @module core/ast-references
 * @description Pass 2 & 3: Reference resolution and circular detection
 */

import type { EnhancedAST } from "./ast-types.ts";
import { parseReference } from "./resolver.ts";

/**
 * Pass 2: Resolve and validate references
 */
export function pass2_resolveReferences(ast: EnhancedAST): void {
  for (const ref of ast.references) {
    if (!ref.to) {
      ast.unresolvedReferences.push(ref.from);
      ast.stats.invalidReferences++;
      continue;
    }

    // Parse reference to check if it's external
    const parsed = parseReference(ref.to);

    if (parsed.type === "external") {
      // External references are marked as valid but with special handling
      ref.isValid = true; // We'll handle them differently in the validator
      ref.resolvedPath = ref.to; // Keep original external reference
      ast.stats.validReferences++;

      // Mark the source token with external reference info
      const sourceToken = ast.tokenMap.get(ref.from);
      if (sourceToken) {
        if (!sourceToken.warnings) sourceToken.warnings = [];
        sourceToken.warnings.push(`External reference: ${ref.to}`);
      }
    } else {
      // Internal reference - check if target exists
      const resolvedPath = resolveReferencePath(ref.to);
      const targetToken = ast.tokenMap.get(resolvedPath);

      if (targetToken) {
        ref.isValid = true;
        ref.resolvedPath = resolvedPath;
        ast.stats.validReferences++;

        // Build referencedBy map
        if (!ast.referencedBy[resolvedPath]) {
          ast.referencedBy[resolvedPath] = [];
        }
        ast.referencedBy[resolvedPath].push(ref.from);
      } else {
        ref.isValid = false;
        ast.unresolvedReferences.push(ref.from);
        ast.stats.invalidReferences++;

        // Mark source token as invalid
        const sourceToken = ast.tokenMap.get(ref.from);
        if (sourceToken) {
          sourceToken.isValid = false;
          if (!sourceToken.errors) sourceToken.errors = [];
          sourceToken.errors.push(`Reference to non-existent token: ${ref.to}`);
        }
      }
    }
  }
}

/**
 * Pass 3: Detect circular references
 */
export function pass3_detectCircularReferences(ast: EnhancedAST): void {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function detectCycle(tokenPath: string, chain: string[] = []): boolean {
    if (recursionStack.has(tokenPath)) {
      // Found a cycle
      const cycleStart = chain.indexOf(tokenPath);
      const cycle = [...chain.slice(cycleStart), tokenPath];
      ast.circularReferences.push({
        token: tokenPath,
        chain: cycle,
      });
      ast.stats.circularReferences++;

      // Mark all tokens in the cycle as invalid
      for (const path of cycle) {
        const token = ast.tokenMap.get(path);
        if (token) {
          token.isValid = false;
          if (!token.errors) token.errors = [];
          token.errors.push(`Part of circular reference: ${cycle.join(" → ")}`);
        }
      }

      // Mark references as circular
      for (let i = 0; i < cycle.length - 1; i++) {
        const ref = ast.references.find(
          (r) => r.from === cycle[i] && r.resolvedPath === cycle[i + 1],
        );
        if (ref) ref.isCircular = true;
      }

      return true;
    }

    if (visited.has(tokenPath)) {
      return false;
    }

    visited.add(tokenPath);
    recursionStack.add(tokenPath);

    // Check all references from this token
    const refs = ast.references.filter(
      (r) => r.from === tokenPath && r.isValid,
    );
    for (const ref of refs) {
      if (
        ref.resolvedPath &&
        detectCycle(ref.resolvedPath, [...chain, tokenPath])
      ) {
        // Cycle detected in child
      }
    }

    recursionStack.delete(tokenPath);
    return false;
  }

  // Check each token for cycles
  for (const token of ast.tokens) {
    if (!visited.has(token.path) && token.hasReference) {
      detectCycle(token.path);
    }
  }
}

/**
 * Resolve a reference path by converting JSON pointer format to dot notation
 */
function resolveReferencePath(ref: string): string {
  // Remove #/ prefix and /$value suffix, convert slashes to dots
  return ref
    .replace(/^#\//, "")
    .replace(/\/\$value$/, "")
    .replace(/\//g, ".");
}
