# @unpunnyfuns/tokens API Documentation

A library for validating and bundling DTCG-format design tokens with resolver manifest support.

## Installation

```bash
npm install @unpunnyfuns/tokens
# or
yarn add @unpunnyfuns/tokens
```

## Core API

### Token Validation

```typescript
import { validateFiles } from '@unpunnyfuns/tokens/validators';

// Validate token files against DTCG schemas
const isValid = await validateFiles('./my-tokens');
if (!isValid) {
  console.error('Token validation failed');
}
```

### Token Bundling

```typescript
import { bundleWithMetadata } from '@unpunnyfuns/tokens/bundler/api';

// Bundle tokens from a manifest with metadata
const result = await bundleWithMetadata({
  manifest: './manifest.json',
  theme: 'dark',
  mode: 'compact',
  resolveValues: true,  // Resolve references to their values
  includeMetadata: true
});

console.log('Bundled tokens:', result.tokens);
console.log('Files loaded:', result.metadata.files.count);
console.log('Total tokens:', result.metadata.stats.totalTokens);

// Validate the bundled tokens
const validation = await result.validate();
if (!validation.valid) {
  console.error('Reference errors:', validation.errors);
}
```

### Basic Bundling

```typescript
import { bundle } from '@unpunnyfuns/tokens/bundler';

// Bundle tokens from a manifest
const tokens = await bundle({
  manifest: './manifest.json',
  theme: 'dark',
  resolveRefs: true  // Resolve references to values
});
```

### External References

```typescript
import { 
  resolveExternalReferences, 
  checkForExternalReferences 
} from '@unpunnyfuns/tokens/bundler';

// Check if tokens contain external references
const check = checkForExternalReferences(tokens);
if (check.hasExternal) {
  console.log('External references found:', check.externalRefs);
}

// Resolve only external references
const resolved = await resolveExternalReferences(
  tokens,
  '/base/directory'
);
```

### Format Conversion

```typescript
import { convertToDTCG } from '@unpunnyfuns/tokens/bundler';

// Convert JSON Schema $ref format to DTCG alias format
const dtcgTokens = convertToDTCG(tokens, {
  preserveExternal: true,  // Keep external refs as $ref
  convertInternal: true,    // Convert internal refs to aliases
  warnOnConversion: true    // Log conversion warnings
});
```

## CLI Commands

The library provides a CLI tool `upft` for validation and bundling:

```bash
# Validate token files
upft validate ./tokens

# Bundle tokens from manifest
upft bundle -m manifest.json -o output.json

# Bundle with theme/mode modifiers
upft bundle -m manifest.json -t dark --mode compact

# Bundle and resolve all references to values
upft bundle -m manifest.json -r

# Generate AST for analysis
upft ast -m manifest.json -o ast.json
```

## Manifest Format

The resolver manifest controls how tokens are bundled:

```json
{
  "sets": [
    {
      "values": ["tokens/base/*.json"]
    }
  ],
  "modifiers": [
    {
      "name": "theme",
      "values": [
        {
          "name": "light",
          "values": ["tokens/themes/light.json"]
        },
        {
          "name": "dark",
          "values": ["tokens/themes/dark.json"]
        }
      ]
    }
  ]
}
```

## Type Definitions

```typescript
import type {
  // Validation types
  ValidationResult,
  ValidationOptions,
  FileValidationResult,
  
  // Bundle types
  BundleOptions,
  BundleResult,
  BundleMetadata,
  TokenStats,
  
  // AST types
  EnhancedAST,
  ASTToken,
  ASTGroup,
  ASTStats,
  
  // Core types
  Token,
  ResolverOptions
} from '@unpunnyfuns/tokens/api';
```

## Error Handling

```typescript
import { bundleWithMetadata, formatError } from '@unpunnyfuns/tokens/api';

try {
  const result = await bundleWithMetadata({
    manifest: './manifest.json'
  });
} catch (error) {
  const message = formatError(error, true); // true for verbose
  console.error('Bundle failed:', message);
}
```

## License

MIT