import type { TokenDocument, TokenOrGroup } from "@upft/foundation";
import { extractReferences, isToken, isTokenGroup } from "@upft/foundation";
import type { TokenReference, TokenType, TypedToken } from "./token-types.js";
import type { ASTNode, GroupNode, TokenNode } from "./types.js";

/**
 * Create AST from a token document
 *
 * @param document - Token document to convert to AST
 * @param parentPath - Path prefix for nodes (optional)
 * @param parent - Parent AST node (optional)
 * @param inheritedType - Type inherited from parent group (optional)
 * @returns Root AST group node
 */
export function createAST(
  document: TokenDocument,
  parentPath = "",
  parent?: ASTNode,
  inheritedType?: string,
): GroupNode {
  const root = createGroupNode(parentPath, parent);

  // Extract $type from this group (if any)
  const groupType = extractGroupType(document, inheritedType);

  // Process each entry in the document
  for (const [key, value] of Object.entries(document)) {
    if (key.startsWith("$")) {
      addMetadataToNode(root, key, value);
      continue;
    }

    const path = buildPath(parentPath, key);
    addChildNode(root, key, value, path, groupType);
  }

  return root;
}

/**
 * Create a new group node
 */
function createGroupNode(parentPath: string, parent?: ASTNode): GroupNode {
  return {
    type: "group",
    path: parentPath,
    name: extractNodeName(parentPath),
    ...(parent ? { parent } : {}),
    children: new Map(),
    tokens: new Map(),
    groups: new Map(),
    metadata: {},
  } as GroupNode;
}

/**
 * Extract node name from path
 */
function extractNodeName(path: string): string {
  return path ? (path.split(".").pop() ?? "root") : "root";
}

/**
 * Build a dot-notation path
 */
function buildPath(parentPath: string, key: string): string {
  return parentPath ? `${parentPath}.${key}` : key;
}

/**
 * Add metadata to a node
 */
function addMetadataToNode(node: GroupNode, key: string, value: unknown): void {
  if (key === "$description") {
    node.metadata = { ...node.metadata, description: value };
  } else if (key === "$extensions") {
    node.metadata = { ...node.metadata, extensions: value };
  }
}

/**
 * Add a child node (token or group) to a parent group
 */
function addChildNode(
  parent: GroupNode,
  key: string,
  value: unknown,
  path: string,
  inheritedType?: string,
): void {
  if (isToken(value)) {
    const token = createTokenNode(key, path, value, parent, inheritedType);
    parent.tokens.set(key, token);
    parent.children.set(key, token);
  } else if (isTokenGroup(value)) {
    const group = createAST(
      value as TokenDocument,
      path,
      parent,
      inheritedType,
    );
    group.name = key;
    parent.groups.set(key, group);
    parent.children.set(key, group);
  }
}

/**
 * Extract cross-file references from JSON $ref properties
 */
function extractJsonRefCrossFileReferences(token: TokenOrGroup): string[] {
  const crossFileReferences: string[] = [];

  if (
    typeof token === "object" &&
    "$ref" in token &&
    typeof token.$ref === "string"
  ) {
    const ref = token.$ref;
    // Only treat $refs with URIs or file paths as cross-file
    if (ref.match(/^(https?:\/\/|file:\/\/|\.\.?\/)/)) {
      crossFileReferences.push(ref);
    }
  }

  return crossFileReferences;
}

/**
 * Extract cross-file references from string values
 */
