# UPFT - UnPunny Fun Tokens

A comprehensive design token platform implementing DTCG specifications with advanced multi-dimensional composition and type-safe operations. This platform provides both a powerful CLI and programmatic API for managing design tokens at scale, supporting complex theme variations, strict validation, and intelligent bundling strategies while maintaining complete type safety throughout the token lifecycle.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Commands](#cli-commands)
- [Programmatic API](#programmatic-api)
- [Architecture](#architecture)
- [Module Documentation](#module-documentation)
- [Key Concepts](#key-concepts)
- [Design Philosophy](#design-philosophy)
- [Development](#development)
- [License](#license)
- [Contributing](#contributing)

## Overview

UPFT represents a modern approach to design token management, built from the ground up to support the Design Token Community Group (DTCG) specifications while providing practical solutions for real-world token system challenges. The platform addresses the complexity of managing tokens across multiple themes, densities, and feature flags through its innovative manifest system, which enables declarative token composition with mathematical precision.

The architecture prioritizes type safety and validation at every level, from individual token operations to complex multi-file bundles. Unlike traditional token tools that treat tokens as simple key-value pairs, UPFT understands the semantic meaning of tokens and enforces type consistency during merge operations, reference resolution, and transformations. This approach catches errors early in the development process rather than at runtime in production applications.

The platform's functional programming approach ensures predictable, testable operations throughout the system. Every operation is pure and immutable, making it easy to reason about token transformations and debug complex composition scenarios. The modular architecture allows teams to use only the parts they need, from simple validation to complex AST manipulation, without pulling in unnecessary dependencies.

## Features

- **DTCG Compliance**: Full implementation of Design Token Community Group draft specifications with strict type validation
- **Multi-Dimensional Composition**: Sophisticated manifest system for composing tokens across themes, densities, and custom modifiers
- **Type-Safe Operations**: All token operations validate type compatibility with detailed error reporting
- **Comprehensive Validation**: Dual-mode schema validation supporting both strict DTCG compliance and flexible experimentation
- **AST Manipulation**: Build and query abstract syntax trees for advanced token analysis and transformation
- **Reference Resolution**: Robust handling of both DTCG `{alias}` and JSON Schema `$ref` formats with cycle detection
- **Intelligent Caching**: Performance-optimized file operations with smart caching and incremental updates
- **Format Support**: Native support for JSON, JSON5, and YAML with automatic format detection
- **Watch Mode**: Development-friendly watch mode with incremental rebuilds
- **Extensible Architecture**: Modular design allowing custom transforms and validation rules

## Installation

```bash
# Install globally for CLI usage
npm install -g @unpunnyfuns/tokens

# Or add to your project
npm install @unpunnyfuns/tokens
```

## Quick Start

### Simple Token Validation

```bash
# Validate a single token file
upft validate tokens.json -f

# Validate all tokens in a directory
upft validate ./tokens -d

# Validate with strict DTCG compliance
upft validate tokens.json --strict
```

### Multi-Dimensional Tokens with Manifests

Create a `manifest.json` to define token composition:

```json
{
  "$schema": "https://tokens.unpunny.fun/schemas/latest/manifest-upft.json",
  "sets": [
    { "values": ["tokens/core.json"] }
  ],
  "modifiers": {
    "theme": {
      "oneOf": ["light", "dark"],
      "values": {
        "light": ["tokens/theme-light.json"],
        "dark": ["tokens/theme-dark.json"]
      }
    },
    "density": {
      "oneOf": ["comfortable", "compact"],
      "values": {
        "comfortable": ["tokens/density-comfortable.json"],
        "compact": ["tokens/density-compact.json"]
      }
    }
  },
  "generate": [
    { "theme": "light", "density": "comfortable", "output": "dist/light-comfortable.json" },
    { "theme": "light", "density": "compact", "output": "dist/light-compact.json" },
    { "theme": "dark", "density": "comfortable", "output": "dist/dark-comfortable.json" },
    { "theme": "dark", "density": "compact", "output": "dist/dark-compact.json" }
  ]
}
```

Then bundle your tokens:

```bash
# Validate manifest and all permutations
upft validate -m manifest.json

# Generate all specified bundles
upft bundle manifest.json

# Watch for changes and rebuild
upft bundle manifest.json --watch
```

## CLI Commands

### `validate` - Validate tokens or manifests
```bash
upft validate <path> [-f|-d|-m] [--strict] [--verbose]

Options:
  -f, --file       Validate a single token file
  -d, --directory  Validate all token files in directory
  -m, --manifest   Validate manifest and all permutations
  --strict         Use strict DTCG validation
  --verbose        Show detailed validation information
```

### `bundle` - Generate token bundles from manifest
```bash
upft bundle <manifest> [--watch] [--verbose] [--force]

Options:
  --watch          Watch for file changes and rebuild
  --verbose        Show detailed bundling information
  --force          Overwrite existing output files
```

### `preview` - Preview resolved tokens
```bash
upft preview <manifest> [modifiers...] [--json] [--paths]

Options:
  --theme <value>     Set theme modifier
  --density <value>   Set density modifier
  --json              Output as JSON
  --paths             Show token paths only
```

### `diff` - Compare token permutations
```bash
upft diff <manifest> -m --left-modifiers [modifiers] --right-modifiers [modifiers]

Options:
  -m, --manifest                    Use manifest file
  --left-modifiers theme=light      Left side modifiers
  --right-modifiers theme=dark      Right side modifiers
  --json                            Output as JSON
```

### `list` - List tokens or permutations
```bash
upft list <file> [--type <type>] [--json] [--tree]

Options:
  --type <type>    Filter by token type
  --json           Output as JSON
  --tree           Display as tree structure
```

### `info` - Display token statistics
```bash
upft info <file> [--detailed]

Options:
  --detailed    Show detailed breakdown by type
```

## Programmatic API

### Basic Usage

```typescript
import { validateTokenDocument, mergeTokens } from '@unpunnyfuns/tokens';

// Validate tokens
const result = await validateTokenDocument(myTokens);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
  process.exit(1);
}

// Merge tokens with type checking
try {
  const merged = mergeTokens(baseTokens, themeTokens);
  console.log('Merged successfully:', merged);
} catch (error) {
  console.error('Merge conflict:', error.message);
}
```

### Advanced Usage with Manifest

```typescript
import { 
  loadManifest, 
  resolveManifest, 
  generateAll 
} from '@unpunnyfuns/tokens';

// Load and validate manifest
const manifest = await loadManifest('manifest.json');

// Resolve specific permutation
const resolved = await resolveManifest(manifest, { 
  theme: 'dark',
  density: 'compact' 
});

// Generate all permutations
const results = await generateAll(manifest);
for (const result of results) {
  console.log(`Generated ${result.output} with ${result.tokenCount} tokens`);
}
```

### AST Operations

```typescript
import { 
  createASTFromDocument, 
  findTokensByType,
  findTokenByPath,
  createReferenceGraph 
} from '@unpunnyfuns/tokens';

// Build AST
const ast = createASTFromDocument(tokens);

// Query tokens by type
const colorTokens = findTokensByType(ast, 'color');
console.log(`Found ${colorTokens.length} color tokens`);

// Find specific token
const primaryColor = findTokenByPath(ast, 'color.primary');
if (primaryColor) {
  console.log('Primary color:', primaryColor.$value);
}

// Analyze references
const graph = createReferenceGraph(ast);
console.log('Reference graph:', graph);
```

### Reference Resolution

```typescript
import { 
  resolveReferences,
  detectCycles,
  buildDependencyGraph 
} from '@unpunnyfuns/tokens';

// Resolve all references in document
const resolved = resolveReferences(tokenDocument);

// Check for circular references
const cycles = detectCycles(tokenDocument);
if (cycles.length > 0) {
  console.error('Circular references detected:', cycles);
}

// Build dependency graph
const graph = buildDependencyGraph(tokenDocument);
console.log('Dependencies:', graph);
```

## Architecture

The platform follows a modular, layered architecture where each module has clear responsibilities and well-defined interfaces. This design enables both standalone usage of individual modules and sophisticated compositions for complex workflows.

### Core Modules

The architecture is organized into three layers:

**Foundation Layer**
- **[core](./src/core)** - Zero-dependency primitives for token operations, providing immutable merging, path manipulation, and type guards
- **[types](./src/types)** - TypeScript definitions establishing contracts across the system
- **[references](./src/references)** - Standalone reference resolution with cycle detection

**Processing Layer**
- **[validation](./src/validation)** - Schema-based validation using JSON Schema and AJV
- **[ast](./src/ast)** - Abstract syntax tree construction and manipulation
- **[analysis](./src/analysis)** - Statistical analysis and document comparison
- **[io](./src/io)** - File system operations with caching and format detection

**Application Layer**
- **[manifest](./src/manifest)** - Multi-dimensional token composition orchestration
- **[bundler](./src/bundler)** - Transform pipeline and bundle generation
- **[api](./src/api)** - High-level programmatic interfaces
- **[cli](./src/cli)** - Command-line interface implementation

### Module Boundaries

The system enforces strict module boundaries to prevent circular dependencies and maintain clear separation of concerns. Lower-level modules cannot import from higher-level modules, ensuring a clean dependency graph that flows upward through the layers.

```
cli → api → bundler → manifest → validation → ast → references → core
                                     ↓         ↓        ↓         ↓
                                    io    analysis   types    types
```

## Module Documentation

Detailed documentation for each module is available in their respective directories:

### Foundation Modules
- [Core](./src/core/README.md) - Essential token operations and type-safe merging
- [Types](./src/types/README.md) - TypeScript type definitions and interfaces
- [References](./src/references/README.md) - Reference resolution and cycle detection

### Processing Modules
- [Validation](./src/validation/README.md) - Schema-based token validation
- [AST](./src/ast/README.md) - Abstract syntax tree operations
- [Analysis](./src/analysis/README.md) - Token analysis and comparison
- [IO](./src/io/README.md) - File system operations and caching

### Application Modules
- [Manifest](./src/manifest/README.md) - Multi-dimensional token composition
- [Bundler](./src/bundler/README.md) - Bundle generation and transforms
- [API](./src/api/README.md) - High-level programmatic interfaces
- [CLI](./src/cli/README.md) - Command-line interface

### Resource Directories
- [Schemas](./src/schemas/README.md) - JSON Schema definitions
- [Examples](./src/examples/README.md) - Sample files and test fixtures
- [Utils](./src/utils/README.md) - Utility functions (pending refactor)
- [Linter](./src/linter/README.md) - Token linting rules (work in progress)

## Key Concepts

### Type-Safe Token Merging

The platform enforces type compatibility during all merge operations, preventing silent errors that could propagate to production:

```typescript
// This will throw a descriptive error
mergeTokens(
  { color: { primary: { $value: "#000", $type: "color" } } },
  { color: { primary: { $value: "16px", $type: "dimension" } } }
);
// Error: Type conflict at 'color.primary': cannot merge 'color' with 'dimension'
```

### Multi-Dimensional Composition

Manifests support sophisticated modifier combinations:

- **`oneOf`** - Mutually exclusive options (e.g., light OR dark theme)
- **`anyOf`** - Combinatorial options (e.g., any combination of feature flags)
- **Constraints** - Conditional relationships between modifiers

```json
{
  "modifiers": {
    "theme": { "oneOf": ["light", "dark"] },
    "contrast": { "oneOf": ["normal", "high"] },
    "features": { "anyOf": ["animations", "gradients"] }
  },
  "constraints": [
    {
      "if": { "theme": "dark" },
      "then": { "contrast": "high" }
    }
  ]
}
```

### Reference Resolution

The platform supports multiple reference formats with intelligent resolution:

```typescript
// DTCG format
{ $value: "{color.primary}" }

// JSON Schema format
{ $value: { "$ref": "#/color/primary" } }

// Nested references are resolved recursively
{ $value: "{semantic.background}" }  // → "{color.neutral.100}" → "#f5f5f5"
```

### Validation Modes

Two validation modes support different use cases:

**Strict Mode** - Full DTCG compliance for production:
- Enforces proper color space definitions
- Requires complete typography specifications
- Validates all type-specific constraints

**Flexible Mode** - For experimentation and migration:
- Accepts any token structure with `$value`
- Allows custom token types
- Supports gradual migration paths

## Design Philosophy

### DTCG Alignment

The platform strictly adheres to DTCG specifications while pragmatically extending them where necessary. Every design decision prioritizes compatibility with the emerging standard, ensuring that tokens created with UPFT will remain valid as the specification evolves. Where the DTCG specification is ambiguous or incomplete, the platform makes conservative choices that can be relaxed later without breaking changes.

### Type Safety First

Type safety is not an afterthought but a fundamental design principle. The platform uses TypeScript's type system to its fullest, providing compile-time guarantees about token operations. This approach extends beyond simple type checking to include type narrowing in guards, branded types for paths, and discriminated unions for token variants.

### Functional Core

The system embraces functional programming principles throughout. All core operations are pure functions without side effects, making them predictable, testable, and composable. State mutations are confined to the edges of the system, with immutable data structures used internally. This approach enables features like time-travel debugging and safe concurrent operations.

### Progressive Disclosure

The platform provides multiple levels of abstraction, allowing users to start simple and gradually adopt more sophisticated features. Basic token validation requires no configuration, while advanced multi-dimensional composition is available when needed. The API surface is carefully designed to guide users toward correct usage patterns.

### Performance Through Design

Performance is achieved through algorithmic efficiency rather than micro-optimizations. The platform uses appropriate data structures for each use case: path indexes for O(1) lookups, lazy evaluation for large documents, and incremental computation for watch mode. Caching is applied strategically at system boundaries rather than scattered throughout the codebase.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- analysis

# Run quality checks
npm run quality:parallel

# Check module boundaries
npm run depcheck

# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run typecheck

# Build distribution
npm run build
```

### Testing Strategy

The platform employs a comprehensive testing strategy:
- Unit tests for pure functions and algorithms
- Integration tests for module interactions
- End-to-end tests for CLI commands
- Property-based tests for complex operations
- Snapshot tests for schema validation

### Development Workflow

1. Make changes in feature branch
2. Ensure all tests pass: `npm test`
3. Run quality checks: `npm run quality:parallel`
4. Verify module boundaries: `npm run depcheck`
5. Format code: `npm run format`
6. Create pull request with clear description

## License

MIT

## Contributing

Contributions are welcome! Please ensure:
- All tests pass (`npm test`)
- Code is formatted (`npm run format`)
- No lint errors (`npm run lint`)
- Module boundaries are respected (`npm run depcheck`)
- Documentation is updated for new features
- Commit messages follow conventional commits

For significant changes, please open an issue first to discuss the proposed changes and ensure they align with the project's direction.