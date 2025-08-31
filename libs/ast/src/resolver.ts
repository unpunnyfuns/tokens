import type { TokenDocument } from "@upft/foundation";
import { visitTokens } from "./ast-traverser.js";
import type { ASTNode, GroupNode, TokenNode } from "./types.js";

/**
 * Process a token node and add it to the document
 */
function processTokenNode(token: TokenNode, doc: TokenDocument): void {
  const segments = token.path.split(".");
  let current = doc;

  // Navigate to parent
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (segment) {
      if (!current[segment]) {
        current[segment] = {};
      }
      current = current[segment] as TokenDocument;
    }
  }

  // Set token value
  const lastSegment = segments[segments.length - 1];
  if (lastSegment) {
    current[lastSegment] = {
      $value: token.typedValue?.$value,
      ...(token.tokenType ? { $type: token.tokenType } : {}),
    };
  }
}

/**
 * Process a group node and its children
 */
function processGroupNode(node: ASTNode, doc: TokenDocument): void {
  const group = node as GroupNode;
  if (group.children) {
    for (const child of group.children.values()) {
      processNode(child, doc);
    }
  }
}

/**
 * Process an AST node
 */
function processNode(node: ASTNode, doc: TokenDocument): void {
  if (node.type === "token") {
    processTokenNode(node as TokenNode, doc);
  } else if (node.type === "group") {
    processGroupNode(node, doc);
  }
}

/**
 * Convert AST to token document for resolution
 */
export function astToDocument(root: ASTNode): TokenDocument {
  const doc: TokenDocument = {};
  processNode(root, doc);
  return doc;
}

/**
 * Create a reference graph for the AST
 */
export function createASTReferenceGraph(root: ASTNode): {
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
} {
  const dependencies = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();

  visitTokens(root, (token) => {
    if (token.references && token.references.length > 0) {
      dependencies.set(token.path, new Set(token.references));

      for (const ref of token.references) {
        if (!dependents.has(ref)) {
          dependents.set(ref, new Set());
        }
        dependents.get(ref)?.add(token.path);
      }
    }
    return true;
  });

  return { dependencies, dependents };
}
