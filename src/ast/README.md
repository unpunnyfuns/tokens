# AST

Tree-based representation of design token documents enabling efficient structural analysis and manipulation through a functional API. This module transforms flat token documents into navigable abstract syntax trees, providing the foundation for reference resolution, type-based queries, and dependency analysis across the token system.

## Table of Contents

- [Overview](#overview)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Structure](#structure)
- [Performance Notes](#performance-notes)
- [Integration Points](#integration-points)

## Overview

The AST module provides a tree-based representation of design token documents that enables efficient querying, traversal, and manipulation of token structures. It uses a functional API for all operations, making it suitable for both simple queries and complex reference resolution tasks.

The module constructs abstract syntax trees from token documents where each node represents either a token (with a `$value`) or a group (container for other nodes). This structure enables efficient path-based lookups, type-based filtering, and dependency analysis. The module integrates with the references module for robust reference resolution and cycle detection.

## Usage

### Building AST

Create AST representations from token documents:

```typescript
import { createASTFromDocument, loadASTFromFile } from '@unpunnyfuns/tokens';

// From complete document
const document = {
  colors: {
    primary: { $value: '#007bff', $type: 'color' },
    secondary: { $value: '{colors.primary}', $type: 'color' }
  },
  spacing: {
    sm: { $value: '8px', $type: 'dimension' },
    md: { $value: '16px', $type: 'dimension' }
  }
};

const ast = createASTFromDocument(document);

// From file
const astFromFile = await loadASTFromFile('./tokens.json');
```

### Querying AST

Find and retrieve nodes using various strategies:

```typescript
import { 
  getToken, 
  getGroup, 
  findAllTokens, 
  findTokensByType,
  filterTokens,
  findTokensWithReferences,
  findUnresolvedTokens
} from '@unpunnyfuns/tokens';

// Get specific nodes
const token = getToken(ast, 'colors.primary');
const group = getGroup(ast, 'spacing');

// Get all tokens
const allTokens = findAllTokens(ast);
console.log(`Total tokens: ${allTokens.length}`);

// Filter by type
const colorTokens = findTokensByType(ast, 'color');
const dimensions = findTokensByType(ast, 'dimension');

// Custom filtering
const largeSpacing = filterTokens(ast, token => 
  token.tokenType === 'dimension' && 
  parseInt(token.value) > 12
);

// Tokens with references
const withRefs = findTokensWithReferences(ast);
const unresolved = findUnresolvedTokens(ast);
```

### Tree Traversal

Navigate the tree structure with visitor patterns:

```typescript
import { traverseAST, visitTokens, visitGroups } from '@unpunnyfuns/tokens';

// Visit all nodes with depth tracking
traverseAST(ast, (node, depth) => {
  const indent = '  '.repeat(depth);
  console.log(`${indent}${node.type}: ${node.path}`);
  return true; // continue traversal
});

// Visit only tokens
visitTokens(ast, token => {
  if (token.tokenType === 'color') {
    console.log(`Color: ${token.path} = ${token.value}`);
  }
  return true;
});

// Visit only groups
visitGroups(ast, group => {
  console.log(`Group: ${group.path} (${group.children.length} children)`);
  return true;
});
```

### Reference Resolution

Analyze and resolve token references:

```typescript
import { 
  resolveASTReferences, 
  detectASTCycles, 
  getResolutionOrder,
  createASTReferenceGraph 
} from '@unpunnyfuns/tokens';

// Resolve all references
const errors = resolveASTReferences(ast);
if (errors.length > 0) {
  console.error('Resolution errors:', errors);
}

// Detect circular references
const cycles = detectASTCycles(ast);
if (cycles.length > 0) {
  console.warn('Circular references found:', cycles);
}

// Get topological resolution order
const order = getResolutionOrder(ast);
console.log('Resolution order:', order);

// Build dependency graph
const { dependencies, dependents } = createASTReferenceGraph(ast);
console.log(`colors.primary depends on:`, dependencies.get('colors.primary'));
console.log(`colors.primary is used by:`, dependents.get('colors.primary'));
```

### Statistics and Analysis

Extract metadata and statistics from AST:

```typescript
import { getStatistics, findDependencies, findDependents } from '@unpunnyfuns/tokens';

// Get comprehensive statistics
const stats = getStatistics(ast);
console.log({
  totalTokens: stats.totalTokens,
  totalGroups: stats.totalGroups,
  maxDepth: stats.maxDepth,
  tokensWithReferences: stats.tokensWithReferences,
  tokensByType: stats.tokensByType
});

// Analyze specific token dependencies
const deps = findDependencies(ast, 'colors.secondary');
const dependents = findDependents(ast, 'colors.primary');

console.log(`colors.secondary depends on: ${deps.join(', ')}`);
console.log(`colors.primary is used by: ${dependents.join(', ')}`);
```

## API Reference

### Builder Functions

| Function | Type | Description |
|----------|------|-------------|
| `createASTFromDocument` | `(document: TokenDocument) => ASTNode` | Build complete AST from document |
| `loadASTFromFile` | `(filePath: string) => Promise<ASTNode>` | Load AST from file |

### Query Functions

| Function | Type | Description |
|----------|------|-------------|
| `getToken` | `(ast: ASTNode, path: string) => TokenNode \| undefined` | Get token by path |
| `getGroup` | `(ast: ASTNode, path: string) => GroupNode \| undefined` | Get group by path |
| `getNode` | `(ast: ASTNode, path: string) => ASTNode \| undefined` | Get any node by path |
| `findAllTokens` | `(ast: ASTNode) => TokenNode[]` | Get all token nodes |
| `findTokensByType` | `(ast: ASTNode, type: string) => TokenNode[]` | Get tokens by type |
| `findTokensWithReferences` | `(ast: ASTNode) => TokenNode[]` | Get tokens with references |
| `findUnresolvedTokens` | `(ast: ASTNode) => TokenNode[]` | Get unresolved tokens |
| `filterTokens` | `(ast: ASTNode, predicate: (token: TokenNode) => boolean) => TokenNode[]` | Filter tokens with predicate |

### Traversal Functions

| Function | Type | Description |
|----------|------|-------------|
| `traverseAST` | `(node: ASTNode, visitor: ASTVisitor) => void` | Traverse AST with visitor pattern |
| `visitTokens` | `(node: ASTNode, callback: (token: TokenNode) => boolean) => void` | Visit all token nodes |
| `visitGroups` | `(node: ASTNode, callback: (group: GroupNode) => boolean) => void` | Visit all group nodes |
| `findNode` | `(node: ASTNode, predicate: (n: ASTNode) => boolean) => ASTNode \| null` | Find first matching node |

### Reference Functions

| Function | Type | Description |
|----------|------|-------------|
| `resolveASTReferences` | `(root: ASTNode) => ResolutionError[]` | Resolve all references in AST |
| `detectASTCycles` | `(root: ASTNode) => string[][]` | Detect circular references |
| `getResolutionOrder` | `(root: ASTNode) => string[]` | Get topological resolution order |
| `createASTReferenceGraph` | `(root: ASTNode) => ReferenceGraphResult` | Build dependency/dependent graph |
| `astToDocument` | `(root: ASTNode) => TokenDocument` | Convert AST back to document |

### Analysis Functions

| Function | Type | Description |
|----------|------|-------------|
| `findDependencies` | `(ast: ASTNode, tokenPath: string) => string[]` | Get token dependencies |
| `findDependents` | `(ast: ASTNode, tokenPath: string) => string[]` | Get tokens that depend on this token |
| `getStatistics` | `(ast: ASTNode) => ASTStatistics` | Get comprehensive AST statistics |
| `createReferenceGraph` | `(ast: ASTNode) => ReferenceGraph` | Build reference graph structure |
| `findCircularReferences` | `(ast: ASTNode) => string[][]` | Find all circular reference chains |

### Node Types

| Type | Description |
|------|-------------|
| `ASTNode` | Base interface for all nodes |
| `TokenNode` | Node representing a token with `$value` |
| `GroupNode` | Node representing a group container |
| `ASTVisitor` | Visitor pattern interface for traversal |

#### ASTNode Structure

```typescript
interface ASTNode {
  type: 'token' | 'group';
  name: string;
  path: string;
  parent?: ASTNode;
  metadata: Record<string, unknown>;
}
```

#### TokenNode Structure

```typescript
interface TokenNode extends ASTNode {
  type: 'token';
  value: unknown;
  tokenType?: string;
  description?: string;
  extensions?: Record<string, unknown>;
}
```

#### GroupNode Structure

```typescript
interface GroupNode extends ASTNode {
  type: 'group';
  children: ASTNode[];
  description?: string;
  extensions?: Record<string, unknown>;
}
```

### Statistics Types

| Type | Description |
|------|-------------|
| `ASTStatistics` | Comprehensive statistics about the AST |
| `ReferenceGraph` | Graph structure for token references |
| `ResolutionError` | Error information for failed resolution |

#### ASTStatistics Structure

```typescript
interface ASTStatistics {
  totalTokens: number;
  totalGroups: number;
  maxDepth: number;
  tokensWithReferences: number;
  unresolvedTokens: number;
  tokensByType: Record<string, number>;
}
```

## Structure

| File | Purpose |
|------|---------|
| `ast-builder.ts` | Constructs AST from token documents |
| `ast-traverser.ts` | Tree traversal patterns and visitor utilities |
| `query.ts` | Functional query API for finding and filtering nodes |
| `resolver.ts` | Reference resolution using the references module |
| `types.ts` | TypeScript type definitions for all AST structures |

## Performance Notes

| Operation | Complexity | Description |
|-----------|------------|-------------|
| Build AST | O(n) | Linear in number of tokens |
| Query by path | O(log n) | Average case with good path distribution |
| Full traversal | O(n) | Must visit every node |
| Reference resolution | O(m) | Linear in reference depth |
| Type filtering | O(n) | Must check every token |

- Path-based lookups use efficient tree navigation
- Reference resolution leverages optimized algorithms from references module
- Statistics are computed lazily and cached when possible
- Traversal operations short-circuit when visitor returns false

## Integration Points

### Token Document Conversion

```typescript
// Convert between AST and document representations
const ast = createASTFromDocument(document);
const recreated = astToDocument(ast);
```

### References Module Integration

```typescript
// AST works seamlessly with references module
import { resolveReferences } from '@unpunnyfuns/tokens';

const resolved = resolveReferences(astToDocument(ast));
const resolvedAST = createASTFromDocument(resolved);
```

### Validation Integration

```typescript
// Use AST for efficient validation
const unresolved = findUnresolvedTokens(ast);
const cycles = detectASTCycles(ast);

if (unresolved.length > 0 || cycles.length > 0) {
  throw new Error('Validation failed');
}
```