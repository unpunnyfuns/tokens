/**
 * @module core/ast-inference
 * @description Pass 4: Type inference through reference chains
 */

import type { EnhancedAST } from "./ast-types.ts";

/**
 * Pass 4: Infer types through reference chains
 */
export function pass4_inferTypes(ast: EnhancedAST): void {
  const typeCache = new Map<string, string>();

  function getTokenType(
    tokenPath: string,
    visited = new Set<string>(),
  ): string | undefined {
    // Prevent infinite recursion
    if (visited.has(tokenPath)) return undefined;
    visited.add(tokenPath);

    // Check cache
    if (typeCache.has(tokenPath)) {
      return typeCache.get(tokenPath);
    }

    const token = ast.tokenMap.get(tokenPath);
    if (!token) return undefined;

    // If token has explicit type, use it
    if (token.tokenType) {
      typeCache.set(tokenPath, token.tokenType);
      return token.tokenType;
    }

    // Try to infer from references
    if (token.hasReference) {
      const ref = ast.references.find((r) => r.from === tokenPath && r.isValid);
      if (ref?.resolvedPath) {
        const inferredType = getTokenType(ref.resolvedPath, visited);
        if (inferredType) {
          token.resolvedType = inferredType;
          ast.typeInference.set(tokenPath, inferredType);
          ast.stats.tokensWithInferredTypes++;
          typeCache.set(tokenPath, inferredType);
          return inferredType;
        }
      }
    }

    // Check if value structure implies a type
    const impliedType = inferTypeFromValue(token.value);
    if (impliedType) {
      token.resolvedType = impliedType;
      ast.typeInference.set(tokenPath, impliedType);
      ast.stats.tokensWithInferredTypes++;
      typeCache.set(tokenPath, impliedType);
      return impliedType;
    }

    return undefined;
  }

  // Infer types for all tokens
  for (const token of ast.tokens) {
    if (!token.tokenType && !token.resolvedType) {
      getTokenType(token.path);
    }
  }
}

/**
 * Infer token type from value structure and patterns
 */
function inferTypeFromValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    // Check for common patterns
    if (/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value)) return "color";
    if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(value)) return "dimension";
    if (/^\d+(\.\d+)?ms$/.test(value)) return "duration";
  } else if (typeof value === "number") {
    return "number";
  } else if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    // Check for known composite structures
    if ("colorSpace" in obj && "components" in obj) return "color";
    if ("fontFamily" in obj || "fontSize" in obj) return "typography";
    if ("color" in obj && "offsetX" in obj && "offsetY" in obj) return "shadow";
    if ("color" in obj && "width" in obj && "style" in obj) return "border";
  }
  return undefined;
}
