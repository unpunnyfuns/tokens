# Manifest

Declarative configuration system for multi-dimensional token resolution enabling sophisticated theme and variant management. This module interprets manifest specifications to orchestrate complex token compositions, handling permutation generation, constraint validation, and file collection strategies that power flexible design system architectures.

## Table of Contents

- [Overview](#overview)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Structure](#structure)
- [Performance](#performance)
- [Testing](#testing)

## Overview

The manifest module provides comprehensive support for multi-dimensional token systems through declarative manifests. It handles resolution of token permutations, file collection, validation, and generation of all possible combinations based on modifier constraints.

The module supports both "oneOf" modifiers (requiring exactly one selection) and "anyOf" modifiers (allowing zero or more selections), enabling complex design system variations like themes, densities, brands, and feature flags. All operations include proper error handling, dependency tracking, and efficient file loading with caching support.

## Usage

### Basic Resolution

Resolve a specific combination of modifiers:

```typescript
import { resolvePermutation } from '@unpunnyfuns/tokens';
import { TokenFileReader } from '@unpunnyfuns/tokens';

const manifest = {
  name: "Design System",
  sets: [
    { name: "core", values: ["tokens/core.json"] }
  ],
  modifiers: {
    theme: {
      oneOf: ["light", "dark"],
      values: {
        light: ["tokens/themes/light.json"],
        dark: ["tokens/themes/dark.json"]
      }
    },
    density: {
      anyOf: ["comfortable", "compact"],
      values: {
        comfortable: ["tokens/density/comfortable.json"],
        compact: ["tokens/density/compact.json"]
      }
    }
  }
};

const fileReader = new TokenFileReader({ basePath: './tokens' });
const result = await resolvePermutation(
  manifest,
  { theme: 'dark', density: ['compact'] },
  { fileReader }
);

console.log(result.id); // "theme-dark_density-compact"
console.log(result.files); // ["tokens/core.json", "tokens/themes/dark.json", "tokens/density/compact.json"]
console.log(result.tokens); // Merged token document
```

### Generate All Permutations

Generate all combinations defined in the manifest:

```typescript
import { generateAll } from '@unpunnyfuns/tokens';

const manifest = {
  // ... manifest definition
  generate: [
    { theme: 'light', output: 'dist/light.json' },
    { theme: 'dark', output: 'dist/dark.json' },
    { theme: 'dark', density: ['compact'], output: 'dist/dark-compact.json' }
  ]
};

const results = await generateAll(manifest, { fileReader });

for (const result of results) {
  console.log(`Generated ${result.id}:`);
  console.log(`  Files: ${result.files.join(', ')}`);
  console.log(`  Output: ${result.output || 'no output specified'}`);
}
```

### Input Validation

Validate modifier inputs against manifest constraints:

```typescript
import { validateInput } from '@unpunnyfuns/tokens';

const validation = validateInput(manifest, { 
  theme: 'invalid-theme',
  density: ['nonexistent'] 
});

if (!validation.valid) {
  for (const error of validation.errors) {
    console.error(`${error.modifier}: ${error.message}`);
  }
}
// Output:
// theme: Value "invalid-theme" is not in oneOf ["light", "dark"]
// density: Value "nonexistent" is not in anyOf ["comfortable", "compact"]
```

### Reading Manifests

Load manifests from files with automatic validation:

```typescript
import { readManifest } from '@unpunnyfuns/tokens';

const manifest = await readManifest('./tokens.manifest.json', './base/path');
// Automatically validates manifest structure and resolves relative paths
```

### Filtering

Control which tokens contribute to output using include/exclude filters:

```typescript
const manifest = {
  sets: [
    { name: "core", values: ["core.json"] },
    { name: "brand", values: ["brand.json"] }
  ],
  modifiers: {
    theme: {
      oneOf: ["light", "dark"],
      values: {
        light: ["light.json"],
        dark: ["dark.json"]
      }
    }
  },
  generate: [{
    theme: "dark",
    includeSets: ["core"],        // Only include core set
    excludeModifiers: ["*"],      // Exclude all modifiers
    output: "core-only.json"
  }]
};

const results = await generateAll(manifest);
// Will only include tokens from core.json, no theme files
```

### Custom File Collection

Collect and merge files for specific permutations:

```typescript
import { collectFiles, loadAndMergeFiles } from '@unpunnyfuns/tokens';

const files = await collectFiles(manifest, { theme: 'light' }, fileReader);
console.log('Files to load:', files);
// ["tokens/core.json", "tokens/themes/light.json"]

const mergedTokens = await loadAndMergeFiles(files, fileReader);
console.log('Merged tokens:', Object.keys(mergedTokens));
```

## API Reference

### Core Functions

#### `resolvePermutation`

```typescript
function resolvePermutation(
  manifest: UPFTResolverManifest, 
  input: ResolutionInput, 
  options?: ResolverOptions
): Promise<ResolvedPermutation>
```

Resolve a single permutation with the given input modifiers.

#### `generateAll`

```typescript
function generateAll(
  manifest: UPFTResolverManifest, 
  options?: ResolverOptions
): Promise<ResolvedPermutation[]>
```

Generate all permutations defined in the manifest's generate array.

### Validation Functions

#### `validateInput`

```typescript
function validateInput(
  manifest: UPFTResolverManifest, 
  input: ResolutionInput
): InputValidation
```

Validate resolution input against manifest constraints.

### File Operations

#### `collectFiles`

```typescript
function collectFiles(
  manifest: UPFTResolverManifest, 
  input: ResolutionInput, 
  fileReader: TokenFileReader
): Promise<string[]>
```

Collect all files needed for a specific permutation.

#### `loadAndMergeFiles`

```typescript
function loadAndMergeFiles(
  files: string[], 
  fileReader: TokenFileReader
): Promise<TokenDocument>
```

Load and merge multiple token files with type validation.

### Generation Functions

#### `expandGenerateSpec`

```typescript
function expandGenerateSpec(
  manifest: UPFTResolverManifest, 
  spec: GenerateSpec
): ResolutionInput
```

Expand a generation specification to concrete input.

#### `expandSpecWithFiltering`

```typescript
function expandSpecWithFiltering(
  manifest: UPFTResolverManifest, 
  spec: GenerateSpec
): Array<{ spec: GenerateSpec, output?: string }>
```

Expand specification with include/exclude filtering applied.

#### `generateAllPermutations`

```typescript
function generateAllPermutations(
  manifest: UPFTResolverManifest
): ResolutionInput[]
```

Generate all mathematically possible permutations.

### Filtering Functions

#### `shouldIncludeSet`

```typescript
function shouldIncludeSet(
  setName: string, 
  spec: GenerateSpec
): boolean
```

Check if a set should be included based on filtering rules.

#### `shouldIncludeModifier`

```typescript
function shouldIncludeModifier(
  modifierName: string, 
  value: string, 
  spec: GenerateSpec
): boolean
```

Check if a modifier value should be included.

#### `filterFiles`

```typescript
function filterFiles(
  manifest: UPFTResolverManifest, 
  input: ResolutionInput, 
  spec: GenerateSpec, 
  fileReader: TokenFileReader
): Promise<string[]>
```

Filter files based on generation specification.

### File Reading

#### `readManifest`

```typescript
function readManifest(
  filePath: string, 
  basePath?: string
): Promise<UPFTResolverManifest>
```

Read and validate manifest from file system.

### Type Definitions

#### `UPFTResolverManifest`

Core manifest structure containing sets, modifiers, and generation specs.

#### `ResolutionInput`

Input object mapping modifier names to their selected values.

#### `ResolvedPermutation`

Result of resolving a permutation, containing ID, files, and merged tokens.

#### `GenerateSpec`

Specification for generating a permutation with optional filtering.

#### `ResolverOptions`

Options for resolution including file reader and validation settings.

#### `InputValidation`

Result of input validation with success status and error details.

### Type Guards

#### `isOneOfModifier`

```typescript
function isOneOfModifier(modifier: unknown): modifier is OneOfModifier
```

Check if a modifier requires exactly one selection.

#### `isAnyOfModifier`

```typescript
function isAnyOfModifier(modifier: unknown): modifier is AnyOfModifier
```

Check if a modifier allows zero or more selections.

#### `isUPFTManifest`

```typescript
function isUPFTManifest(value: unknown): value is UPFTResolverManifest
```

Validate that a value is a properly structured manifest.

## Structure

| File | Purpose |
|------|---------|
| `manifest-core.ts` | Core resolution functions |
| `manifest-validation.ts` | Input validation for manifests |
| `manifest-files.ts` | File collection and loading |
| `manifest-generation.ts` | Permutation generation utilities |
| `manifest-filtering.ts` | Include/exclude filtering |
| `manifest-reader.ts` | Manifest file reading |
| `upft-types.ts` | TypeScript type definitions |

## Performance

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Single resolution | O(f) | Where f = number of files to load |
| Generate all | O(n × f) | Where n = number of generate specs |
| Input validation | O(m) | Where m = number of modifiers |
| File collection | O(s + m) | Where s = sets, m = modifiers |
| Permutation expansion | O(2^k) | Where k = number of anyOf modifiers |

The module uses efficient caching through the file reader to minimize redundant file loads. Dependency graphs are built once and reused for multiple resolutions.

## Testing

```bash
npm test -- src/manifest
```

Key test scenarios:
- Basic resolution with sets and modifiers
- AnyOf combinations (power set generation)
- Filtering with include/exclude patterns
- Multi-file generation workflows
- Error handling for invalid inputs
- Circular dependency detection
- File loading and merging