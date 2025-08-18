# References

Standalone reference resolution engine with sophisticated cycle detection and multi-format support for token relationships. This module provides robust handling of DTCG and JSON Schema reference formats, employing graph algorithms to ensure safe resolution while detecting circular dependencies and providing detailed error context for debugging complex reference chains.

## Table of Contents

- [Overview](#overview)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Structure](#structure)
- [Performance](#performance)

## Overview

The references module provides comprehensive support for resolving token references within design token documents. It handles DTCG reference format (`{path.to.token}`), JSON Schema format (`#/path/to/token`), and detects circular dependencies using sophisticated graph algorithms.

The module features robust error recovery, continuing resolution even when some references fail, and provides detailed diagnostics for debugging complex reference chains. It supports nested references, composite values, arrays, and partial resolution modes for flexible integration scenarios.

## Usage

### Basic Reference Resolution

Resolve all references in a token document:

```typescript
import { resolveReferences } from '@unpunnyfuns/tokens';

const document = {
  colors: {
    base: { $value: "#ff0000", $type: "color" },
    primary: { $value: "{colors.base}", $type: "color" },
    secondary: { $value: "{colors.primary}", $type: "color" }
  }
};

const result = resolveReferences(document);

if (result.errors.length === 0) {
  console.log('All references resolved successfully');
  console.log(result.tokens.colors.primary.$value); // "#ff0000"
  console.log(result.tokens.colors.secondary.$value); // "#ff0000"
} else {
  console.error('Resolution errors:', result.errors);
}
```

### Advanced Resolution Options

Control resolution behavior with options:

```typescript
import { resolveReferences } from '@unpunnyfuns/tokens';

const result = resolveReferences(document, {
  preserveOnError: true,    // Keep original refs on error (default: true)
  maxDepth: 5,              // Max reference chain depth (default: 10)
  partial: true             // Allow partial resolution (default: false)
});

// Check resolution status
console.log(`Resolved: ${result.resolved.size} tokens`);
console.log(`Errors: ${result.errors.length}`);
```

### Cycle Detection

Detect circular references before resolution:

```typescript
import { detectCycles, findShortestCycle } from '@unpunnyfuns/tokens';

const cyclicDocument = {
  a: { $value: "{b}", $type: "color" },
  b: { $value: "{c}", $type: "color" },
  c: { $value: "{a}", $type: "color" }  // Creates cycle: a → b → c → a
};

const cycleResult = detectCycles(cyclicDocument);

if (cycleResult.hasCycles) {
  console.log('Cycles detected:', cycleResult.cycles.length);
  
  const shortestCycle = findShortestCycle(cycleResult.cycles);
  console.log('Shortest cycle:', shortestCycle);
  // Output: ["a", "b", "c", "a"]
  
  // Analyze the dependency graph
  for (const [token, dependencies] of cycleResult.graph) {
    console.log(`${token} depends on: ${Array.from(dependencies).join(', ')}`);
  }
}
```

### Dependency Analysis

Build and analyze dependency relationships:

```typescript
import { buildDependencyGraph } from '@unpunnyfuns/tokens';

const dependencies = buildDependencyGraph(document);

// Show what each token depends on
for (const [token, deps] of dependencies) {
  if (deps.size > 0) {
    console.log(`${token} depends on: ${Array.from(deps).join(', ')}`);
  }
}
```

### Topological Sorting

Get safe resolution order for tokens:

```typescript
import { getTopologicalSort } from '@unpunnyfuns/tokens';

const order = getTopologicalSort(document);

if (order) {
  console.log('Safe resolution order:');
  order.forEach((token, index) => {
    console.log(`${index + 1}. ${token}`);
  });
} else {
  console.log('Cannot create order - circular dependencies detected');
}
```

### Reference Extraction

Extract and analyze references in values:

```typescript
import { 
  extractReference, 
  getAllReferences, 
  hasReferences,
  normalizeReference 
} from '@unpunnyfuns/tokens';

// Check if a value contains references
const value = "{colors.primary}";
console.log(hasReferences(value)); // true

// Extract single reference
const ref = extractReference(value);
console.log(ref); // "colors.primary"

// Get all references from complex values
const complexValue = {
  color: "{colors.primary}",
  hover: "{colors.secondary}",
  border: "1px solid {colors.border}"
};

const allRefs = getAllReferences(complexValue);
console.log(allRefs); // ["colors.primary", "colors.secondary", "colors.border"]

// Normalize reference paths
console.log(normalizeReference("#/colors/primary")); // "colors.primary"
console.log(normalizeReference("{colors.primary}")); // "colors.primary"
```

### Error Handling

Handle different types of resolution errors:

```typescript
import { resolveReferences } from '@unpunnyfuns/tokens';

const result = resolveReferences(document);

for (const error of result.errors) {
  switch (error.type) {
    case 'missing':
      console.error(`Reference not found: ${error.reference} at ${error.path}`);
      break;
      
    case 'circular':
      console.error(`Circular reference: ${error.path}`);
      if (error.chain) {
        console.error(`Chain: ${error.chain.join(' → ')}`);
      }
      break;
      
    case 'depth':
      console.error(`Max depth exceeded: ${error.path}`);
      console.error(`Chain length: ${error.depth}`);
      break;
      
    case 'invalid':
      console.error(`Invalid reference format: ${error.message}`);
      break;
      
    default:
      console.error(`Unknown error: ${error.message}`);
  }
}
```

### Cycle Prevention

Check if adding a reference would create a cycle:

```typescript
import { wouldCreateCycle, buildDependencyGraph } from '@unpunnyfuns/tokens';

const graph = buildDependencyGraph(document);

// Check before adding new reference
if (wouldCreateCycle('colors.primary', 'colors.base', graph)) {
  console.log('Cannot add reference - would create cycle');
} else {
  console.log('Safe to add reference');
}
```

## API Reference

### Resolution Functions

#### `resolveReferences`

```typescript
function resolveReferences(
  document: TokenDocument, 
  options?: ResolveOptions
): ResolveResult
```

Resolve all references in a token document with comprehensive error handling.

#### `resolveValue`

```typescript
function resolveValue(
  value: unknown, 
  resolved: Map<string, unknown>
): unknown
```

Resolve references in a single value using a resolved value map.

#### `wouldCreateCycle`

```typescript
function wouldCreateCycle(
  from: string, 
  to: string, 
  graph: Map<string, Set<string>>
): boolean
```

Check if adding an edge would create a cycle in the dependency graph.

### Cycle Detection Functions

#### `detectCycles`

```typescript
function detectCycles(
  document: TokenDocument
): CycleDetectionResult
```

Detect all cycles in token references using Tarjan's algorithm.

#### `findShortestCycle`

```typescript
function findShortestCycle(
  cycles: string[][]
): string[] | null
```

Find the shortest cycle from a list of detected cycles.

#### `getTopologicalSort`

```typescript
function getTopologicalSort(
  document: TokenDocument
): string[] | null
```

Get topological ordering of tokens, or null if cycles exist.

### Reference Extraction Functions

#### `extractReference`

```typescript
function extractReference(
  value: string
): string | null
```

Extract a single reference from a string value.

#### `getAllReferences`

```typescript
function getAllReferences(
  value: unknown
): string[]
```

Get all references from any value type (string, object, array).

#### `normalizeReference`

```typescript
function normalizeReference(
  ref: string
): string
```

Convert reference to normalized path format.

#### `hasReferences`

```typescript
function hasReferences(
  value: unknown
): boolean
```

Check if a value contains any token references.

### Graph Building Functions

#### `buildDependencyGraph`

```typescript
function buildDependencyGraph(
  document: TokenDocument
): Map<string, Set<string>>
```

Build dependency graph showing what each token depends on.

#### `buildReverseGraph`

```typescript
function buildReverseGraph(
  graph: Map<string, Set<string>>
): Map<string, Set<string>>
```

Build reverse dependency graph showing what depends on each token.

### Type Definitions

#### `ResolveOptions`

```typescript
interface ResolveOptions {
  preserveOnError?: boolean;  // Keep original refs on error (default: true)
  maxDepth?: number;          // Max reference chain depth (default: 10)
  partial?: boolean;          // Allow partial resolution (default: false)
}
```

#### `ResolveResult`

```typescript
interface ResolveResult {
  tokens: TokenDocument;         // Document with resolved references
  resolved: Map<string, unknown>; // Map of resolved values
  errors: ResolutionError[];     // Resolution errors
}
```

#### `ResolutionError`

```typescript
interface ResolutionError {
  type: 'missing' | 'circular' | 'depth' | 'invalid';
  path: string;           // Token path where error occurred
  reference?: string;     // The failing reference
  message: string;        // Error description
  chain?: string[];       // Reference chain (for circular/depth)
  depth?: number;         // Chain depth (for depth errors)
}
```

#### `CycleDetectionResult`

```typescript
interface CycleDetectionResult {
  hasCycles: boolean;              // Whether cycles were found
  cycles: string[][];              // Array of cycles (each cycle is array of token paths)
  graph: Map<string, Set<string>>; // The dependency graph analyzed
}
```

## Structure

| File | Purpose |
|------|---------|
| `resolver.ts` | Reference resolution with error handling |
| `cycle-detector.ts` | Cycle detection using graph algorithms |
| `extractor.ts` | Reference extraction utilities |
| `graph-builder.ts` | Dependency graph construction |

## Performance

| Operation | Complexity | Description |
|-----------|------------|-------------|
| Reference resolution | O(n) | Where n = total tokens |
| Cycle detection | O(V + E) | Where V = tokens, E = references |
| Dependency graph | O(n × r) | Where n = tokens, r = avg refs per token |
| Topological sort | O(V + E) | Standard graph algorithm |
| Single reference | O(1) | Hash table lookup |
| Reference extraction | O(1) | Pattern matching |

The module uses efficient graph algorithms and maintains internal caches to minimize redundant work. Tarjan's strongly connected components algorithm provides O(V + E) cycle detection, while topological sorting uses Kahn's algorithm for the same complexity.