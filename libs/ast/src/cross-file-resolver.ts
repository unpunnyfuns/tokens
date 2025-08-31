/**
 * Cross-file reference resolution for ProjectAST
 */

import type { TypedToken } from "./token-types.js";
import type {
  ASTNode,
  CrossFileReference,
  GroupNode,
  ProjectAST,
  ResolutionError,
  TokenAST,
  TokenNode,
} from "./types.js";

export interface CrossFileResolutionResult {
  success: boolean;
  errors: ResolutionError[];
  resolvedReferences: number;
}

/**
 * Resolve all intra-file (local) references within a single file
 */
function resolveIntraFileReferences(file: TokenAST, project: ProjectAST): void {
  const visitedTokens = new Set<string>();

  // Extract local references from a token
  function getLocalReferences(token: TokenNode): string[] {
    return token.references
      ? token.references.filter((ref: string) => !parseCrossFileRef(ref))
      : [];
  }

  // Resolve a token with no references
  function resolveBaseToken(token: TokenNode): void {
    token.resolved = true;
    if (token.typedValue) {
      token.resolvedValue = token.typedValue;
    }
  }

  // Attempt to resolve a token with local references
  function attemptTokenResolution(token: TokenNode): void {
    try {
      resolveTokenValue(token, file, project, visitedTokens);
    } catch (_error) {
      // Skip tokens that can't be resolved (might depend on cross-file references)
      // This is normal for tokens with circular dependencies
    }
  }

  // Re-resolve an already resolved token that has local references
  function reResolveToken(token: TokenNode): void {
    try {
      // Reset resolved status to force re-resolution
      token.resolved = false;
      resolveTokenValue(token, file, project, visitedTokens);
    } catch (_error) {
      // Restore resolved status if re-resolution fails
      token.resolved = true;
    }
  }

  // Process a single token for resolution
  function processToken(token: TokenNode): void {
    const localReferences = getLocalReferences(token);

    if (!token.resolved) {
      if (!token.references || token.references.length === 0) {
        resolveBaseToken(token);
      } else if (localReferences.length > 0) {
        attemptTokenResolution(token);
      }
    } else if (localReferences.length > 0) {
      reResolveToken(token);
    } else if (!token.resolvedValue && token.typedValue) {
      // Token is resolved but doesn't have resolvedValue set - copy from typedValue
      token.resolvedValue = token.typedValue;
    }
  }

  // Recursively resolve all tokens in the file
  function resolveTokensInNode(node: TokenAST | GroupNode): void {
    for (const token of node.tokens.values()) {
      processToken(token);
    }

    // Recurse into child groups
    if ("groups" in node) {
      for (const childGroup of node.groups.values()) {
        resolveTokensInNode(childGroup);
      }
    }
  }

  resolveTokensInNode(file);
}

/**
 * Create error for intra-file resolution failure
 */
