# Manifest

Pluggable manifest resolver system supporting multiple design token manifest formats.

## Structure

| File | Purpose |
|------|---------|
| `registry.ts` | Pluggable resolver registry system |
| `parser.ts` | Manifest parsing utilities |
| `resolvers/upft-resolver.ts` | UPFT manifest format resolver |
| `resolvers/dtcg-resolver.ts` | W3C DTCG resolver specification implementation |
| `index.ts` | Public exports and resolver registration |

## Resolver Architecture

The manifest system uses a pluggable architecture where different manifest formats are handled by dedicated resolvers:

```typescript
import { detectManifestFormat, parseManifest } from '@upft/manifest';

// Auto-detect format and parse any manifest type
const format = detectManifestFormat(data);
if (format) {
  const ast = parseManifest(data, 'manifest.json');
}
```

Automatically detects manifest format (UPFT, DTCG, or custom) and parses using the appropriate resolver.

### UPFT Manifest Format

```typescript
import { isUPFTManifest, parseManifest } from '@upft/manifest';

const upftManifest = {
  name: 'Design System',
  sets: [{ name: 'core', files: ['tokens.json'] }],
  modifiers: {
    theme: {
      oneOf: ['light', 'dark'],
      values: { light: ['light.json'], dark: ['dark.json'] }
    }
  }
};

if (isUPFTManifest(upftManifest)) {
  const ast = parseManifest(upftManifest, 'manifest.json');
}
```

Native UPFT format with explicit permutation control and modifier definitions.

### DTCG Resolver Format

```typescript
import { isDTCGManifest, parseManifest } from '@upft/manifest';

const dtcgManifest = {
  name: 'DTCG Design System',
  version: '1.0.0',
  sets: [{ source: 'tokens.json' }],
  modifiers: [{
    name: 'theme',
    type: 'enumerated',
    values: ['light', 'dark'],
    sets: { light: [{ source: 'light.json' }], dark: [{ source: 'dark.json' }] }
  }]
};

if (isDTCGManifest(dtcgManifest)) {
  const ast = parseManifest(dtcgManifest, 'dtcg.json');
}
```

W3C DTCG resolver specification format with inline tokens and enumerated/include modifiers.

## Registry System

### Built-in Resolvers

```typescript
import { getRegisteredResolvers } from '@upft/manifest';

getRegisteredResolvers(); // Returns: ['upft', 'dtcg']
```

Lists all currently registered manifest format resolvers.

### Custom Resolvers

```typescript
import { registerManifestResolver } from '@upft/manifest';

const customResolver = {
  name: 'custom-format',
  detect: (manifest: unknown) => {
    return manifest && 'customField' in manifest;
  },
  parse: (manifest: unknown, path: string) => {
    // Return standardized ManifestAST
    return { type: 'manifest', name: 'Custom', path, /* ... */ };
  }
};

registerManifestResolver(customResolver);
```

Add support for custom manifest formats by implementing the resolver interface.

### Unified AST Output

All resolvers produce standardized ManifestAST structures:

```typescript
// Consistent AST structure regardless of source format
const ast = parseManifest(manifest, 'manifest.json');

console.log(ast.manifestType); // 'upft' | 'dtcg' | custom
for (const [name, modifier] of ast.modifiers) {
  console.log(`${name}: ${modifier.constraintType}`);
}
```

All resolvers produce unified AST structures with the same API regardless of input format.

## Format-Specific Features

### DTCG Resolver Features

```typescript
// DTCG supports inline tokens in sets
const dtcgWithInline: DTCGResolverManifest = {
  version: '1.0.0',
  sets: [
    { source: 'external-tokens.json' },
    { 
      tokens: {
        color: {
          debug: { $type: 'color', $value: '#ff0000' }
        }
      },
      namespace: 'debug'
    }
  ]
};

// DTCG enumerated modifiers
const enumerated = {
  name: 'theme',
  type: 'enumerated',
  values: ['light', 'dark'],
  sets: {
    light: [{ source: 'light.json' }],
    dark: [{ source: 'dark.json' }]
  }
};

// DTCG include modifiers (additive)
const include = {
  name: 'platform',
  type: 'include',
  include: [
    { source: 'web.json' },
    { source: 'mobile.json' }
  ]
};
```

### UPFT Format Features

```typescript
// UPFT explicit permutation generation
const upftWithGenerate = {
  sets: [{ name: 'core', files: ['tokens.json'] }],
  modifiers: {
    theme: { oneOf: ['light', 'dark'], values: { /* ... */ } }
  },
  generate: [
    { theme: 'light', output: 'light-tokens.json' },
    { theme: 'dark', output: 'dark-tokens.json' }
  ]
};
```

## Permutation Utilities

```typescript
import { 
  generatePermutationId,
  resolvePermutationFiles,
  updatePermutationAST 
} from '@upft/manifest';

// Works with any manifest format
const permutationInput = { theme: 'dark', density: 'compact' };
const id = generatePermutationId(permutationInput);
// 'theme-dark_density-compact'

// Resolve files for permutation
const ast = parseManifest(manifest, 'manifest.json');
const permutation = ast.permutations.get(id);
if (permutation) {
  const files = resolvePermutationFiles(ast, permutation);
  updatePermutationAST(permutation, files, tokens, resolvedTokens);
}
```

### Modifier Processing  

