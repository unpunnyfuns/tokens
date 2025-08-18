# UPFT Documentation

Comprehensive documentation for the Universal Platform for Tokens (UPFT) - a modern implementation of the Design Tokens Community Group specification with multi-dimensional token composition capabilities.

## Table of Contents

- [Specifications](#specifications)
- [Guides](#guides)
- [Module Documentation](#module-documentation)
- [Contributing](#contributing)

## Specifications

Technical specifications and standards implemented by UPFT.

### [DTCG Token Specification](./specifications/dtcg-tokens.md)
Comprehensive guide to the Design Tokens Community Group token format, including token structure, supported types, validation requirements, and migration strategies. Essential reading for understanding how UPFT implements and extends the DTCG standard.

### [UPFT Manifest Specification](./specifications/manifest.md)
Declarative configuration format for multi-dimensional token composition. Learn how to define token sets, configure modifiers for themes and features, and generate targeted token bundles for different platforms and contexts.

## Guides

Practical guides for common tasks and advanced patterns.

### [Token Filtering Guide](./guides/filtering.md)
Control which tokens are included in generated bundles through set-based and modifier-based filtering. Reduce bundle sizes and improve performance by shipping only relevant tokens to each platform or component.

### [Theming Guide](./guides/theming.md)
Build sophisticated multi-dimensional design systems with themes, modes, and feature variations. Covers patterns from basic light/dark themes to complex multi-brand, multi-platform systems with accessibility modes.

## Module Documentation

Each module in the UPFT codebase includes comprehensive documentation within its directory. Navigate to any module's README for detailed API references, usage examples, and architectural decisions.

### Core Modules

- [**analyzer**](../src/analyzer/README.md) - Token analysis and validation with detailed error reporting
- [**ast**](../src/ast/README.md) - Abstract syntax tree operations for token manipulation
- [**bundler**](../src/bundler/README.md) - Multi-format token bundling with transformation pipeline
- [**file-writer**](../src/file-writer/README.md) - Atomic file operations with validation and backup
- [**manifest**](../src/manifest/README.md) - Manifest parsing and validation for token composition
- [**parser**](../src/parser/README.md) - Multi-format token parsing (JSON, YAML, JSON5)
- [**resolver**](../src/resolver/README.md) - Multi-dimensional token resolution engine
- [**schemas**](../src/schemas/README.md) - JSON Schema definitions for tokens and manifests
- [**validator**](../src/validator/README.md) - Comprehensive token validation against DTCG spec

### Utility Modules

- [**linter**](../src/linter/README.md) - Token linting for consistency and best practices (WIP)
- [**utils**](../src/utils/README.md) - Shared utilities and helpers

## Architecture Overview

UPFT implements a functional architecture with clear module boundaries and explicit data flow:

```
Input Files → Parser → AST → Analyzer/Validator → Resolver → Bundler → Output Files
                ↑                    ↓                 ↓
            Manifest ←──────── Schemas ────────→ FileWriter
```

### Design Principles

1. **Functional composition** - Pure functions with explicit dependencies
2. **Type safety** - Full TypeScript coverage with strict typing
3. **Error transparency** - Detailed error messages with actionable feedback
4. **Performance focus** - Optimized for large token systems
5. **Standards compliance** - DTCG specification adherence

### Key Features

- **Multi-dimensional composition** - Combine themes, densities, features orthogonally
- **Format agnostic** - Support for JSON, YAML, and JSON5
- **Comprehensive validation** - Schema, type, and reference validation
- **Flexible bundling** - Transform and optimize for any platform
- **Atomic operations** - Safe file writing with backup and recovery

## Getting Started

1. **Installation**: Install UPFT via npm, yarn, or pnpm
2. **Create tokens**: Define your tokens following DTCG specification
3. **Configure manifest**: Set up multi-dimensional composition rules
4. **Generate bundles**: Use the resolver and bundler to create optimized outputs

## API Stability

UPFT follows semantic versioning with a stable public API. All modules export functional APIs with consistent patterns:

```typescript
// Consistent functional pattern across all modules
import { validateTokens } from 'upft/validator';
import { resolveTokens } from 'upft/resolver';
import { bundleTokens } from 'upft/bundler';
```

## Performance

UPFT is optimized for large-scale token systems:

- Linear performance scaling with token count
- Efficient AST operations for transformation
- Memoized reference resolution
- Optimized file operations with caching
- Incremental builds for changed files only

## Contributing

Contributions are welcome! Please ensure:

1. All tests pass (`npm test`)
2. Code is formatted with Biome (`npm run format`)
3. Type checking passes (`npm run typecheck`)
4. Documentation is updated for API changes

## License

MIT License - See the root LICENSE file for details.

## Support

For issues, questions, or feature requests, please visit the GitHub repository.