function createIntraFileError(
  filePath: string,
  error: unknown,
  phase: string,
): ResolutionError {
  return {
    type: "cross-file",
    path: "",
    message: `Failed to resolve ${phase} intra-file references in ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    reference: "",
    filePath,
  };
}

/**
 * Resolve all intra-file references across all files
 */
function resolveAllIntraFileReferences(
  project: ProjectAST,
  errors: ResolutionError[],
  phase: string,
): void {
  for (const [filePath, file] of project.files) {
    try {
      resolveIntraFileReferences(file, project);
    } catch (error) {
      errors.push(createIntraFileError(filePath, error, phase));
    }
  }
}

/**
 * Process cross-file references for resolution
 */
function processCrossFileReferences(
  project: ProjectAST,
  errors: ResolutionError[],
): number {
  let resolvedReferences = 0;

  for (const [filePath, crossRefs] of project.crossFileReferences) {
    const sourceFile = project.files.get(filePath);
    if (!sourceFile) continue;

    for (const crossRef of crossRefs) {
      const result = resolveSingleCrossFileReference(
        project,
        sourceFile,
        crossRef,
      );
      if (result.success) {
        resolvedReferences++;
        crossRef.resolved = true;
      } else {
        errors.push(...result.errors);
      }
    }
  }

  return resolvedReferences;
}

/**
 * Resolve all cross-file references in a project
 */
export function resolveCrossFileReferences(
  project: ProjectAST,
): CrossFileResolutionResult {
  const errors: ResolutionError[] = [];

  // Step 1: Resolve all intra-file references in each file first
  // This ensures that when we resolve cross-file references, target tokens are fully resolved
  resolveAllIntraFileReferences(project, errors, "first-pass");

  // Step 2: Process each file's cross-file references
  const resolvedReferences = processCrossFileReferences(project, errors);

  // Step 3: Second pass of intra-file resolution for DTCG aliases that may now reference cross-file resolved values
  resolveAllIntraFileReferences(project, errors, "second-pass");

  return {
    success: errors.length === 0,
    errors,
    resolvedReferences,
  };
}

/**
 * Resolve a single cross-file reference
 */
function resolveSingleCrossFileReference(
  project: ProjectAST,
  sourceFile: TokenAST,
  crossRef: CrossFileReference,
): { success: boolean; errors: ResolutionError[] } {
  const errors: ResolutionError[] = [];

  // Find target file
  const targetFile = project.files.get(crossRef.toFile);
  if (!targetFile) {
    errors.push({
      type: "cross-file",
      path: crossRef.fromToken,
      message: `Target file not found: ${crossRef.toFile}`,
      reference: crossRef.reference,
      filePath: sourceFile.filePath,
      targetFile: crossRef.toFile,
    });
    return { success: false, errors };
  }

  // Find target token
  const targetToken = findTokenByPath(targetFile, crossRef.toToken);
  if (!targetToken) {
    errors.push({
      type: "cross-file",
      path: crossRef.fromToken,
      message: `Target token not found: ${crossRef.toToken} in ${crossRef.toFile}`,
      reference: crossRef.reference,
      filePath: sourceFile.filePath,
      targetFile: crossRef.toFile,
    });
    return { success: false, errors };
  }

  // Find source token and update its value
  const sourceToken = findTokenByPath(sourceFile, crossRef.fromToken);
  if (!sourceToken) {
    errors.push({
      type: "cross-file",
      path: crossRef.fromToken,
      message: `Source token not found: ${crossRef.fromToken}`,
      reference: crossRef.reference,
      filePath: sourceFile.filePath,
    });
    return { success: false, errors };
  }

  // Resolve the reference
  try {
    const resolvedValue = resolveTokenValue(targetToken, targetFile, project);
    updateTokenWithResolvedValue(
      sourceToken,
      crossRef.reference,
      resolvedValue,
    );

    return { success: true, errors: [] };
  } catch (error) {
    errors.push({
      type: "cross-file",
      path: crossRef.fromToken,
      message: `Resolution failed: ${error instanceof Error ? error.message : String(error)}`,
      reference: crossRef.reference,
      filePath: sourceFile.filePath,
      targetFile: crossRef.toFile,
    });
    return { success: false, errors };
  }
}

/**
 * Find a token by its dot-notation path within a file
 */
function findTokenByPath(file: TokenAST, tokenPath: string): TokenNode | null {
  const pathParts = tokenPath.split(".");
  let currentNode: TokenAST | TokenNode = file;

  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    if (!part) return null;

    const nextNode = getChildNode(currentNode, part);
    if (!nextNode) return null;

    if (isLastPathPart(i, pathParts)) {
      return getTokenFromNode(nextNode);
    }

    if (!isValidIntermediateNode(nextNode)) return null;
    currentNode = nextNode as TokenAST | TokenNode;
  }

  return null;
}

/**
 * Get child node from current node
 */
function getChildNode(
  currentNode: TokenAST | TokenNode,
  part: string,
): ASTNode | undefined {
  if (hasChildren(currentNode)) {
    return currentNode.children.get(part);
  }
  return undefined;
}

/**
 * Check if node has children property
 */
function hasChildren(node: TokenAST | TokenNode): node is TokenAST {
  return "children" in node;
}

/**
 * Check if this is the last part of the path
 */
function isLastPathPart(index: number, pathParts: string[]): boolean {
  return index === pathParts.length - 1;
}

/**
 * Get token from node if it's a token type
 */
function getTokenFromNode(node: ASTNode): TokenNode | null {
  return node.type === "token" ? (node as TokenNode) : null;
}

/**
 * Check if node is valid for intermediate path traversal
 */
function isValidIntermediateNode(node: ASTNode): boolean {
  return node.type === "group" || node.type === "file";
}

/**
 * Resolve a token's value, handling nested references
 */
function resolveTokenValue(
  token: TokenNode,
  containingFile: TokenAST,
  project: ProjectAST,
  visitedTokens = new Set<string>(),
): TypedToken {
  const tokenId = `${containingFile.filePath}:${token.path}`;

  if (visitedTokens.has(tokenId)) {
    throw new Error(`Circular reference detected: ${tokenId}`);
  }

  const cachedResult = getResolvedTokenValue(token);
  if (cachedResult !== null) {
    return cachedResult;
  }

  visitedTokens.add(tokenId);

  try {
    const resolvedValue = resolveTokenReferences(
      token,
      containingFile,
      project,
      visitedTokens,
    );

    // Mark as resolved
    token.resolved = true;
    token.resolvedValue = resolvedValue;

    return resolvedValue;
  } finally {
    visitedTokens.delete(tokenId);
  }
}

/**
 * Get cached resolved value if available
 */
function getResolvedTokenValue(token: TokenNode): TypedToken | null {
  // If already resolved, return the resolved value
  if (token.resolved && token.resolvedValue !== undefined) {
    return token.resolvedValue;
  }

  // If no references, return the typed value
  if (!token.references || token.references.length === 0) {
    return token.typedValue ?? null;
  }

  return null;
}

/**
 * Resolve all references in a token
 */
function resolveTokenReferences(
  token: TokenNode,
  containingFile: TokenAST,
  project: ProjectAST,
  visitedTokens: Set<string>,
): TypedToken {
  let resolvedValue =
    token.typedValue ??
    ({ $type: "color", $value: "" } as unknown as TypedToken);

  if (!token.references) return resolvedValue;

  for (const reference of token.references) {
    const crossFileRef = parseCrossFileRef(reference);
    if (crossFileRef) {
      resolvedValue = resolveCrossFileReference(
        resolvedValue,
        reference,
        crossFileRef,
        project,
        visitedTokens,
      );
    } else {
      resolvedValue = resolveLocalReference(
        resolvedValue,
        reference,
        containingFile,
        project,
        visitedTokens,
      );
    }
  }

  return resolvedValue;
}

/**
 * Resolve a cross-file reference
 */
function resolveCrossFileReference(
  currentValue: TypedToken,
  reference: string,
  crossFileRef: { filePath: string; tokenPath: string },
  project: ProjectAST,
  visitedTokens: Set<string>,
): TypedToken {
  const targetFile = project.files.get(crossFileRef.filePath);
  if (!targetFile) {
    // For HTTP URLs, the file should have been pre-loaded during project creation
    if (
      crossFileRef.filePath.startsWith("http://") ||
      crossFileRef.filePath.startsWith("https://")
    ) {
      console.warn(`HTTP file not pre-loaded: ${crossFileRef.filePath}`);
    }
    return currentValue;
  }

  const targetToken = findTokenByPath(targetFile, crossFileRef.tokenPath);
  if (!targetToken) return currentValue;

  const targetValue = resolveTokenValue(
    targetToken,
    targetFile,
    project,
    visitedTokens,
  );

  return replaceReferenceInValue(currentValue, reference, targetValue);
}

/**
 * Resolve a local reference within the same file
 */
function resolveLocalReference(
  currentValue: TypedToken,
  reference: string,
  containingFile: TokenAST,
  project: ProjectAST,
  visitedTokens: Set<string>,
): TypedToken {
  // Remove braces from DTCG alias to get actual token path
  const tokenPath = reference.replace(/^\{|\}$/g, "");

  // First try to find the token in the current file
  let targetToken = findTokenByPath(containingFile, tokenPath);
  let targetFile = containingFile;

  // If not found in current file, search across all files in the project
  if (!targetToken) {
    for (const [, fileAST] of project.files) {
      targetToken = findTokenByPath(fileAST, tokenPath);
      if (targetToken) {
        targetFile = fileAST;
        break;
      }
    }
  }

  if (!targetToken) {
    return currentValue;
  }
  const targetValue = resolveTokenValue(
    targetToken,
    targetFile, // Use the correct file where the token was found
    project,
    visitedTokens,
  );

  return replaceReferenceInValue(currentValue, reference, targetValue);
}

/**
 * Parse a cross-file reference string
 */
function parseCrossFileRef(
  reference: string,
): { filePath: string; tokenPath: string } | null {
  // Handle ../path/file.json#token.path
  const fileRefMatch = reference.match(/^(\.\.?\/[^#]+\.json)#(.+)$/);
  if (fileRefMatch) {
    const filePath = fileRefMatch[1];
    const tokenPath = fileRefMatch[2];
    if (!(filePath && tokenPath)) return null;
    return { filePath, tokenPath };
  }

  // Handle file:// URI references: file://path/file.json#token.path
  const fileUriMatch = reference.match(/^(file:\/\/[^#]+\.json)#(.+)$/);
  if (fileUriMatch) {
    const fileUri = fileUriMatch[1];
    const tokenPath = fileUriMatch[2];
    if (!(fileUri && tokenPath)) return null;
    return { filePath: fileUri, tokenPath };
  }

  // Handle HTTP/HTTPS URL references: https://some.domain.com/token.json#token.path
  const httpUrlMatch = reference.match(/^(https?:\/\/[^#]+\.json)#(.+)$/);
  if (httpUrlMatch) {
    const url = httpUrlMatch[1];
    const tokenPath = httpUrlMatch[2];
    if (!(url && tokenPath)) return null;
    return { filePath: url, tokenPath };
  }

  return null;
}

/**
 * Process array item for reference replacement
 */
function processArrayItem(
  item: unknown,
  reference: string,
  resolvedValue: TypedToken,
): unknown {
  if (typeof item === "string" && item === reference) {
    return resolvedValue.$value;
  }
  if (typeof item === "object" && item !== null) {
    return processObjectValue(
      item as Record<string, unknown>,
      reference,
      resolvedValue,
    );
  }
  return item;
}

/**
 * Process object value for reference replacement
 */
function processObjectValue(
  obj: Record<string, unknown>,
  reference: string,
  resolvedValue: TypedToken,
): Record<string, unknown> {
  const result = { ...obj };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === "string" && value === reference) {
      result[key] = resolvedValue.$value;
    }
  }
  return result;
}

/**
 * Replace a reference in a typed token value with the resolved value
 */
function replaceReferenceInValue(
  currentValue: TypedToken,
  reference: string,
  resolvedValue: TypedToken,
): TypedToken {
  // For TypedToken, we need to handle the $value property specifically
  const result = { ...currentValue };

  if (typeof result.$value === "string") {
    // Direct string replacement for references like "{colors.primary}"
    if (result.$value === reference) {
      return resolvedValue;
    }
    // Handle string interpolation within $value
    const refPattern = new RegExp(`\\{${escapeRegExp(reference)}\\}`, "g");
    const newValue = result.$value.replace(
      refPattern,
      String(resolvedValue.$value),
    );
    if (newValue !== result.$value) {
      (result as { $value: string }).$value = newValue; // Type assertion needed for complex value replacement
    }
    return result;
  }

  if (Array.isArray(result.$value)) {
    // Handle arrays (like gradient stops or shadow arrays)
    const newValue = result.$value.map((item) =>
      processArrayItem(item, reference, resolvedValue),
    );
    (result as { $value: unknown[] }).$value = newValue;
    return result;
  }

  if (typeof result.$value === "object" && result.$value !== null) {
    // Handle nested objects in $value
    const newValue = processObjectValue(
      result.$value as unknown as Record<string, unknown>,
      reference,
      resolvedValue,
    );
    (result as unknown as { $value: Record<string, unknown> }).$value =
      newValue;
    return result;
  }

  return result;
}

/**
 * Update a token with resolved cross-file reference
 */
function updateTokenWithResolvedValue(
  token: TokenNode,
  reference: string,
  resolvedValue: TypedToken,
): void {
  if (!token.resolvedValue) {
    token.resolvedValue =
      token.typedValue ??
      ({ $type: "color", $value: "" } as unknown as TypedToken);
  }

  token.resolvedValue = replaceReferenceInValue(
    token.resolvedValue,
    reference,
    resolvedValue,
  );

  // Update resolved status
  if (token.references) {
    const unresolvedRefs = token.references.filter((ref) => ref !== reference);
    token.resolved = unresolvedRefs.length === 0;
  }
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\\]]/g, "\\$&");
}

/**
 * Validate cross-file references without resolving them
 */
export function validateCrossFileReferences(
  project: ProjectAST,
): ResolutionError[] {
  const errors: ResolutionError[] = [];

  for (const [filePath, crossRefs] of project.crossFileReferences) {
    for (const crossRef of crossRefs) {
      // Check if target file exists
      if (!project.files.has(crossRef.toFile)) {
        errors.push({
          type: "cross-file",
          path: crossRef.fromToken,
          message: `Target file not found: ${crossRef.toFile}`,
          reference: crossRef.reference,
          filePath,
          targetFile: crossRef.toFile,
        });
        continue;
      }

      // Check if target token exists
      const targetFile = project.files.get(crossRef.toFile);
      if (!targetFile) continue;
      const targetToken = findTokenByPath(targetFile, crossRef.toToken);
      if (!targetToken) {
        errors.push({
          type: "cross-file",
          path: crossRef.fromToken,
          message: `Target token not found: ${crossRef.toToken} in ${crossRef.toFile}`,
          reference: crossRef.reference,
          filePath,
          targetFile: crossRef.toFile,
        });
      }
    }
  }

  return errors;
}
