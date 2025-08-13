# Architecture Overview

The UPFT design token platform is built on an AST-centric architecture that provides consistent, composable operations for token validation, resolution, and bundling. This document describes the system's architecture, key components, and design decisions.

## Core Design Principles

### AST-Centric Processing

At the heart of UPFT is an Abstract Syntax Tree representation that serves as the single source of truth for all token operations. When a token document is loaded, it's immediately converted into an AST structure that preserves all metadata while enabling efficient traversal and manipulation.

```
    Token Document                    AST Representation
    
    {                                Root
      "color": {                      ├── color (Group)
        "primary": {                  │   └── primary (Token)
          "$value": {...},            │       ├── $value
          "$type": "color"            │       └── $type
        }                             │
      },                              └── spacing (Group)
      "spacing": {                         ├── small (Token)
        "small": {...},                    └── large (Token)
        "large": {...}
      }
    }
```

This approach provides several key benefits:
- Consistent processing model across all operations
- Efficient path-based lookups and queries
- Natural representation of token hierarchies
- Built-in support for reference resolution

### Layered Architecture

The system is organized into distinct layers with clear responsibilities and unidirectional dependencies. Each layer builds upon the foundation below it, creating a robust and maintainable architecture.

```
┌─────────────────────────────────────┐
│         CLI Layer                   │  Command-line interface
├─────────────────────────────────────┤
│         API Layer                   │  High-level functions
├─────────────────────────────────────┤
│      Core Services                  │  Business logic
├─────────────────────────────────────┤
│      Foundation Layer               │  AST, FileSystem, Types
└─────────────────────────────────────┘
```

## Module Organization

### AST Module (`src/ast/`)

The AST module provides the foundation for all token operations. It handles the conversion of JSON token documents into a queryable tree structure and provides utilities for traversing and manipulating that structure.

| Component | Purpose |
|-----------|---------|
| `ast-builder.ts` | Constructs AST from token documents |
| `ast-traverser.ts` | Visitor pattern implementation for tree traversal |
| `ast-query.ts` | High-level query interface for finding nodes |
| `reference-resolver.ts` | Resolves token references and detects circular dependencies |
| `types.ts` | TypeScript type definitions for AST nodes |

The AST maintains bidirectional references between parent and child nodes, enabling efficient traversal in both directions. Reference resolution results are cached to avoid repeated computation.

### Validation Module (`src/validation/`)

Validation is driven by JSON Schema 2020-12 definitions, providing a declarative and extensible approach to token validation. The module manages schema loading, compilation, and validation execution.

| Component | Purpose |
|-----------|---------|
| `validator.ts` | Core validation engine for token documents |
| `manifest-validator.ts` | Specialized validator for resolver manifests |
| `schema-registry.ts` | Manages and resolves JSON schema references |

The validation system provides detailed error messages with JSON Path locations, making it easy to identify and fix issues in token documents.

### Resolver Module (`src/resolver/`)

The resolver implements UPFT's multi-dimensional token composition system. It takes a manifest describing token sets and modifiers, generates all valid permutations, and resolves each one by layering and merging the appropriate token files.

```
Manifest Definition          Permutation Generation         Token Resolution
                                                       
┌─────────────────┐         ┌─────────────────┐        ┌─────────────────┐
│ Sets:           │         │ theme × mode    │        │ base.json       │
│ - base          │  ────>  │ = 4 permutations│  ────> │ + light.json    │
│ - theme (2)     │         │                 │        │ + comfortable.j │
│ - mode (2)      │         │ • light-comfort │        │ = output.json   │
└─────────────────┘         │ • light-compact │        └─────────────────┘
                            │ • dark-comfort  │
                            │ • dark-compact  │
                            └─────────────────┘
```

### Bundler Module (`src/bundler/`)

The bundler transforms and packages tokens for distribution. It reads tokens from the resolver, applies any configured transformations, and writes the output in the desired format.