function extractValueCrossFileReferences(token: TokenOrGroup): string[] {
  const crossFileReferences: string[] = [];

  if (typeof token.$value === "string") {
    const value = token.$value;
    const patterns = [
      /^(\.\.?\/[^#]+\.json)#(.+)$/, // File-relative references
      /^(file:\/\/[^#]+\.json)#(.+)$/, // file:// URI references
      /^(https?:\/\/[^#]+\.json)#(.+)$/, // HTTP/HTTPS URL references
    ];

    for (const pattern of patterns) {
      if (pattern.test(value)) {
        crossFileReferences.push(value);
        break; // Only match first pattern
      }
    }
  }

  return crossFileReferences;
}

/**
 * Separate DTCG aliases from cross-file references
 * Note: $ref are handled separately by the reference resolver during assembly phase
 */
function separateReferences(allReferences: string[]): {
  dtcgAliases: string[];
  crossFileRefs: string[];
} {
  const dtcgAliases: string[] = [];
  const crossFileRefs: string[] = [];

  for (const ref of allReferences) {
    if (ref.match(/^(https?:\/\/|file:\/\/|\.\.?\/)/)) {
      crossFileRefs.push(ref);
    } else if (ref.startsWith("#/")) {
      // Skip $ref - these are handled by reference resolver during assembly phase
    } else {
      // This is a DTCG alias - normalize to {token.path} format
      const normalized = ref
        .replace(/^\{|\}$/g, "") // Remove existing braces
        .replace(/\//g, "."); // Convert slashes to dots
      dtcgAliases.push(`{${normalized}}`);
    }
  }

  return { dtcgAliases, crossFileRefs };
}

/**
 * Extract $type from a group, considering inheritance
 */
function extractGroupType(
  document: TokenDocument,
  inheritedType?: string,
): string | undefined {
  // Direct $type on this group
  if (document.$type && typeof document.$type === "string") {
    return document.$type;
  }

  // Inherited from parent
  return inheritedType;
}

/**
 * Get effective type for a token, considering inheritance and UPFT constraints
 */
function getEffectiveType(
  token: TokenOrGroup,
  inheritedType?: string,
  path?: string,
): string | undefined {
  const tokenType = token.$type as string;

  // If group has a type, token cannot override it
  if (inheritedType && tokenType && tokenType !== inheritedType) {
    throw new Error(
      `Token at path "${path}" has $type "${tokenType}" but parent group requires type "${inheritedType}". ` +
        `Type overrides are not allowed in UPFT.`,
    );
  }

  return tokenType || inheritedType;
}

/**
 * Create typed value from token
 */
function createTypedValue(
  token: TokenOrGroup,
  path: string,
  inheritedType?: string,
): { tokenType: TokenType; typedValue: TypedToken } {
  const tokenType = getEffectiveType(token, inheritedType, path) as TokenType;
  if (!tokenType) {
    throw new Error(
      `Token at path "${path}" must have a $type property or inherit type from parent group`,
    );
  }

  const typedValue: TypedToken = {
    $type: tokenType,
    $value: token.$value,
  } as TypedToken;

  return { tokenType, typedValue };
}

/**
 * Add metadata to token node
 */
function addMetadata(node: TokenNode, token: TokenOrGroup): void {
  if (token.$description) {
    node.metadata = { ...node.metadata, description: token.$description };
  }
  if (token.$extensions) {
    node.metadata = { ...node.metadata, extensions: token.$extensions };
  }
}

/**
 * Create a token node from a token value
 */
function createTokenNode(
  name: string,
  path: string,
  token: TokenOrGroup,
  parent: ASTNode,
  inheritedType?: string,
): TokenNode {
  const rawReferences = extractReferences(token);
  const jsonRefCrossFileReferences = extractJsonRefCrossFileReferences(token);
  const valueCrossFileReferences = extractValueCrossFileReferences(token);

  // Combine all references
  const allReferences = [
    ...rawReferences,
    ...jsonRefCrossFileReferences,
    ...valueCrossFileReferences,
  ];
  const { dtcgAliases, crossFileRefs } = separateReferences(allReferences);
  const references = [...dtcgAliases, ...crossFileRefs] as TokenReference[];

  const { tokenType, typedValue } = createTypedValue(
    token,
    path,
    inheritedType,
  );

  const node: TokenNode = {
    type: "token",
    name,
    path,
    parent,
    tokenType,
    typedValue,
    ...(references.length > 0 ? { references } : {}),
    resolved: references.length === 0,
    ...(references.length === 0 ? { resolvedValue: typedValue } : {}),
    metadata: {},
  };

  addMetadata(node, token);
  return node;
}
