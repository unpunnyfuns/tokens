# API Reference

## Installation

```bash
npm install @unpunnyfuns/tokens
```

## Core Classes

### TokenValidator

Validates token documents against DTCG specification.

```typescript
import { TokenValidator } from '@unpunnyfuns/tokens';

const validator = new TokenValidator();
const result = await validator.validateDocument(tokenDocument);

if (result.valid) {
  console.log('Tokens are valid');
} else {
  console.error('Validation errors:', result.errors);
}
```

### UPFTResolver

Multi-dimensional token resolver for themes, modes, and other variations.

```typescript
import { UPFTResolver } from '@unpunnyfuns/tokens';

const resolver = new UPFTResolver({
  basePath: './tokens'
});

// Resolve a specific permutation
const permutation = await resolver.resolvePermutation(manifest, {
  theme: 'dark',
  mode: 'compact'
});

// Generate all permutations
const all = await resolver.generateAll(manifest);
```

### TokenBundler

Bundles and transforms tokens.

```typescript
import { TokenBundler } from '@unpunnyfuns/tokens';

const bundler = new TokenBundler({
  outputFormat: 'dtcg',
  prettify: true
});

// Bundle from manifest
const bundles = await bundler.bundle(manifest);

// Bundle and write to files
const results = await bundler.bundleToFiles(manifest);
```

### ManifestValidator

Validates resolver manifests.

```typescript
import { ManifestValidator } from '@unpunnyfuns/tokens';

const validator = new ManifestValidator();
const result = await validator.validateManifest(manifest);
```

## AST Operations

### buildASTFromDocument

Build an Abstract Syntax Tree from a token document.

```typescript
import { buildASTFromDocument } from '@unpunnyfuns/tokens';

const ast = buildASTFromDocument(tokenDocument);
```

### ASTQuery

Query interface for AST operations.

```typescript
import { ASTQuery } from '@unpunnyfuns/tokens';

const query = new ASTQuery(ast);

// Get token by path
const token = query.getNodeByPath('color.primary');

// Get all tokens
const allTokens = query.getAllTokens();

// Get tokens by type
const colorTokens = query.getTokensByType('color');

// Get statistics
const stats = query.getStatistics();

// Find circular references
const circular = query.getCircularReferences();
```

### resolveReferences

Resolve token references in an AST.

```typescript
import { resolveReferences } from '@unpunnyfuns/tokens';

const errors = resolveReferences(ast);
if (errors.length > 0) {
  console.error('Reference errors:', errors);
}
```

## Filesystem Utilities

### FileReader

Read token files from disk.

```typescript
import { FileReader } from '@unpunnyfuns/tokens';

const reader = new FileReader({
  basePath: './tokens',
  cache: true
});

const result = await reader.readFile('colors.json');
```

### FileWriter

Write token files to disk.

```typescript
import { FileWriter } from '@unpunnyfuns/tokens';

const writer = new FileWriter({
  prettify: true
});

await writer.writeFile('output.json', tokenDocument);
```

### FileCache

LRU cache for file operations.

```typescript
import { FileCache } from '@unpunnyfuns/tokens';

const cache = new FileCache({
  maxSize: 100, // MB
  ttl: 300 // seconds
});

cache.set('key', data);
const cached = cache.get('key');
```

## Utility Functions

### dtcgMerge

DTCG-aware deep merge for token documents.

```typescript
import { dtcgMerge } from '@unpunnyfuns/tokens';

const merged = dtcgMerge(baseTokens, overrideTokens);
```

### Type Guards

Check token types at runtime.

```typescript
import { isToken, isGroup, isReference, isTokenDocument } from '@unpunnyfuns/tokens';

if (isToken(node)) {
  console.log('Token value:', node.$value);
}

if (isGroup(node)) {
  console.log('Group with children');
}

if (isReference(value)) {
  console.log('Reference to:', value);
}
```

## High-Level APIs

### bundleWithMetadata

Bundle tokens with metadata and statistics.

```typescript
import { bundleWithMetadata } from '@unpunnyfuns/tokens';

const result = await bundleWithMetadata({
  manifest: 'resolver.manifest.json',
  modifiers: { theme: 'dark' }
});

console.log('Tokens:', result.tokens);
console.log('Stats:', result.metadata?.stats);

// Validate the result
const validation = await result.validate();

// Write to file
await result.write('output.json');
```

### validateResolver

Validate a resolver manifest file.

```typescript
import { validateResolver } from '@unpunnyfuns/tokens';

const result = await validateResolver('resolver.manifest.json');

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

## Types

### TokenDocument

```typescript
interface TokenDocument {
  $schema?: string;
  $description?: string;
  [key: string]: Token | TokenGroup | unknown;
}
```

### Token

```typescript
interface Token {
  $value: unknown;
  $type: string;
  $description?: string;
  $extensions?: Record<string, unknown>;
}
```

### TokenGroup

```typescript
interface TokenGroup {
  $description?: string;
  [key: string]: Token | TokenGroup | unknown;
}
```

### UPFTResolverManifest

```typescript
interface UPFTResolverManifest {
  $schema?: string;
  name?: string;
  description?: string;
  sets: TokenSet[];
  modifiers: Record<string, Modifier>;
  generate?: GenerateConfig[];
}
```

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
```

## Error Handling

All async functions throw errors that should be caught:

```typescript
try {
  const result = await validator.validateDocument(doc);
} catch (error) {
  console.error('Validation failed:', error);
}
```

## Examples

### Basic Token Validation

```typescript
import { TokenValidator } from '@unpunnyfuns/tokens';

const tokens = {
  color: {
    primary: {
      $value: {
        colorSpace: 'srgb',
        components: [0, 0.478, 0.8],
        alpha: 1
      },
      $type: 'color'
    }
  }
};

const validator = new TokenValidator();
const result = await validator.validateDocument(tokens);
console.log('Valid:', result.valid);
```

### Resolving Multi-dimensional Tokens

```typescript
import { UPFTResolver } from '@unpunnyfuns/tokens';

const manifest = {
  sets: [
    { values: ['base.json'] },
    { 
      name: 'theme',
      values: ['light.json', 'dark.json'] 
    }
  ],
  modifiers: {
    theme: { oneOf: ['light', 'dark'] }
  }
};

const resolver = new UPFTResolver();
const result = await resolver.resolvePermutation(manifest, {
  theme: 'dark'
});

console.log('Resolved tokens:', result.tokens);
```