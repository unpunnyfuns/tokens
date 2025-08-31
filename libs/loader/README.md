# Loader

Multi-pass pipeline for loading, validating, and resolving design token manifests into ProjectAST.

## Structure

| File | Purpose |
|------|---------|
| `index.ts` | Public exports |
| `pipeline.ts` | High-level pipeline orchestration |
| `loader.ts` | File loading and caching |
| `pipeline-resolver.ts` | Permutation generation and resolution |
| `multi-pass-resolver.ts` | Reference resolution logic |
| `types.ts` | Type definitions |

## Key Functions

### runPipeline

```typescript
import { runPipeline } from '@upft/loader';

const projectAST = await runPipeline('/path/to/manifest.json');
```

Processes a manifest (UPFT or DTCG) into a fully resolved ProjectAST with loaded files, resolved references, and generated permutations.

### createLoader

```typescript
import { createLoader } from '@upft/loader';

const loader = createLoader({ validate: true });
const result = await loader.loadFile('/tokens.json');
```

Creates a file loader with caching and optional validation for individual file loading.

### Pipeline Options

```typescript
import type { PipelineOptions } from '@upft/loader';

const options: PipelineOptions = {
  validate: true,
  maxDepth: 10,
  followReferences: true
};

const projectAST = await runPipeline('manifest.json', options);
```

Configure pipeline behavior including validation, reference resolution depth, and file following.

### Permutation Resolution

```typescript
import { generateAllPermutations, resolvePermutation } from '@upft/loader';

// Generate all permutations from manifest
const permutations = generateAllPermutations(manifestAST);

// Resolve specific permutation
const resolved = await resolvePermutation(permutation, { files });
```

Generate permutation combinations from manifest modifiers and resolve them with actual token data.

### Caching

```typescript
import { clearCache, createLoader } from '@upft/loader';

// Files cached automatically based on modification time
const loader = createLoader();
await loader.loadFile('/tokens.json'); // Loads from disk
await loader.loadFile('/tokens.json'); // Returns cached version

clearCache(); // Clear all cached files
```

Intelligent file caching avoids reloading unchanged files for better performance.

### Integration

```typescript
import { runPipeline } from '@upft/loader';
import { bundle } from '@upft/bundler';

// Complete pipeline: load → resolve → bundle
const projectAST = await runPipeline('manifest.json');
const bundles = bundle(projectAST);
```

Seamlessly integrates with bundler and other packages for complete token processing workflows.

### Multi-Pass Resolution

```typescript
import { createProjectAST } from '@upft/loader';

// Direct AST creation with file I/O
const projectAST = await createProjectAST(manifestAST, {
  basePath: './tokens',
  followReferences: true
});
```

Creates ProjectAST directly from ManifestAST with multi-pass reference resolution.


## Testing

```bash
pnpm --filter @upft/loader test
```