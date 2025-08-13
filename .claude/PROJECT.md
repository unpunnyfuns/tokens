# UPFT Design Token Platform - Project Tracking

## Project Overview
Building a comprehensive design token management platform following DTCG specification with support for multidimensional design systems using manifest-based resolution.

## Key Design Decisions

### 0. Code Quality Rules
- **NO `any` types in implementation code** - only allowed in tests
- All types must be properly defined using `unknown` or specific types
- Non-null assertions should be avoided where possible

### 1. Manifest-Based Architecture
- Using "manifest" terminology instead of "resolver" for clarity
- Supports multidimensional permutations (themes, contrast modes, brands)
- Following Tokens Studio resolver spec with enhancements

### 2. Test-Driven Development
- All tests use real files from `examples/` directory
- No inline mocking - examples are authoritative
- Tests written before implementation
- Target: 90% coverage

### 3. Format Support
- Both DTCG `{alias}` and JSON Schema `$ref` formats
- Bidirectional conversion capabilities
- Schema-driven validation

### 4. Technology Stack
- Node.js 22.6.0+ with experimental TypeScript support
- Vitest for testing
- Biome for linting/formatting
- Functional programming style (minimal classes)

## Implementation Progress

### Phase 0: Setup ✅
- [x] Create PROJECT.md for tracking
- [ ] TypeScript configuration
- [ ] Vitest configuration
- [ ] Test infrastructure

### Phase 1: Core Foundation
- [ ] Core token operations (guards, path utils, operations)
- [ ] AST system (builder, traverser, query, resolver)

### Phase 2: File & Validation
- [ ] FileSystem layer (file management, caching)
- [ ] Validation pipeline (schema, linting, multi-stage)

### Phase 3: Resolution & Bundling
- [ ] Manifest resolver (permutations, layering)
- [ ] Bundler (packaging, format conversion)

### Phase 4: External Interfaces
- [ ] CLI commands (validate, bundle, resolve, ast)
- [ ] Public API (workflows, programmatic access)

## Performance Benchmarks
- Target: <100ms for 1000 tokens
- Target: <200ms for 50 files
- Target: <50ms for AST generation

## Testing Strategy
1. Use example files as fixtures
2. Test both valid and error cases
3. Performance testing for critical paths
4. Integration tests for workflows
5. E2E tests for CLI commands

## Known Issues & TODOs
- Resolver schema needs alignment with Tokens Studio spec
- Need to support both enumerated and include modifier types
- Performance optimization for large token sets pending

## Architecture Notes

### AST-Centric Design
All token operations work through unified AST representation:
- Consistent processing model
- Composable transformations
- Efficient caching
- Clear separation of concerns

### Layered Architecture
```
CLI/API → Orchestration → Services → Models → Infrastructure
```

### Key Modules
- `src/core/` - Shared utilities and types
- `src/ast/` - AST system for token representation
- `src/filesystem/` - File loading and caching
- `src/validation/` - Multi-stage validation
- `src/resolver/` - Manifest-based resolution
- `src/bundler/` - Token packaging
- `src/cli/` - Command-line interface
- `src/api/` - Programmatic API

## Example Files Reference
- `examples/tokens/` - Token files for testing
- `examples/test-scenarios/` - Manifest examples
- `examples/error-cases/` - Invalid cases for testing
- `schemas/` - JSON Schema definitions

## Commands Reference
```bash
# Development
yarn test:watch    # Run tests in watch mode
yarn lint         # Run Biome linter
yarn typecheck    # TypeScript type checking

# Testing
yarn test         # Run all tests
yarn test:coverage # Coverage report

# Validation
yarn dev:schemas  # Validate schemas
yarn dev:examples # Test examples
yarn dev:resolver # Test resolver
```

## Decision Log

### 2024-01-15
- Decided to use manifest terminology throughout codebase
- Adopting Tokens Studio resolver spec as base
- All tests will use real example files, no mocking
- Functional programming style preferred over OOP