```typescript
// OneOf modifier (single selection)
const themeModifier = {
  oneOf: ['light', 'dark'],
  values: {
    light: ['theme-light.json'],
    dark: ['theme-dark.json']
  }
};

// AnyOf modifier (multiple selections)  
const featureModifier = {
  anyOf: ['animations', 'interactions', 'accessibility'],
  values: {
    animations: ['features/animations.json'],
    interactions: ['features/interactions.json'], 
    accessibility: ['features/accessibility.json']
  }
};
```

## Validation

### Format Validation

```typescript
import { validateManifestWithRegistry } from '@upft/manifest';

// Automatic format detection and validation
const result = validateManifestWithRegistry(manifest);

if (!result.valid) {
  console.error('Validation errors:');
  result.errors.forEach(error => {
    console.error(`${error.path}: ${error.message}`);
  });
}

if (result.warnings.length > 0) {
  console.warn('Validation warnings:');
  result.warnings.forEach(warning => {
    console.warn(`${warning.path}: ${warning.message}`);
  });
}
```

## AST Structure

### Unified Manifest AST

```typescript
interface ManifestAST {
  type: 'manifest';
  name: string;
  path: string;
  manifestType: 'upft' | 'dtcg' | string; // Extensible for custom formats
  sets: Map<string, TokenSetAST>;
  modifiers: Map<string, ModifierAST>;
  permutations: Map<string, PermutationAST>;
  metadata?: {
    description?: string;
    version?: string; // DTCG version
    extensions?: Record<string, unknown>; // DTCG extensions
    schema?: string; // UPFT schema
    // Format-specific metadata stored here
  };
}
```

### Format-Agnostic Token Set AST

```typescript
interface TokenSetAST {
  type: 'manifest';
  name: string;
  path: string;
  files: string[]; // External file references
  metadata?: {
    description?: string;
    // DTCG-specific
    dtcgInlineTokens?: Record<string, unknown>;
    dtcgNamespace?: string;
    // UPFT-specific
    upftValues?: Record<string, unknown>;
  };
}
```

### Format-Agnostic Modifier AST

```typescript
interface ModifierAST {
  type: 'manifest';
  name: string;
  path: string;
  constraintType: 'oneOf' | 'anyOf'; // Unified constraint model
  options: string[];
  values: Map<string, string[]>; // Value -> file paths mapping
  defaultValue?: string | string[];
  description?: string;
  metadata?: {
    // DTCG-specific
    dtcgType?: 'enumerated' | 'include';
    virtualFile_*?: Record<string, unknown>; // Inline tokens
    // UPFT-specific
    upftType?: 'oneOf' | 'anyOf';
  };
}
```

### Permutation AST

```typescript
interface PermutationAST {
  type: 'group';
  name: string;
  path: string;
  input: Record<string, string | string[]>;
  resolvedFiles: string[];
  tokens: TokenDocument;
  resolvedTokens?: TokenDocument;
  parent: ManifestAST;
  outputPath?: string;
}
```

## Generation Strategies

### Explicit Generation

```typescript
// Manifest with explicit permutations
const manifest = {
  // ... sets and modifiers
  generate: [
    { theme: 'light', density: 'comfortable', output: 'light-comfortable.json' },
    { theme: 'dark', density: 'comfortable', output: 'dark-comfortable.json' },
    { theme: 'light', density: 'compact', output: 'light-compact.json' }
  ]
};

// Only specified permutations are generated
const manifestAST = parseManifest(manifest);
console.log(manifestAST.permutations.size); // 3
```

### Automatic Generation

```typescript
// Manifest without explicit generate - creates all combinations
const manifest = {
  sets: [{ name: 'core', files: ['tokens.json'] }],
  modifiers: {
    theme: { oneOf: ['light', 'dark'], values: { /* ... */ } },
    density: { oneOf: ['comfortable', 'compact'], values: { /* ... */ } }
  }
  // No generate array = automatic generation
};

const manifestAST = parseManifest(manifest);
console.log(manifestAST.permutations.size); // 4 (2 × 2)
```

## File Resolution

### Base and Override Files

```typescript
// Permutation file resolution follows this order:
// 1. Base set files (always included)
// 2. Modifier-specific files (based on permutation input)

const permutation = {
  input: { theme: 'dark', features: ['animations', 'accessibility'] }
};

const files = resolvePermutationFiles(manifestAST, permutation);
// Result: [
//   'tokens/core.json',        // from base set
//   'tokens/theme-dark.json',  // from theme=dark
//   'tokens/animations.json',  // from features=animations
//   'tokens/accessibility.json' // from features=accessibility
// ]
```

## Integration Examples

### With Foundation Types

```typescript
import type { UPFTResolverManifest } from '@upft/foundation';
import { parseManifest } from '@upft/manifest';

const manifest: UPFTResolverManifest = loadFromFile('manifest.json');
const ast = parseManifest(manifest);
```

### With Loader Package

```typescript
import { runPipeline } from '@upft/loader';

// Loader uses @upft/manifest internally
const projectAST = await runPipeline('manifest.json');

// Access parsed manifest
const manifestAST = projectAST.files.get('manifest.json');
if (manifestAST?.type === 'manifest') {
  console.log(manifestAST.permutations.size);
}
```

## Performance

| Operation | Complexity |
|-----------|------------|
| Manifest Parsing | O(s + m) where s = sets, m = modifiers |
| Permutation Generation | O(2^n) where n = anyOf options |
| File Resolution | O(m × f) where m = modifiers, f = files |
| ID Generation | O(k) where k = input keys |


## Examples

See `@upft/examples/test-scenarios/` for format examples including DTCG resolvers and UPFT manifests.

## Testing

```bash
pnpm --filter @upft/manifest test
```