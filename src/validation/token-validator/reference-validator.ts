/**
 * Reference validation utilities
 */

import { createAST } from "../../ast/ast-builder.js";
import { visitTokens } from "../../ast/ast-traverser.js";
import type { TokenNode } from "../../ast/types.js";
import type { ValidationError } from "../../types/validation.js";
import type { TokenDocument } from "../../types.js";

/**
 * Add token path to collection
 */
function addTokenPath(
  key: string,
  value: unknown,
  path: string,
  tokenPaths: Set<string>,
): void {
  const currentPath = path ? `${path}.${key}` : key;

  if (value && typeof value === "object" && "$value" in value) {
    tokenPaths.add(currentPath);
  }
}

/**
 * Collect paths from nested object
 */
function collectNestedPaths(
  value: unknown,
  currentPath: string,
  tokenPaths: Set<string>,
): void {
  if (value && typeof value === "object" && !("$value" in value)) {
    collectPaths(value, currentPath, tokenPaths);
  }
}

/**
 * Collect all token paths in a document
 */
function collectPaths(
  obj: unknown,
  path: string,
  tokenPaths: Set<string>,
): void {
  if (!obj || typeof obj !== "object") return;

  for (const [key, value] of Object.entries(obj)) {
    addTokenPath(key, value, path, tokenPaths);
    const currentPath = path ? `${path}.${key}` : key;
    collectNestedPaths(value, currentPath, tokenPaths);
  }
}

/**
 * Extract reference from string value
 */
function extractReferenceFromString(value: string): string[] {
  const paths: string[] = [];
  const dtcgMatch = value.match(/^\{([^}]+)\}$/);
  if (dtcgMatch?.[1]) {
    paths.push(dtcgMatch[1]);
  }
  return paths;
}

/**
 * Extract references from object value
 */
function extractReferenceFromObject(value: Record<string, unknown>): string[] {
  const paths: string[] = [];

  // JSON Schema $ref format
  if ("$ref" in value && typeof value.$ref === "string") {
    const refPath = value.$ref.replace(/^#\//, "").replace(/\//g, ".");
    paths.push(refPath);
  }

  // Recurse into nested values
  for (const v of Object.values(value)) {
    paths.push(...extractReferencePaths(v));
  }

  return paths;
}

/**
 * Extract reference paths from a value
 */
export function extractReferencePaths(value: unknown): string[] {
  if (typeof value === "string") {
    return extractReferenceFromString(value);
  }

  if (value && typeof value === "object") {
    return extractReferenceFromObject(value as Record<string, unknown>);
  }

  return [];
}

/**
 * Check if references in a document exist
 */
export function checkReferences(document: TokenDocument): ValidationError[] {
  const errors: ValidationError[] = [];
  const tokenPaths = new Set<string>();

  // Create AST for traversal
  const ast = createAST(document);

  // First pass: collect all token paths using AST
  visitTokens(ast, (tokenNode: TokenNode) => {
    tokenPaths.add(tokenNode.path);
    return true;
  });

  // Second pass: check references in each token
  visitTokens(ast, (tokenNode: TokenNode) => {
    if (tokenNode.references && tokenNode.references.length > 0) {
      for (const ref of tokenNode.references) {
        if (!tokenPaths.has(ref)) {
          errors.push({
            path: `/${tokenNode.path.replace(/\./g, "/")}`,
            message: `Reference to non-existent token: ${ref}`,
            severity: "error",
            rule: "reference-exists",
          });
        }
      }
    }
    return true;
  });

  return errors;
}
