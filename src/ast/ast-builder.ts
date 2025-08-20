import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isToken, isTokenGroup } from "../core/token/guards.js";
import { extractReferences } from "../core/token/operations.js";
import type { TokenDocument, TokenOrGroup } from "../types.js";
import type { ASTNode, GroupNode, TokenNode } from "./types.js";

/**
 * Load AST from a token file path
 */
export async function loadAST(filePath: string): Promise<GroupNode> {
  const absolutePath = join(process.cwd(), filePath);
  const content = await readFile(absolutePath, "utf-8");
  const document = JSON.parse(content) as TokenDocument;
  return createAST(document);
}

/**
 * Create AST from a token document
 */
export function createAST(
  document: TokenDocument,
  parentPath = "",
  parent?: ASTNode,
): GroupNode {
  const root = createGroupNode(parentPath, parent);

  // Process each entry in the document
  for (const [key, value] of Object.entries(document)) {
    if (key.startsWith("$")) {
      addMetadataToNode(root, key, value);
      continue;
    }

    const path = buildPath(parentPath, key);
    addChildNode(root, key, value, path);
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
): void {
  if (isToken(value)) {
    const token = createTokenNode(key, path, value, parent);
    parent.tokens.set(key, token);
    parent.children.set(key, token);
  } else if (isTokenGroup(value)) {
    const group = createAST(value as TokenDocument, path, parent);
    group.name = key;
    parent.groups.set(key, group);
    parent.children.set(key, group);
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
): TokenNode {
  const rawReferences = extractReferences(token);

  // Normalize references (convert #/path/to/token and {path.to.token} to path.to.token)
  const references = rawReferences.map((ref) => {
    return ref
      .replace(/^\{|\}$/g, "") // Remove DTCG braces
      .replace(/^#\//, "") // Remove JSON Schema prefix
      .replace(/\//g, "."); // Convert slashes to dots
  });

  const node: TokenNode = {
    type: "token",
    name,
    path,
    parent,
    ...(token.$value !== undefined ? { value: token.$value } : {}),
    ...(token.$type ? { tokenType: token.$type as string } : {}),
    ...(references.length > 0 ? { references } : {}),
    resolved: references.length === 0,
    metadata: {},
  } as TokenNode;

  // Extract metadata
  if (token.$description) {
    node.metadata = { ...node.metadata, description: token.$description };
  }
  if (token.$extensions) {
    node.metadata = { ...node.metadata, extensions: token.$extensions };
  }

  return node;
}
