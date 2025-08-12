/**
 * @module core/ast-builder
 * @description Pass 1: Basic token/group structure building
 */

import type { ASTGroup, ASTToken, EnhancedAST, Token } from "./ast-types.ts";
import { extractReference, hasReference } from "./utils.ts";

/**
 * Pass 1: Build basic token/group structure
 */
export function pass1_buildStructure(
  tokens: Record<string, unknown>,
  ast: EnhancedAST,
): void {
  function processNode(
    obj: Record<string, unknown>,
    path = "",
    parent: ASTGroup | EnhancedAST = ast,
  ): void {
    for (const key in obj) {
      // Skip special keys
      if (
        key.startsWith("$") &&
        key !== "$value" &&
        key !== "$type" &&
        key !== "$description"
      ) {
        continue;
      }

      const value = obj[key];
      const currentPath = path ? `${path}.${key}` : key;

      if (isToken(value)) {
        const tokenValue = value as Token;
        const token: ASTToken = {
          type: "Token",
          path: currentPath,
          name: key,
          tokenType: tokenValue.$type,
          value: tokenValue.$value,
          description: tokenValue.$description,
          extensions: getExtensions(tokenValue),
          hasReference: hasReference(tokenValue.$value),
          referenceDepth: -1, // Will be calculated in later pass
          isValid: true, // Assume valid until proven otherwise
        };

        // Add to parent's tokens
        if ("tokens" in parent) {
          parent.tokens.push(token);
        }

        // Add to global token list and map
        ast.tokens.push(token);
        ast.tokenMap.set(currentPath, token);
        ast.stats.totalTokens++;

        // Track raw references (will be validated in pass 2)
        if (token.hasReference) {
          const refTarget = extractReference(tokenValue.$value);
          ast.references.push({
            from: currentPath,
            to: refTarget,
            isValid: false, // Will be validated in pass 2
          });
          ast.stats.totalReferences++;
        }
      } else if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        const valueObj = value as Record<string, unknown>;
        const group: ASTGroup = {
          type: "TokenGroup",
          path: currentPath,
          name: key,
          description: valueObj.$description as string | undefined,
          children: [],
          tokens: [],
          groups: [],
        };

        // Add to parent
        if ("children" in parent && "groups" in parent) {
          parent.children.push(group);
          parent.groups.push(group);
        }

        // Add to global group list and map
        ast.groups.push(group);
        ast.groupMap.set(currentPath, group);
        ast.stats.totalGroups++;

        // Recurse into group
        processNode(valueObj, currentPath, group);
      }
    }
  }

  processNode(tokens);
}

/**
 * Check if a value represents a token
 */
function isToken(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return "$value" in obj || "$type" in obj;
}

/**
 * Extract extension properties from a token
 */
function getExtensions(token: Token): Record<string, unknown> | null {
  const extensions: Record<string, unknown> = {};
  for (const key in token) {
    if (
      key.startsWith("$") &&
      key !== "$value" &&
      key !== "$type" &&
      key !== "$description"
    ) {
      extensions[key] = token[key];
    }
  }
  return Object.keys(extensions).length > 0 ? extensions : null;
}
