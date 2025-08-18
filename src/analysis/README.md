# Analysis

Comprehensive token system inspection providing statistical analysis, structural examination, and change tracking. This module serves as the foundation for understanding token organization, detecting patterns, and monitoring system evolution through detailed metrics and comparison capabilities.

## Table of Contents

- [Overview](#overview)
- [Usage](#usage)
  - [Basic Analysis](#basic-analysis)
  - [Document Comparison](#document-comparison)
  - [Breaking Change Detection](#breaking-change-detection)
- [API Reference](#api-reference)
  - [Functions](#functions)
  - [Types](#types)
- [Structure](#structure)
- [Performance](#performance)
- [Integration Points](#integration-points)

## Overview

The analysis module provides comprehensive inspection capabilities for design token documents. It operates at two levels: quick operations that traverse documents directly for simple metrics, and full analysis that builds an AST for detailed structural examination.

Core capabilities include token and group counting, type distribution statistics, nesting depth analysis, and reference validation. The module also provides document comparison features to track changes between versions, identify breaking changes, and generate migration reports.

## Usage

### Basic Analysis

The primary entry point is `analyzeTokens`, which returns comprehensive statistics about a token document. For simpler needs, `countTokens` and `countGroups` provide quick counts without AST construction.

```typescript
import { analyzeTokens, countTokens, findTokensByType } from '@unpunnyfuns/tokens';

const document = {
  colors: {
    primary: { $value: "#007bff", $type: "color" },
    secondary: { $value: "#6c757d", $type: "color" }
  },
  spacing: {
    small: { $value: "8px", $type: "dimension" },
    medium: { $value: "16px", $type: "dimension" }
  }
};

// Full analysis
const analysis = analyzeTokens(document);
console.log(`Total: ${analysis.totalTokens} tokens in ${analysis.totalGroups} groups`);
console.log(`Max depth: ${analysis.maxDepth}`);

// Find specific types
const colorTokens = findTokensByType(document, 'color');
console.log(`Found ${colorTokens.length} color tokens`);
```

### Document Comparison

Compare two token documents to identify additions, removals, and modifications. The basic comparison returns lists of affected token paths, while the detailed comparison includes the actual value differences.

```typescript
import { compareTokenDocuments, compareTokenDocumentsDetailed } from '@unpunnyfuns/tokens';

const oldDoc = {
  colors: {
    primary: { $value: "#007bff" },
    secondary: { $value: "#6c757d" }
  }
};

const newDoc = {
  colors: {
    primary: { $value: "#28a745" }, // Modified
    tertiary: { $value: "#ffc107" }  // Added
    // secondary removed
  }
};

// Basic comparison
const comparison = compareTokenDocuments(oldDoc, newDoc);
console.log(`Added: ${comparison.added.length}, Removed: ${comparison.removed.length}`);

// Detailed comparison
const detailed = compareTokenDocumentsDetailed(oldDoc, newDoc);
for (const diff of detailed.modified) {
  console.log(`Modified ${diff.path}: ${diff.oldValue} → ${diff.newValue}`);
}
```

### Breaking Change Detection

Build on the comparison API to detect potentially breaking changes in token documents. Removed tokens and type changes typically constitute breaking changes that require consumer updates.

```typescript
import { compareTokenDocumentsDetailed } from '@unpunnyfuns/tokens';

function detectBreakingChanges(oldDoc: TokenDocument, newDoc: TokenDocument): string[] {
  const comparison = compareTokenDocumentsDetailed(oldDoc, newDoc);
  const breaking: string[] = [];
  
  // Removed tokens are breaking
  for (const path of comparison.removed) {
    breaking.push(`Token removed: ${path}`);
  }
  
  // Type changes are breaking
  for (const diff of comparison.modified) {
    if (diff.oldValue?.$type !== diff.newValue?.$type) {
      breaking.push(`Type changed: ${diff.path}`);
    }
  }
  
  return breaking;
}
```

## API Reference

### Functions

| Export | Type | Description |
|--------|------|-------------|
| `analyzeTokens` | `(document: TokenDocument) => TokenAnalysis` | Analyze token document |
| `countTokens` | `(document: TokenDocument) => number` | Count total tokens |
| `countGroups` | `(document: TokenDocument) => number` | Count token groups |
| `getTokenTypes` | `(document: TokenDocument) => Set<string>` | Get unique token types |
| `findTokensByType` | `(document: TokenDocument, type: string) => Token[]` | Find tokens by type |
| `compareTokenDocuments` | `(source: TokenDocument, target: TokenDocument) => TokenComparison` | Compare documents |
| `compareTokenDocumentsDetailed` | `(source: TokenDocument, target: TokenDocument) => DetailedTokenComparison` | Detailed comparison |

### Types

```typescript
interface TokenAnalysis {
  totalTokens: number;
  totalGroups: number;
  maxDepth: number;
  tokenTypes: Set<string>;
  tokensByType: Record<string, number>;
  hasReferences: boolean;
  paths: string[];
}

interface TokenComparison {
  added: string[];      // Paths of added tokens
  removed: string[];    // Paths of removed tokens
  modified: string[];   // Paths of modified tokens
  unchanged: string[];  // Paths of unchanged tokens
}

interface DetailedTokenComparison extends TokenComparison {
  modified: TokenDifference[]; // Detailed diffs for modified tokens
}

interface TokenDifference {
  path: string;
  oldValue: Token | undefined;
  newValue: Token | undefined;
  differences: {
    value?: { old: unknown; new: unknown };
    type?: { old: string; new: string };
    description?: { old: string; new: string };
  };
}
```

## Structure

| File | Purpose |
|------|---------|
| `token-analyzer.ts` | Main analyzer with analysis methods |
| `token-comparison.ts` | Token document comparison utilities |
| `index.ts` | Module exports |

## Performance

| Operation | Complexity | Notes |
|-----------|------------|-------|
| `countTokens` | O(n) | Direct traversal, no AST |
| `analyzeTokens` | O(n) | AST construction + analysis |
| `compareTokenDocuments` | O(n+m) | n, m = document sizes |

## Integration Points

The analysis module serves as the foundation for several higher-level features. The CLI uses it to power the `info` command, providing users with quick statistics about their token files. The API layer leverages analysis capabilities for validation and optimization suggestions. The bundler integrates with the analyzer to generate metadata about token collections during the build process.