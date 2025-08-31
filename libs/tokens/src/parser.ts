/**
 * Token document parsing and loading
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { GroupNode, TokenAST, TokenNode } from "@upft/ast";
import type { Token, TokenDocument, TokenGroup } from "@upft/foundation";
import type { TokenParseOptions, TokenParseResult } from "./types.js";

/**
 * Load and parse a token file
 */
export async function loadTokenFile(
  filePath: string,
  basePath?: string,
): Promise<TokenAST> {
  const resolvedBasePath = basePath || process.cwd();
  const absolutePath = resolve(resolvedBasePath, filePath);

  try {
    const content = await readFile(absolutePath, "utf-8");
    const document = JSON.parse(content) as TokenDocument;

    const result = parseTokenDocument(document, {
      filePath: absolutePath,
      basePath: resolvedBasePath,
    });

    if (result.warnings.length > 0) {
      console.warn(`Warnings parsing ${filePath}:`, result.warnings);
    }

    return result.ast;
  } catch (error) {
    throw new Error(
      `Failed to load token file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Convert token document to TokenAST
 */
export function parseTokenDocument(
  document: TokenDocument,
  options: TokenParseOptions,
): TokenParseResult {
  const warnings: string[] = [];

  // Create root TokenAST
  const ast: TokenAST = {
    type: "file",
    name:
      options.filePath
        .split("/")
        .pop()
        ?.replace(/\.[^/.]+$/, "") || "tokens",
    path: options.filePath,
    filePath: options.filePath,
    crossFileReferences: new Map(),
    children: new Map(),
    tokens: new Map(),
    groups: new Map(),
    metadata: {
      tokenCount: 0,
      groupCount: 0,
      hasReferences: false,
    },
  };

  // Parse document content
  parseObject(document, ast, "", warnings);

  // Update metadata
  if (ast.metadata) {
    ast.metadata.tokenCount = ast.tokens.size;
    ast.metadata.groupCount = ast.groups.size;
    ast.metadata.hasReferences = hasReferences(ast);
  }

  return {
    ast,
    source: document,
    warnings,
  };
}

function parseObject(
  obj: Record<string, unknown>,
  parent: TokenAST | GroupNode,
  pathPrefix: string,
  warnings: string[],
): void {
  for (const [key, value] of Object.entries(obj)) {
    // Skip meta properties
    if (key.startsWith("$")) {
      continue;
    }

    const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (isToken(value)) {
      // Create token node
      const token = createTokenNode(key, value, currentPath, parent);
      parent.tokens.set(key, token);
      parent.children.set(key, token);
    } else if (isTokenGroup(value)) {
      // Create group node
      const group = createGroupNode(key, currentPath, parent);
      parent.groups.set(key, group);
      parent.children.set(key, group);

      // Recursively parse group contents
      parseObject(value, group, currentPath, warnings);
    } else {
      warnings.push(`Skipping unknown property: ${currentPath}`);
    }
  }
}

function isToken(value: unknown): value is Token {
  return value !== null && typeof value === "object" && "$value" in value;
}

function isTokenGroup(value: unknown): value is TokenGroup {
  return value !== null && typeof value === "object" && !("$value" in value);
}

function createTokenNode(
  name: string,
  token: Token,
  path: string,
  parent: TokenAST | GroupNode,
): TokenNode {
  const tokenType = (token.$type || "color") as TokenNode["tokenType"];
  const references = extractReferences(token.$value);
  const referencesArray = references.map((ref) => `{${ref}}` as const);

  // Ensure we have a valid $value and cast appropriately
  const tokenValue = token.$value ?? "";

  const tokenNode: TokenNode = {
    type: "token",
    name,
    path,
    parent,
    tokenType,
    typedValue: {
      $type: tokenType,
      $value: tokenValue as never, // Type assertion for complex union type
    },
    references: referencesArray,
    resolved: references.length === 0,
    metadata: {
      description: token.$description,
      extensions: extractExtensions(token),
    },
  };

  return tokenNode;
}

function createGroupNode(
  name: string,
  path: string,
  parent: TokenAST | GroupNode,
): GroupNode {
  return {
    type: "group",
    name,
    path,
    parent,
    children: new Map(),
    tokens: new Map(),
    groups: new Map(),
  };
}

function extractReferences(value: unknown): string[] {
  const references: string[] = [];

  if (typeof value === "string" && value.includes("{") && value.includes("}")) {
    // Extract reference patterns like {color.primary}
    const matches = value.match(/\{([^}]+)\}/g);
    if (matches) {
      references.push(...matches.map((match) => match.slice(1, -1)));
    }
  }

  return references;
}

function extractExtensions(token: Token): Record<string, unknown> {
  const extensions: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(token)) {
    if (
      !(
        key.startsWith("$") && ["$value", "$type", "$description"].includes(key)
      )
    ) {
      extensions[key] = value;
    }
  }

  return extensions;
}

function hasReferences(ast: TokenAST): boolean {
  for (const token of ast.tokens.values()) {
    if (token.references && token.references.length > 0) {
      return true;
    }
  }

  for (const group of ast.groups.values()) {
    if (groupHasReferences(group)) {
      return true;
    }
  }

  return false;
}

function groupHasReferences(group: GroupNode): boolean {
  for (const token of group.tokens.values()) {
    if (token.references && token.references.length > 0) {
      return true;
    }
  }

  for (const childGroup of group.groups.values()) {
    if (groupHasReferences(childGroup)) {
      return true;
    }
  }

  return false;
}
