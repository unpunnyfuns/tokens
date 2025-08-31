# Analysis

Token document inspection with statistics, comparison, and change detection.

## Usage

### Basic Analysis

The primary entry point is `analyzeTokens`, which returns comprehensive statistics about a token document. For simpler needs, `countTokens` and `countGroups` provide quick counts without AST construction.

```typescript
import { analyzeTokens, countTokens, findTokensByType } from '@upft/analysis';

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
import { compareTokenDocuments, compareTokenDocumentsDetailed } from '@upft/analysis';

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
import { compareTokenDocumentsDetailed } from '@upft/analysis';

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

## Testing

```bash
pnpm --filter @upft/analysis test
```