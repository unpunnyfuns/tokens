# Development Guide

## Requirements

- Node.js 22.6.0+ (required for `--experimental-strip-types` flag)
- TypeScript support via Node.js native type stripping
- npm package manager

## Technology Stack

- **JSON Schema Validation**: [AJV](https://ajv.js.org/) with JSON Schema draft 2020-12 support
- **TypeScript**: Native Node.js type stripping (no build step required)
- **Linting/Formatting**: Biome for fast code quality checks

## Overview

This project has two distinct CLI tools:

1. **`upft`** - Public CLI for end users to validate and bundle design tokens
2. **`scripts/dev-cli.ts`** - Internal tool for schema development and maintenance

## Public CLI (`upft`)

The public CLI is what gets installed when users add this package:

```bash
npm install @unpunnyfuns/tokens

# Validate token files
upft validate ./my-tokens

# Bundle tokens
upft bundle -m resolver.manifest.json
```

### Available Commands

- `validate <path>` - Validate token files against the DTCG schemas
- `bundle` - Bundle tokens from a resolver manifest

## Development CLI

For internal development of the schemas themselves:

```bash
# Validate that schema files are valid JSON Schema documents
npm run dev:validate-schemas

# Test schemas against example files
npm run dev:test

# Build schemas for distribution
npm run dev:build

# Run all tests
npm test
```

### Development Scripts

| Script | Description |
|--------|-------------|
| `dev:validate-schemas` | Ensure schema files are valid JSON Schema |
| `dev:test` | Test schemas against example files |
| `dev:build` | Build schemas for distribution |
| `test` | Run all validation and tests |
| `watch` | Watch mode for development |
| `watch:schemas` | Watch and validate schema changes |
| `watch:examples` | Watch and validate example changes |

## Why the Separation?

### Schema Validation vs Token Validation

These are fundamentally different operations:

1. **Schema Validation** (internal):
   - Validates that `schemas/**/*.json` are valid JSON Schema documents
   - Checks meta-schema compliance
   - Ensures schema references are correct
   - This is for **developing the schemas**

2. **Token Validation** (public):
   - Validates that user's token files comply with the schemas
   - Checks token structure and values
   - Ensures references between tokens are valid
   - This is for **using the schemas**

### Example

```bash
# Internal: Am I writing valid JSON Schema?
node --experimental-strip-types scripts/dev-cli.ts validate-schemas

# Public: Are my tokens valid according to the schema?
upft validate ./my-design-tokens.json
```

## Development Workflow

1. **Working on schemas**:
   ```bash
   # Start watch mode
   npm run watch:schemas
   
   # Edit schemas/tokens/color.schema.json
   # Watch mode automatically validates the schema
   ```

2. **Testing with examples**:
   ```bash
   # Run all tests
   npm test
   
   # Or watch mode
   npm run watch:examples
   ```

3. **Before committing**:
   ```bash
   # Ensure everything is valid
   npm test
   
   # Format code
   npm run check
   ```

## Directory Structure

```
/
├── src/
│   ├── cli.ts                 # Public CLI (upft)
│   ├── bundler/               # Token bundling logic
│   └── validation/
│       ├── index.ts           # Token validation
│       └── example-validator.ts # Example validation
├── scripts/
│   ├── dev-cli.ts            # Development CLI
│   ├── build-schemas.ts      # Build process
│   └── internal/
│       └── schema-validator.ts # Schema validation (internal)
├── schemas/                  # The actual schemas
└── examples/                 # Example token files for testing
```

## Testing Strategy

### Unit Tests
- Schema structure validation
- Token validation logic
- Bundler functionality

### Integration Tests
- All examples must validate
- Bundled output must be valid
- Reference resolution must work

### Manual Testing
```bash
# Test the public CLI
npx upft validate examples/

# Test bundling
npx upft bundle -m examples/resolver.manifest.json

# Test with different formats
npx upft bundle -m examples/resolver.manifest.json -f dtcg
```