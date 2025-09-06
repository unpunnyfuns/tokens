# upft

TypeScript toolkit for DTCG-compliant design token validation, processing, and bundling with pluggable manifest resolver architecture.

## Quick Start

```bash
# Install CLI globally
npm install -g @upft/cli

# Validate design tokens
upft validate tokens.json

# Bundle tokens from manifest (UPFT or DTCG format)
upft bundle manifest.json

# List available permutations
upft list manifest.json

# Resolve specific permutation
upft resolve manifest.json --modifiers theme=dark,density=compact
```

## Architecture

UPFT uses a modular architecture with pluggable manifest resolvers supporting multiple formats:

- **UPFT Manifests**: Native format with explicit permutation control
- **DTCG Resolvers**: W3C Design Tokens Community Group resolver specification
- **Extensible**: Add custom manifest formats via the resolver registry

## Packages

### Core Pipeline

| Package | Purpose |
|---------|---------|
| **[@upft/cli](./apps/cli)** | Command-line interface with multi-format support |
| **[@upft/foundation](./libs/foundation)** | Core types and utilities for all packages |
| **[@upft/manifest](./libs/manifest)** | Pluggable manifest resolver system (UPFT/DTCG/custom) |
| **[@upft/loader](./libs/loader)** | Multi-pass pipeline for loading and resolving |
| **[@upft/bundler](./libs/bundler)** | AST-based token bundling and validation |

### Processing & Analysis

| Package | Purpose |
|---------|---------|
| **[@upft/ast](./libs/ast)** | Abstract syntax tree operations and traversal |
| **[@upft/tokens](./libs/tokens)** | Token parsing and manipulation utilities |
| **[@upft/analysis](./libs/analysis)** | Token analysis and comparison utilities |
| **[@upft/linter](./libs/linter)** | Token linting and style checking |

### Validation & Schemas

| Package | Purpose |
|---------|---------|
| **[@upft/schema-validator](./libs/schema-validator)** | Schema validation engine |
| **[@upft/schemas](./libs/schemas)** | DTCG validation schemas |

### Infrastructure

| Package | Purpose |
|---------|---------|
| **[@upft/io](./libs/io)** | File system operations with caching |
| **[@upft/fixtures](./libs/fixtures)** | Comprehensive examples and test fixtures |

## Usage Examples

### Basic Token Processing

```typescript
import { runPipeline } from '@upft/loader';
import { bundle } from '@upft/bundler';

// Load and process any manifest format
const projectAST = await runPipeline('manifest.json');
const bundles = bundle(projectAST);
```

### Multi-Format Manifest Support

```typescript
import { detectManifestFormat, parseManifest } from '@upft/manifest';

// Auto-detect and parse UPFT or DTCG manifests
const format = detectManifestFormat(manifestData);
if (format) {
  const ast = parseManifest(manifestData, 'manifest.json');
}
```

### Custom Manifest Resolvers

```typescript
import { registerManifestResolver } from '@upft/manifest';

const customResolver = {
  name: 'custom-format',
  detect: (manifest) => manifest && 'customField' in manifest,
  parse: (manifest, path) => { /* return ManifestAST */ }
};

registerManifestResolver(customResolver);
```

## Development

```bash
git clone https://github.com/unpunnyfuns/tokens.git
cd upft
pnpm install
pnpm build
```

### Testing

```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm --filter @upft/manifest test

# Run quality checks
pnpm quality
```

## Documentation

- **Individual Packages**: See each package's README for detailed usage
- **Examples**: Comprehensive examples in `@upft/examples`
- **DTCG Compliance**: Full support for W3C Design Tokens Community Group specifications

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed development workflows.