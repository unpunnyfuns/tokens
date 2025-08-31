# Bundler

Converts resolved AST structures into final token output bundles.

## Structure

| File | Purpose |
|------|---------|
| `ast-bundler.ts` | Core bundling logic and validation |
| `bundle-validator.ts` | Bundle content validation |
| `index.ts` | Public exports |

## Core Functions

### Project Bundling

```typescript
import { bundle } from '@upft/bundler';

const bundles = bundle(projectAST, {
  outputFormat: 'json',
  prettify: true
});
```

Bundles entire ProjectAST into final token files organized by permutation.

### Permutation Bundling

```typescript
import { bundlePermutation } from '@upft/bundler';

const bundle = bundlePermutation(permutation, {
  resolveReferences: true
});
```

Bundles individual permutations with resolved token values.

### Bundle Options

```typescript
const options = {
  outputFormat: 'json' as const,
  prettify: true,
  resolveReferences: true
};
```

Configures bundle generation including output format, reference resolution, and formatting.

### Reference Resolution

```typescript
// Input tokens with references
const tokens = {
  colors: {
    primary: { $type: 'color', $value: '#ff0000' },
    accent: { $type: 'color', $value: '{colors.primary}' }
  }
};

// Bundle resolves references automatically
const bundle = bundlePermutation(permutation);
console.log(bundle.colors.accent.$value); // '#ff0000'
```

Automatically resolves DTCG token references during bundling process.

### Bundle Validation

```typescript
import { validateBundle } from '@upft/bundler';

const bundle = bundlePermutation(permutation);
const validation = validateBundle(bundle);

if (!validation.valid) {
  console.error(validation.errors);
}
```

Validates bundle contents for correct token structure, types, and references.

### Integration

```typescript
import { runPipeline } from '@upft/loader';
import { bundle } from '@upft/bundler';

// Complete pipeline: load → resolve → bundle
const projectAST = await runPipeline('manifest.json');
const bundles = bundle(projectAST);
```

Seamlessly integrates with loader for complete token processing workflows.

## Testing

```bash
pnpm --filter @upft/bundler test
```