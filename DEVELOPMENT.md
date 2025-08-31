# Development Guide

This guide covers development workflows, architecture, and contribution guidelines for the UPFT monorepo.

## Quick Start

```bash
# Clone and setup
git clone https://github.com/unpunnyfuns/tokens.git
cd tokens
pnpm install

# Run tests
pnpm test

# Start development
pnpm dev
```

## Architecture

### Package Structure

```
apps/
└── cli/          # Command-line interface

libs/
├── foundation/   # Core types and token operations
├── manifest/     # Manifest processing and resolution
├── bundler/      # Token bundling and output
├── validator/    # Schema validation engine
├── analysis/     # Token analysis and comparison
├── ast/          # Abstract syntax tree operations
├── linter/       # Token linting and style checking
├── schemas/      # JSON schemas for DTCG tokens
├── examples/     # Example tokens and fixtures
└── shared/       # Common utilities and types
```

### Dependency Graph

```
cli → foundation ← validator ← schemas
    → manifest ← bundler
    → analysis ← ast
    → linter
```

## Development Workflows

### Daily Development

```bash
# Format and lint everything
pnpm format && pnpm lint

# Run quality checks
pnpm quality

# Watch tests during development
pnpm test:watch

# Check types
pnpm typecheck
```

### Working with Packages

```bash
# Build all packages
pnpm build

# Test specific package
pnpm turbo test --filter=@upft/foundation

# Develop CLI
pnpm cli

# Run schema validation
pnpm validate:examples
```

### Schema Development

```bash
# Build schemas for NPM
pnpm build:schemas:npm

# Build schemas for web deployment
pnpm build:schemas:web

# Build everything including schemas
pnpm build:all
```

## Testing Strategy

### Test Types

| Type | Purpose | Location | Command |
|------|---------|----------|---------|
| **Unit** | Individual functions | `src/**/*.test.ts` | `pnpm test:unit` |
| **Integration** | Package interactions | `src/**/*.test.ts` | `pnpm test` |
| **E2E** | Real CLI operations | `src/**/*.e2e.test.ts` | `pnpm test:e2e` |

### Coverage Requirements

- **Minimum**: 80% line coverage
- **Target**: 90% line coverage
- **Critical paths**: 100% coverage (validation, CLI commands)

```bash
# Run with coverage
pnpm test:coverage

# View coverage report
open coverage/index.html
```

## Code Style

### TypeScript Standards

- **Strict mode**: All packages use strict TypeScript
- **No any**: Avoid `any` type, use proper typing
- **Exports**: Use explicit exports, avoid default exports
- **Imports**: Use relative imports within packages

### Formatting

```bash
# Auto-format with Biome
pnpm format

# Check formatting
pnpm lint
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Files** | kebab-case | `token-validator.ts` |
| **Functions** | camelCase | `validateTokens()` |
| **Types** | PascalCase | `TokenDocument` |
| **Constants** | UPPER_SNAKE | `DTCG_TOKEN_TYPES` |

## Package Development

### Adding New Packages

1. **Create package directory**:
   ```bash
   mkdir packages/new-package
   cd packages/new-package
   ```

2. **Initialize package.json**:
   ```json
   {
     "name": "@upft/new-package",
     "version": "0.5.0",
     "type": "module"
   }
   ```

3. **Add to workspace**: Already configured in `pnpm-workspace.yaml`

### Package Requirements

Each package must have:

- ✅ `package.json` with proper metadata
- ✅ `README.md` with usage examples
- ✅ `tsconfig.json` extending base config
- ✅ `src/index.ts` with exports
- ✅ Tests with >80% coverage

### Inter-Package Dependencies

```json
// Use workspace protocol
{
  "dependencies": {
    "@upft/shared": "workspace:*"
  }
}
```

## Release Process

### Version Management

```bash
# Check what's changed
pnpm changeset status

# Create changeset
pnpm changeset

# Version packages
pnpm changeset version

# Publish (not yet implemented)
pnpm changeset publish
```

### Pre-Release Checklist

```bash
# 1. Quality checks
pnpm quality

# 2. Build everything
pnpm build:all

# 3. E2E validation
pnpm test:e2e

# 4. Schema validation
pnpm validate:examples
```

## Debugging

### Debug CLI

```bash
# Enable debug output
DEBUG=upft:* pnpm cli validate tokens.json

# Debug specific module
DEBUG=upft:validation pnpm cli validate tokens.json
```

### Debug Tests

```bash
# Run specific test
pnpm turbo test --filter=@upft/foundation -- --grep "validator"

# Debug test
pnpm turbo test --filter=@upft/foundation -- --inspect-brk
```

### Performance Profiling

```bash
# Profile bundler
node --prof packages/cli/dist/cli.js bundle manifest.json

# Analyze profile
node --prof-process isolate-*.log > profile.txt
```

## Workspace Management

### Dependencies

```bash
# Check outdated packages
pnpm deps:check

# Update dependencies
pnpm deps:update

# Add dependency to specific package
pnpm --filter @upft/foundation add lodash
```

### Cleanup

```bash
# Clean all build artifacts
pnpm clean

# Reset entire workspace
pnpm workspace:reset

# View dependency graph
pnpm workspace:graph
```

## IDE Setup

### VS Code

Recommended extensions:
- **Biome**: Formatting and linting
- **TypeScript**: Language support
- **Vitest**: Test runner integration

### Settings

```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome"
}
```

## Troubleshooting

### Common Issues

1. **Build failures**: Run `pnpm clean && pnpm build`
2. **Type errors**: Check `tsconfig.json` extends
3. **Import errors**: Verify package exports
4. **Test failures**: Ensure examples are up to date

### Debugging Steps

1. **Check dependencies**: `pnpm install`
2. **Clear cache**: `pnpm store prune`
3. **Rebuild**: `pnpm clean && pnpm build`
4. **Check types**: `pnpm typecheck`

## Contributing

### Pull Request Process

1. **Create feature branch**: `git checkout -b feature/awesome-feature`
2. **Make changes**: Follow code style and add tests
3. **Run quality checks**: `pnpm quality`
4. **Create changeset**: `pnpm changeset`
5. **Submit PR**: Include description and test evidence

### Code Review

- **Functionality**: Does it work as intended?
- **Tests**: Are there adequate tests?
- **Documentation**: Is it properly documented?
- **Performance**: Any performance implications?

## Resources

- **Turbo**: [turbo.build](https://turbo.build)
- **PNPM Workspaces**: [pnpm.io/workspaces](https://pnpm.io/workspaces)
- **DTCG Spec**: [design-tokens.github.io](https://design-tokens.github.io)
- **Biome**: [biomejs.dev](https://biomejs.dev)