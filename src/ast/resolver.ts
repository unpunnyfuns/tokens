import {
  type ResolutionError as RefError,
  type ResolveResult,
  resolveReferences,
} from "../references/index.js";
import type { TokenDocument } from "../types.js";
import { visitTokens } from "./ast-traverser.js";
import type {
  ASTNode,
  GroupNode,
  ResolutionError,
  TokenNode,
} from "./types.js";

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
      $value: token.value,
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
 * Resolve all references in an AST using the references module
 */
export function resolveASTReferences(root: ASTNode): ResolutionError[] {
  // Convert AST to document
  const document = astToDocument(root);

  // Resolve using references module
  const result = resolveReferences(document);

  // Update AST with resolved values
  updateASTWithResolvedValues(root, result);

  // Convert errors to AST format
  return convertErrors(result.errors);
}

/**
 * Update AST nodes with resolved values
 */
function updateASTWithResolvedValues(
  root: ASTNode,
  result: ResolveResult,
): void {
  visitTokens(root, (token) => {
    const resolvedValue = result.resolved.get(token.path);
    if (resolvedValue !== undefined) {
      token.resolvedValue = resolvedValue;
      token.resolved = true;
    } else if (token.references && token.references.length > 0) {
      token.resolved = false;
    }
    return true;
  });
}

/**
 * Convert reference module errors to AST errors
 */
function convertErrors(errors: RefError[]): ResolutionError[] {
  return errors.map((error) => ({
    type: error.type,
    path: error.path,
    message: error.message,
    ...(error.reference ? { reference: error.reference } : {}),
  }));
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
