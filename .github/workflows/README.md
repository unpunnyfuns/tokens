# GitHub Actions Workflows

This directory contains CI/CD workflows for the UPFT monorepo with independent package versioning support.

## Workflows

### 🚀 Core Workflows

#### `ci.yml` - Continuous Integration

- **Triggers**: Push to `main`, `feat/**`, `fix/**` branches and PRs to `main`
- **Purpose**: Full CI suite with coverage reporting
- **Matrix**: Tests on Node 20.x/22.x across Ubuntu/macOS/Windows
- **Tasks**: `build lint typecheck test:coverage`

#### `pr.yml` - Pull Request Checks

- **Triggers**: PR opened/synchronized
- **Purpose**: Smart change detection with minimal testing
- **Features**:
  - Only tests changed packages using Turbo filters
  - Full test suite if critical packages change (foundation, schemas, ast, cli)
  - Incremental checks for faster feedback

#### `release.yml` - Automated Releases

- **Triggers**: Push to `main` branch
- **Purpose**: Automated versioning and publishing via Changesets
- **Features**:
  - Independent package versioning
  - Automatic changelog generation
  - Creates version PRs or publishes based on changesets

### 📦 Package Management

#### `package-ci.yml` - Per-Package Testing

- **Triggers**: PRs affecting `libs/**` or `apps/**`
- **Purpose**: Parallel testing of changed packages
- **Features**:
  - Automatically detects changed packages
  - Runs isolated CI for each package
  - Supports both `libs/` and `apps/` structure

#### `publish.yml` - Manual Publishing

- **Triggers**: Manual workflow dispatch
- **Purpose**: Emergency/manual package publishing
- **Features**:
  - Dry-run mode for testing
  - Selective package publishing
  - Uses changesets for consistency

### 🌐 Deployment

#### `deploy-netlify.yml` - Web Deployment

- **Triggers**: Push to `main`, manual dispatch
- **Purpose**: Deploy documentation/demos to Netlify
- **Features**: Automatic build before deployment

## Release Strategy

### Independent Versioning

Each package in `libs/` and `apps/` can have independent versions using [Changesets](https://github.com/changesets/changesets):

```bash
# Add a changeset
pnpm changeset

# Version packages (creates version PR)
pnpm changeset version

# Publish (handled by CI)
pnpm changeset publish
```

### Package Categories

- **`libs/foundation`** - Core utilities (stable, semver strict)
- **`libs/schemas`** - JSON schemas (breaking changes bump major)
- **`libs/ast`** - AST processing (internal breaking changes allowed)
- **`libs/bundler`** - Bundle generation (output format stability important)
- **`libs/loader`** - File loading (performance/API stability focus)
- **`apps/cli`** - Command line tool (user-facing API stability)

### Change Detection

#### Critical Packages

Changes to these packages trigger full test suites:

- `libs/foundation` - Core utilities
- `libs/schemas` - Schema definitions
- `libs/ast` - AST structures
- `apps/cli` - CLI interface

#### Turbo Filters

- `--filter=[origin/main]` - Only changed packages since main
- `--filter=@upft/package...` - Package and its dependents
- Smart dependency resolution via Turborepo

## Environment Variables

### Required Secrets

```bash
GITHUB_TOKEN          # Automatic GitHub token
NPM_TOKEN             # NPM publishing
CODECOV_TOKEN         # Coverage reporting
NETLIFY_AUTH_TOKEN    # Netlify deployment
NETLIFY_SITE_ID       # Netlify site identifier
```

### Optional Variables

```bash
TURBO_TOKEN           # Turbo Remote Cache
TURBO_TEAM            # Turbo team identifier
```

## Development Workflow

1. **Feature Development**: Work on `feat/*` branches
2. **Add Changeset**: Run `pnpm changeset` before merging
3. **PR Review**: Automated testing on affected packages
4. **Merge**: Triggers version PR creation or publishing
5. **Release**: Version PR merge publishes to NPM

## Performance Features

- **Incremental Testing**: Only test what changed
- **Turbo Caching**: Speeds up repeat builds
- **Parallel Execution**: Matrix jobs for package isolation
- **Smart Filters**: Dependency-aware task execution

## Monitoring

- **Coverage**: Uploaded to Codecov with package-specific flags
- **Build Times**: Tracked via Turbo dashboard
- **Release Notes**: Auto-generated from changesets
