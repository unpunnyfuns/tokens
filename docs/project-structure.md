# Project Structure

## Overview

This project is organized with a clear separation between public API and internal development tools.

### Technology Stack

- **TypeScript**: All source files are `.ts` with Node.js native type stripping
- **JSON Schema Validation**: [AJV](https://ajv.js.org/) with draft 2020-12 support for robust schema validation
- **Node.js 22.6.0+**: Required for `--experimental-strip-types` flag

## Directory Layout

```
@unpunnyfuns/tokens/
├── src/                      # Public API source code
│   ├── index.ts             # Main public API exports
│   ├── cli.ts               # Public CLI tool (upft)
│   ├── bundler/             # Token bundling functionality
│   │   ├── index.ts         # Bundle API
│   │   ├── api.ts           # Enhanced bundler API
│   │   ├── dtcg-exporter.ts # Format conversion
│   │   ├── resolver.ts      # Reference resolution
│   │   └── reference-validator.ts # Reference validation
│   └── validation/          # Token validation
│       ├── index.ts         # Validation API
│       ├── example-validator.ts  # Token file validation
│       ├── resolver-validator.ts # Manifest validation
│       ├── ref-resolver.ts       # Reference resolution
│       └── utils.ts              # Shared utilities
│
├── scripts/                 # Internal development tools
│   ├── dev-cli.ts          # Development CLI
│   ├── build-schemas.ts    # Schema build process
│   ├── build-schemas-accumulative.ts # Accumulative build
│   ├── update-schema-urls.ts # URL updates
│   └── internal/           # Internal-only modules
│       └── schema-validator.ts  # Schema validation
│
├── schemas/                 # The actual token schemas
│   ├── tokens/             # Token type schemas
│   ├── resolver.schema.json # Resolver manifest schema
│   └── base.schema.json    # Base token schema
│
├── examples/               # Example token files for testing
│   ├── tokens/            # Example token files
│   └── resolver.manifest.json # Example manifest
│
├── docs/                   # Documentation
│   ├── bundler.md         # Bundler documentation
│   ├── development.md     # Development guide
│   └── project-structure.md # This file
│
└── dist/                   # Built/distributed files
    └── schemas/           # Published schemas
```

## Public vs Internal

### Public API (`src/`)

Everything in `src/` is part of the public API:

- **CLI**: `upft` command for validation and bundling
- **Validation**: Functions to validate token files
- **Bundler**: Functions to bundle and transform tokens

```javascript
// What users import
import { validateFiles, bundle } from '@unpunnyfuns/tokens';
```

### Internal Tools (`scripts/`)

Development tools that are NOT part of the public API:

- **Schema Validation**: Validates that our schemas are valid JSON Schema
- **Build Tools**: Processes schemas for distribution
- **Development CLI**: Internal commands for maintainers

```bash
# Internal use only
npm run dev:validate-schemas
npm run dev:test
```

## Key Files

### Public Entry Points

- `src/index.ts` - Main library exports
- `src/cli.ts` - CLI tool (`upft`)
- `package.json#exports` - Node.js export paths

### Internal Entry Points

- `scripts/dev-cli.ts` - Development CLI
- `scripts/build-schemas.ts` - Build process

## Export Paths

The package.json defines these public exports:

```json
{
  "exports": {
    ".": "./src/index.ts",                    // Main API
    "./validators": "./src/validation/index.ts", // Validation API
    "./bundler": "./src/bundler/index.ts",    // Bundler API
    "./bundler/api": "./src/bundler/api.ts",    // Enhanced bundler API
    "./schemas/*": "./dist/schemas/*"         // Schema files
  }
}
```

## Usage Examples

### For End Users

```javascript
// Validate tokens
import { validateFiles } from '@unpunnyfuns/tokens/validators';
await validateFiles('./my-tokens');

// Bundle tokens
import { bundle } from '@unpunnyfuns/tokens/bundler';
const tokens = await bundle({ manifest: './manifest.json' });

// CLI usage
$ upft validate ./tokens
$ upft bundle -m manifest.json
```

### For Maintainers

```bash
# Validate schemas are correct
npm run dev:validate-schemas

# Test schemas against examples
npm run dev:test

# Build for distribution
npm run build

# Watch mode during development
npm run watch
```

## Design Principles

1. **Clear Separation**: Public API in `src/`, internal tools in `scripts/`
2. **Focused CLI**: `upft` only does what users need (validate & bundle)
3. **Hidden Complexity**: Schema validation is internal, not exposed
4. **Simple Imports**: Clean export paths for common use cases
5. **Developer Tools**: Separate CLI for maintenance tasks