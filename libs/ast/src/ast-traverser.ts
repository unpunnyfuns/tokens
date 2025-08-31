import type { ASTNode, GroupNode, TokenNode } from "./types.js";

type TraversalOrder = "pre" | "post";
type VisitorFunction = (node: ASTNode) => undefined | boolean;
type TokenVisitor = (token: TokenNode) => undefined | boolean;
type GroupVisitor = (group: GroupNode) => undefined | boolean;

/**
 * Traverse the AST with a visitor function
 */
export function traverseAST(
  node: ASTNode,
  visitor: VisitorFunction,
  order: TraversalOrder = "pre",
): boolean {
  if (order === "pre") {
    const continueTraversal = visitor(node);
    if (continueTraversal === false) return false;
  }

  if (node.type === "group" || node.type === "file") {
    // Both GroupNode and TokenAST have children that need to be traversed
    const children = (node as GroupNode).children;
    for (const child of children.values()) {
      const childContinue = traverseAST(child, visitor, order);
      if (!childContinue) return false;
    }
  }

  if (order === "post") {
    const continueTraversal = visitor(node);
    if (continueTraversal === false) return false;
  }

  return true;
}

/**
 * Visit only token nodes
 */
export function visitTokens(node: ASTNode, visitor: TokenVisitor): void {
  traverseAST(node, (n) => {
    if (n.type === "token") {
      return visitor(n as TokenNode);
    }
    return true;
  });
}

/**
 * Visit only group nodes
 */
export function visitGroups(node: ASTNode, visitor: GroupVisitor): void {
  traverseAST(node, (n) => {
    if (n.type === "group") {
      return visitor(n as GroupNode);
    }
    return true;
  });
}

/**
 * Walk the AST with enter and leave callbacks
 */
export function walkAST(
  node: ASTNode,
  callbacks: {
    enter?: VisitorFunction;
    leave?: VisitorFunction;
  },
): void {
  const enter = callbacks.enter?.(node);
  if (enter === false) return;

  if (node.type === "group") {
    for (const child of (node as GroupNode).children.values()) {
      walkAST(child, callbacks);
    }
  }

  callbacks.leave?.(node);
}

/**
 * Find a node by path or predicate
 */
export function findNode(
  root: ASTNode,
  pathOrPredicate: string | ((node: ASTNode) => boolean),
): ASTNode | undefined {
  if (typeof pathOrPredicate === "string") {
    const path = pathOrPredicate;
    let found: ASTNode | undefined;

    traverseAST(root, (node) => {
      if (node.path === path) {
        found = node;
        return false;
      }
      return true;
    });

    return found;
  }

  let found: ASTNode | undefined;
  traverseAST(root, (node) => {
    if (pathOrPredicate(node)) {
      found = node;
      return false;
    }
    return true;
  });

  return found;
}

/**
 * Find all nodes matching a predicate
 */
export function findAllNodes(
  root: ASTNode,
  predicate: (node: ASTNode) => boolean,
): ASTNode[] {
  const nodes: ASTNode[] = [];

  traverseAST(root, (node) => {
    if (predicate(node)) {
      nodes.push(node);
    }
    return true;
  });

  return nodes;
}

/**
 * Get all ancestors of a node
 */
export function getAncestors(node: ASTNode): ASTNode[] {
  const ancestors: ASTNode[] = [];
  let current = node.parent;

  while (current) {
    ancestors.push(current);
    current = current.parent;
  }

  return ancestors;
}

/**
 * Get sibling nodes
 */
export function getSiblings(node: ASTNode): ASTNode[] {
  if (!node.parent || node.parent.type !== "group") {
    return [];
  }

  const siblings: ASTNode[] = [];
  for (const [key, sibling] of (node.parent as GroupNode).children) {
    if (key !== node.name) {
      siblings.push(sibling);
    }
  }

  return siblings;
}
