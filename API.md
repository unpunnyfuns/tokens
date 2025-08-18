# UPFT API Documentation

Complete API reference for the UnPunny Fun Tokens (UPFT) platform.

## Module Overview

| Module | Description | Documentation |
|--------|-------------|---------------|
| **core** | Core token operations and utilities | [API Reference](./src/core/API.md) |
| **references** | Reference resolution and cycle detection | [API Reference](./src/references/API.md) |
| **ast** | Abstract Syntax Tree operations | [API Reference](./src/ast/API.md) |
| **validation** | Token and manifest validation | [API Reference](./src/validation/API.md) |
| **manifest** | Multi-dimensional token manifests | [API Reference](./src/manifest/API.md) |
| **io** | File system operations | [API Reference](./src/io/API.md) |
| **bundler** | Token bundling and output generation | [API Reference](./src/bundler/API.md) |
| **api** | High-level convenience APIs | [API Reference](./src/api/API.md) |
| **cli** | Command-line interface | [API Reference](./src/cli/API.md) |
| **analysis** | Token analysis and comparison | [API Reference](./src/analysis/API.md) |
| **types** | TypeScript type definitions | [API Reference](./src/types/API.md) |

## Main Entry Points

### Default Export (`@unpunnyfuns/tokens`)
High-level API for common token operations. See [index.ts](./src/index.ts).

```typescript
import { 
  bundleWithMetadata,
  validateManifest,
  resolveReferences,
  mergeTokens 
} from '@unpunnyfuns/tokens';
```

### Core Export (`@unpunnyfuns/tokens/core`)
Advanced API for tool builders. See [public-core.ts](./src/public-core.ts).

```typescript
import { 
  TokenBundler,
  validateTokenDocument,
  buildASTFromDocument 
} from '@unpunnyfuns/tokens/core';
```

## Quick Links

- [Getting Started](./README.md)
- [Examples](./src/examples/README.md)
- [Type Definitions](./src/types.ts)
- [Configuration Options](./src/types/options.ts)