| Component | Purpose |
|-----------|---------|
| `bundler.ts` | Main bundling engine with transformation pipeline |
| `api.ts` | High-level bundling API |

The bundler supports both DTCG and custom output formats, with options for prettification and minification.

### FileSystem Module (`src/filesystem/`)

The filesystem module provides an abstraction layer over Node.js file operations, adding caching, watching, and batch processing capabilities.

| Component | Purpose |
|-----------|---------|
| `file-reader.ts` | Async file reading with caching support |
| `file-writer.ts` | Safe file writing with atomic operations |
| `cache.ts` | LRU cache implementation for file contents |
| `file-watcher.ts` | File watching for development (placeholder) |
| `manifest-reader.ts` | Specialized reader for manifest files |

The cache uses an LRU (Least Recently Used) eviction strategy with configurable size limits (default 50MB) and TTL (default 300 seconds).

### Core Module (`src/core/`)

The core module contains shared utilities and operations used throughout the system.

| Component | Purpose |
|-----------|---------|
| `dtcg-merge.ts` | DTCG-aware deep merge for token documents |
| `token-comparison.ts` | Utilities for comparing token documents |
| `token/guards.ts` | Type guards for runtime type checking |
| `token/operations.ts` | Common token manipulation functions |
| `token/path.ts` | Path utilities for token navigation |

## Data Flow

### Token Processing Pipeline

The typical flow for processing tokens moves through several stages, each adding validation and transformation:

```
Input Files → Reader → Parser → AST Builder → Validator → Resolver → Bundler → Output
                ↑                    ↓            ↓          ↓          ↓
              Cache              References   Schemas   Manifest   Transforms
```

Each stage in the pipeline has a specific responsibility:
1. **Reader** loads files from disk with caching
2. **Parser** converts JSON to JavaScript objects
3. **AST Builder** creates the tree representation
4. **Validator** ensures schema compliance
5. **Resolver** handles multi-dimensional composition
6. **Bundler** applies transforms and formats output

### Reference Resolution

Token references are a key feature of the DTCG specification. UPFT supports both JSON Schema `$ref` format and DTCG `{alias}` format, with automatic detection and proper resolution for each.

```
Token with Reference         Resolution Process           Resolved Token

{                            1. Detect format              {
  "button": {                2. Parse reference path         "button": {
    "$value": "{primary}",   3. Look up target        →       "$value": "#007acc",
    "$type": "color"         4. Replace with value            "$type": "color"
  }                          5. Check for cycles             }
}                                                          }
```

The resolver maintains a dependency graph to detect circular references and provides clear error messages when they occur.

## Token Format Compliance

UPFT is informed by the DTCG specification for token formats. All token types use DTCG-compatible representations, with validation enforced through JSON Schema definitions. The system supports all DTCG token types including colors, dimensions, typography, shadows, and more. Token format details and examples are documented in the [Token Specification](./token-specification.md).

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|------------|-------|
| AST Build | O(n) | Linear in token count |
| Query by Path | O(log n) | Path components used as keys |
| Full Traversal | O(n) | Each node visited once |
| Reference Resolution | O(m × d) | m = references, d = depth |
| Validation | O(n) | Each token validated once |
| Bundle Generation | O(n × p) | n = tokens, p = permutations |

## Security Considerations

The system implements several security measures to prevent common vulnerabilities:

- **Path Traversal Prevention** - File paths are sanitized and restricted to configured base paths
- **Schema Validation** - Input validation prevents injection attacks
- **Circular Reference Detection** - Prevents infinite loops during resolution
- **Resource Limits** - Configurable limits on cache size, file size, and reference depth
- **Safe File Operations** - Atomic writes prevent partial file corruption

## Error Handling

The system provides comprehensive error handling with detailed messages for debugging:

- **Validation Errors** include JSON Path locations and expected formats
- **Reference Errors** show the full reference chain for debugging
- **File Errors** include the attempted operation and file path
- **Schema Errors** provide both the error and the schema location

All errors are typed and include sufficient context for programmatic handling and user-friendly display.