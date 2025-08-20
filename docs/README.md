# UPFT Documentation

Documentation for the Universal Platform for Tokens (UPFT) - an implementation of the Design Tokens Community Group specification with multi-dimensional token composition.

## Table of Contents

- [Specifications](#specifications)
- [Guides](#guides)
- [Module Documentation](#module-documentation)
- [Contributing](#contributing)

## Specifications

Technical specifications and standards implemented by UPFT.

### [DTCG Token Specification](./specifications/dtcg-tokens.md)
Guide to the Design Tokens Community Group token format, including token structure, supported types, validation requirements, and migration strategies. Covers how UPFT implements the DTCG standard.

### [UPFT Manifest Specification](./specifications/manifest.md)
Declarative configuration format for multi-dimensional token composition. Learn how to define token sets, configure modifiers for themes and features, and generate targeted token bundles for different platforms and contexts.

### [API Design Specification](./specifications/api-design.md)
Design principles, naming conventions, and module structure for the UPFT API. Covers functional programming patterns, type organization, and error handling strategies.

## Guides

Practical guides for common tasks and advanced patterns.

### [Module Overview](./module-overview.md)
Complete reference for all UPFT modules, their key functions, and usage examples. Quick reference for finding the right module and function for your needs.

### [Token Filtering Guide](./guides/filtering.md)
Control which tokens are included in generated bundles through set-based and modifier-based filtering. Reduce bundle sizes by including only relevant tokens for each platform or component.

### [Theming Guide](./guides/theming.md)
Build multi-dimensional design systems with themes, modes, and feature variations. Covers patterns from basic light/dark themes to multi-brand, multi-platform systems with accessibility modes.

### [Linting Guide](./linting.md)
Configure and use the token and manifest linting system. Covers rule configuration, presets, severity levels, and integration with CI/CD pipelines.

## Module Documentation

Each module in the UPFT codebase includes comprehensive documentation within its directory. Navigate to any module's README for detailed API references, usage examples, and architectural decisions.

### Core Modules

- [**analysis**](../src/analysis/README.md) - Token analysis and comparison with statistics
- [**ast**](../src/ast/README.md) - Abstract syntax tree operations for token manipulation
- [**bundler**](../src/bundler/README.md) - Multi-format token bundling with transformation pipeline
- [**core**](../src/core/README.md) - Core token operations and type-safe merging
- [**io**](../src/io/README.md) - File system operations with caching and format detection
- [**manifest**](../src/manifest/README.md) - Manifest parsing and validation for token composition
- [**references**](../src/references/README.md) - Reference resolution and cycle detection
- [**schemas**](../src/schemas/README.md) - JSON Schema definitions for tokens and manifests
- [**validation**](../src/validation/README.md) - Comprehensive token validation against DTCG spec

### Utility Modules

- [**api**](../src/api/README.md) - High-level convenience APIs
- [**cli**](../src/cli/README.md) - Command-line interface implementation
- [**linter**](../src/linter/README.md) - Token and manifest linting for consistency and best practices
- [**utils**](../src/utils/README.md) - Shared utilities and helpers
- [**types**](../src/types/README.md) - TypeScript type definitions

## Architecture Overview

UPFT implements a functional architecture with clear module boundaries and explicit data flow:

```
Input Files → IO → AST → Validation → References → Bundler → Output Files
              ↑              ↓             ↓            ↓
          Manifest ←────── Schemas ──────────────→ Analysis
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
import { validateTokens } from '@unpunnyfuns/tokens/validation';
import { resolveReferences } from '@unpunnyfuns/tokens/references';
import { bundle } from '@unpunnyfuns/tokens/bundler';
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