# Bundler

AST-based functional API for transforming and packaging resolved design tokens for distribution.

## Structure

| File | Purpose |
|------|---------|
| `ast-bundler.ts` | Core AST-based bundling functions |
| `index.ts` | Public exports |

## Key Functions

### bundle

Bundles tokens from a resolved ProjectAST into structured output.

```typescript
import { bundle } from '@upft/bundler';
import { runPipeline } from '@upft/loader';

// First resolve your project to get ProjectAST
const projectAST = await runPipeline('/path/to/manifest.json');

// Then bundle the resolved tokens
const bundles = bundle(projectAST, {
  outputFormat?: 'json',
  prettify?: true,
  transforms?: [/* transform functions */]
});
```

### writeBundles

Bundles tokens from ProjectAST and writes them to the filesystem.

```typescript
import { writeBundles } from '@upft/bundler';
import { runPipeline } from '@upft/loader';

const projectAST = await runPipeline('/path/to/manifest.json');

const results = await writeBundles(projectAST, './output', {
  outputFormat: 'json',
  prettify: true
});

// Check results
results.forEach(result => {
  if (result.success) {
    console.log(`✓ ${result.filePath}`);
  } else {
    console.error(`✗ ${result.filePath}: ${result.error}`);
  }
});
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `fileWriter` | `TokenFileWriter` | Custom file writer instance |
| `outputFormat` | `'json' \| 'yaml' \| 'json5'` | Output format (default: 'json') |
| `prettify` | `boolean` | Format output for readability |
| `transforms` | `TokenTransform[]` | Transform pipeline functions |
| `validate` | `boolean` | Validate tokens before writing |
| `backup` | `boolean` | Create backup of existing files |
| `atomic` | `boolean` | Use atomic writes for safety |

## Transform Pipeline

Transforms are functions that modify token documents before output:

```typescript
import type { TokenTransform } from '@upft/bundler';
import type { TokenDocument } from '@upft/foundation';

const addMetadata: TokenTransform = (tokens: TokenDocument) => ({
  ...tokens,
  $metadata: { bundled: true, timestamp: new Date().toISOString() }
});

const transforms = [addMetadata];

const bundles = bundle(projectAST, { transforms });
```

## Bundle Results

```typescript
interface Bundle {
  id: string;                    // Unique identifier
  tokens: TokenDocument;          // Merged tokens
  resolvedTokens?: TokenDocument; // If references resolved
  files: string[];               // Source files included
  output?: string;               // Output path
  format: string;                // Output format
}

interface BundleWriteResult {
  filePath: string;    // Output file path
  success: boolean;    // Write succeeded
  error?: string;      // Error if failed
}
```

## bundlePermutation

Bundle a single permutation instead of all permutations:

```typescript
import { bundlePermutation } from '@upft/bundler';
import { runPipeline } from '@upft/loader';

const projectAST = await runPipeline('/path/to/manifest.json');
const permutation = projectAST.manifest.permutations.get('theme-light');

if (permutation) {
  const bundle = bundlePermutation(permutation, {
    outputFormat: 'json',
    transforms: [addMetadata]
  });
}
```

## Architecture

The bundler operates on fully resolved ProjectAST objects, following this pipeline:

1. **Manifest** → processed by `@upft/loader`
2. **ProjectAST** → contains resolved permutations with tokens
3. **Bundler** → transforms permutations into output bundles
4. **File Writer** → writes bundles to filesystem

Each permutation in the ProjectAST contains:
- `tokens`: Raw token data
- `resolvedTokens`: Reference-resolved tokens (preferred for output)
- `resolvedFiles`: Source files that contributed to this permutation
- `outputPath`: Intended output file path

## Testing

Test bundling with mock ProjectAST:

```typescript
import { bundle } from '@upft/bundler';
import type { ProjectAST, PermutationAST } from '@upft/ast';

const mockPermutation: PermutationAST = {
  type: 'group',
  name: 'theme-light',
  path: '/test/permutations.theme-light',
  input: { theme: 'light' },
  resolvedFiles: ['colors.json'],
  tokens: {
    colors: { primary: { $value: '#007bff', $type: 'color' } }
  }
};

const mockProjectAST: ProjectAST = {
  type: 'project',
  name: 'test-project',
  path: '/test',
  files: new Map(),
  manifest: {
    permutations: new Map([['theme-light', mockPermutation]])
  },
  crossFileReferences: new Map(),
  dependencyGraph: new Map(),
  basePath: '/test'
} as ProjectAST;

const bundles = bundle(mockProjectAST);
```

## Error Handling

```typescript
import { writeBundles } from '@upft/bundler';

try {
  const results = await writeBundles(projectAST, './output');
  
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.error('Failed bundles:', failed);
  }
} catch (error) {
  if (error.message.includes('ProjectAST must contain a manifest')) {
    console.error('Invalid ProjectAST provided to bundler');
  }
  throw error;
}
```

## Performance

| Operation | Complexity |
|-----------|------------|
| Bundle creation | O(p) where p = permutations |
| Transform pipeline | O(t × m) where t = transforms, m = tokens |
| File writing | O(b) where b = bundles |

## Design Principles

1. **AST-based processing** - Works with fully resolved ProjectAST
2. **Functional composition** - Pure functions with transform pipeline
3. **Clean separation** - No dependency on manifest loading/resolution
4. **Type safety** - Full TypeScript support with strict typing
5. **Error recovery** - Transform errors are isolated per permutation

## Testing

```bash
pnpm --filter @upft/bundler test
```