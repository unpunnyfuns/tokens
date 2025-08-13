import { findNode, traverseAST, visitTokens } from "./ast-traverser.js";
import type {
  ASTNode,
  ASTStatistics,
  GroupNode,
  ReferenceGraph,
  TokenNode,
} from "./types.js";

/**
 * Query API for AST operations
 */
export class ASTQuery {
  constructor(private root: ASTNode) {}

  /**
   * Get a token by path
   */
  getToken(path: string): TokenNode | undefined {
    const node = this.getNode(path);
    return node?.type === "token" ? (node as TokenNode) : undefined;
  }

  /**
   * Get a group by path
   */
  getGroup(path: string): GroupNode | undefined {
    const node = this.getNode(path);
    return node?.type === "group" ? (node as GroupNode) : undefined;
  }

  /**
   * Get any node by path
   */
  getNode(path: string): ASTNode | undefined {
    return findNode(this.root, path);
  }

  /**
   * Get all tokens in the tree
   */
  getAllTokens(): TokenNode[] {
    const tokens: TokenNode[] = [];
    visitTokens(this.root, (token) => {
      tokens.push(token);
      return true;
    });
    return tokens;
  }

  /**
   * Get tokens by type
   */
  getTokensByType(type: string): TokenNode[] {
    return this.filterTokens((token) => token.tokenType === type);
  }

  /**
   * Get tokens with references
   */
  getTokensWithReferences(): TokenNode[] {
    return this.filterTokens(
      (token) => token.references !== undefined && token.references.length > 0,
    );
  }

  /**
   * Get unresolved tokens
   */
  getUnresolvedTokens(): TokenNode[] {
    return this.filterTokens((token) => !token.resolved);
  }

  /**
   * Filter tokens by predicate
   */
  filterTokens(predicate: (token: TokenNode) => boolean): TokenNode[] {
    const tokens: TokenNode[] = [];
    visitTokens(this.root, (token) => {
      if (predicate(token)) {
        tokens.push(token);
      }
      return true;
    });
    return tokens;
  }

  /**
   * Get token dependencies (tokens this token references)
   */
  getDependencies(tokenPath: string): TokenNode[] {
    const token = this.getToken(tokenPath);
    if (!token?.references) return [];

    const deps: TokenNode[] = [];
    const visited = new Set<string>();

    const collectDeps = (refs: string[]) => {
      for (const ref of refs) {
        if (visited.has(ref)) continue;
        visited.add(ref);

        const depToken = this.getToken(ref);
        if (depToken) {
          deps.push(depToken);
          if (depToken.references) {
            collectDeps(depToken.references);
          }
        }
      }
    };

    collectDeps(token.references);
    return deps;
  }

  /**
   * Get token dependents (tokens that reference this token)
   */
  getDependents(tokenPath: string): TokenNode[] {
    const dependents: TokenNode[] = [];
    const visited = new Set<string>();

    const collectDependents = (path: string) => {
      visitTokens(this.root, (token) => {
        if (token.references?.includes(path) && !visited.has(token.path)) {
          visited.add(token.path);
          dependents.push(token);
          collectDependents(token.path);
        }
        return true;
      });
    };

    collectDependents(tokenPath);
    return dependents;
  }

  /**
   * Build reference graph
   */
  getReferenceGraph(): ReferenceGraph {
    const references = new Map<string, string[]>();
    const referencedBy = new Map<string, string[]>();

    visitTokens(this.root, (token) => {
      if (token.references && token.references.length > 0) {
        references.set(token.path, token.references);

        for (const ref of token.references) {
          const refs = referencedBy.get(ref) ?? [];
          refs.push(token.path);
          referencedBy.set(ref, refs);
        }
      }
      return true;
    });

    return { references, referencedBy };
  }

  /**
   * Check if there are circular references
   */
  hasCircularReferences(): boolean {
    const tokens = this.getTokensWithReferences();

    for (const token of tokens) {
      if (this.hasCircularReference(token.path, new Set())) {
        return true;
      }
    }

    return false;
  }

  private hasCircularReference(path: string, visited: Set<string>): boolean {
    if (visited.has(path)) return true;

    const token = this.getToken(path);
    if (!token?.references) return false;

    visited.add(path);

    for (const ref of token.references) {
      if (this.hasCircularReference(ref, new Set(visited))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get tokens involved in circular references
   */
  getCircularReferences(): TokenNode[] {
    const circular: TokenNode[] = [];
    const tokens = this.getTokensWithReferences();

    for (const token of tokens) {
      if (this.hasCircularReference(token.path, new Set())) {
        circular.push(token);
      }
    }

    return circular;
  }

  /**
   * Get statistics about the AST
   */
  getStatistics(): ASTStatistics {
    let totalTokens = 0;
    let totalGroups = 0;
    const tokensByType: Record<string, number> = {};
    let tokensWithReferences = 0;
    let unresolvedTokens = 0;

    traverseAST(this.root, (node) => {
      if (node.type === "token") {
        const tokenNode = node as TokenNode;
        totalTokens++;

        const type = tokenNode.tokenType ?? "untyped";
        tokensByType[type] = (tokensByType[type] ?? 0) + 1;

        if (tokenNode.references && tokenNode.references.length > 0) {
          tokensWithReferences++;
        }

        if (!tokenNode.resolved) {
          unresolvedTokens++;
        }
      } else {
        totalGroups++;
      }
      return true;
    });

    return {
      totalTokens,
      totalGroups,
      tokensByType,
      maxDepth: this.getTreeDepth(),
      tokensWithReferences,
      unresolvedTokens,
    };
  }

  /**
   * Get the maximum depth of the tree
   */
  getTreeDepth(): number {
    let maxDepth = 0;

    const measureDepth = (node: ASTNode, depth: number) => {
      maxDepth = Math.max(maxDepth, depth);

      if (node.type === "group") {
        for (const child of (node as GroupNode).children.values()) {
          measureDepth(child, depth + 1);
        }
      }
    };

    measureDepth(this.root, 0);
    return maxDepth;
  }

  /**
   * Get nodes at a specific depth
   */
  getNodesAtDepth(depth: number): ASTNode[] {
    const nodes: ASTNode[] = [];

    const collectAtDepth = (node: ASTNode, currentDepth: number) => {
      if (currentDepth === depth) {
        nodes.push(node);
        return;
      }

      if (node.type === "group" && currentDepth < depth) {
        for (const child of (node as GroupNode).children.values()) {
          collectAtDepth(child, currentDepth + 1);
        }
      }
    };

    collectAtDepth(this.root, 0);
    return nodes;
  }

  /**
   * Get all paths in the tree
   */
  getAllPaths(): string[] {
    const paths: string[] = [];

    traverseAST(this.root, (node) => {
      if (node.path) {
        paths.push(node.path);
      }
      return true;
    });

    return paths;
  }

  /**
   * Get token paths only
   */
  getTokenPaths(): string[] {
    return this.getAllTokens().map((token) => token.path);
  }

  /**
   * Get paths matching a pattern
   */
  getPathsMatching(pattern: RegExp): string[] {
    return this.getAllPaths().filter((path) => pattern.test(path));
  }
}
