/**
 * AST-specific types
 */

import type { TokenValue } from "../types.js";

// AST Node types
export interface ASTNode {
  type: "token" | "group";
  path: string;
  name: string;
  parent?: ASTNode;
  metadata?: Record<string, unknown>;
}

export interface TokenNode extends ASTNode {
  type: "token";
  value?: TokenValue;
  tokenType?: string;
  references?: string[];
  resolved?: boolean;
  resolvedValue?: TokenValue;
}

export interface GroupNode extends ASTNode {
  type: "group";
  children: Map<string, ASTNode>;
  tokens: Map<string, TokenNode>;
  groups: Map<string, GroupNode>;
}

// Reference resolution types
export interface ResolutionError {
  type: "missing" | "circular" | "invalid" | "depth";
  path: string;
  message: string;
  reference?: string;
}

export interface ReferenceGraph {
  nodes: Map<string, TokenNode>;
  edges: Map<string, Set<string>>;
  reverseEdges: Map<string, Set<string>>;
}

export interface ASTStatistics {
  totalTokens: number;
  totalGroups: number;
  totalNodes: number;
  tokensByType: Record<string, number>;
  maxDepth: number;
  tokensWithReferences: number;
  unresolvedTokens: number;
}
