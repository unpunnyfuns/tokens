# Release Process

## Overview

UPFT uses a modern monorepo release strategy that enables:
- **Independent package versioning** - Each package versions separately
- **Automated releases** - Push to main triggers automatic publishing
- **Smart builds** - Only affected packages are built and tested
- **Clear changelogs** - Each package maintains its own changelog

## The Three-Layer Architecture

```
┌─────────────────────────────────────────┐
│         GitHub Actions                  │ ← Infrastructure (no opinions)
├─────────────────────────────────────────┤
│           Turborepo                     │ ← Build orchestration & caching
├─────────────────────────────────────────┤
│          Changesets                     │ ← Version management & publishing
└─────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Purpose | What it handles |
|-------|---------|-----------------|
| **GitHub Actions** | CI/CD infrastructure | Runs commands, provides environment |
| **Turborepo** | Build orchestration | Dependency graph, caching, parallel execution |
| **Changesets** | Release management | Versioning, changelogs, npm publishing |

## Creating a Release

### Step 1: Make Your Changes

Work on your feature or fix in a feature branch:

```bash
git checkout -b feat/awesome-feature
# Make your changes
git add .
git commit -m "feat: add awesome feature to linter"
```

### Step 2: Create a Changeset

Before pushing, document what changed:

```bash
pnpm changeset
```

This interactive prompt will:
1. Ask which packages changed
2. Ask for version bump type (patch/minor/major)
3. Ask for a summary of changes

Example session:
```
🦋 Which packages would you like to include?
◉ @upft/linter
◯ @upft/tokens
◯ @upft/cli

🦋 Which packages should have a major bump?
◯ @upft/linter

🦋 Which packages should have a minor bump?
◉ @upft/linter

🦋 Please enter a summary for this change
› Added new rule for validating color contrast ratios
```

This creates a file in `.changeset/` with your change description.

### Step 3: Commit the Changeset

```bash
git add .changeset/
git commit -m "chore: add changeset"
git push origin feat/awesome-feature
```

### Step 4: Create PR

Open a PR to main. The PR workflow will:
- Run tests only on changed packages
- Validate the changeset
- Show what will be released

### Step 5: Merge to Main

Once approved and merged, the release workflow automatically:
1. Creates a "Version Packages" PR with:
   - Updated package.json versions
   - Updated CHANGELOG.md files
   - Removed changeset files
2. When that PR is merged, publishes to npm

## Version Bump Guidelines

### Patch Release (0.0.X)
- Bug fixes
- Documentation updates
- Internal refactoring (no API changes)
- Dependency updates (non-breaking)

### Minor Release (0.X.0)
- New features (backwards compatible)
- New configuration options
- Performance improvements
- Deprecating features (but not removing)

### Major Release (X.0.0)
- Breaking API changes
- Removing deprecated features
- Major architectural changes
- Incompatible configuration changes

## Working with Unreleased Changes

### Key Concept: Changes ≠ Releases

**Important:** You can have code changes in main that are not released to npm. This is a feature, not a bug! It allows you to:
- Merge work-in-progress code for testing
- Collaborate on features without publishing
- Accumulate changes before a coordinated release
- Keep experimental code in the repository

### How It Works

```
Code in main branch:        @upft/tokens v0.5.0 + new changes (unreleased)
                            @upft/linter v0.5.0 (unchanged)
                            
Published on npm:           @upft/tokens v0.5.0 (old version)
                           @upft/linter v0.5.0
                           
After creating changeset:   @upft/tokens v0.5.1 (released with changes)
                           @upft/linter v0.5.0 (still unchanged)
```

### Common Scenario: Mixed Ready and WIP Changes

You're working on multiple packages but only some changes are ready:

```bash
# You've modified:
# - @upft/tokens - ✅ Ready for release  
# - @upft/linter - 🚧 Still experimental

# Create changeset ONLY for ready package
pnpm changeset
# → Select: @upft/tokens only
# → Type: patch
# → Summary: "Fix token validation"

# Commit everything
git add .
git commit -m "feat: improve tokens and experimental linter work"
git push

# What happens:
# - Both changes are in main branch
# - Only @upft/tokens gets released to npm
# - @upft/linter changes exist in repo but not on npm
# - Tests run against both changes
# - Local development uses both changes
```

### Strategy 1: Selective Changesets (Recommended)

Only create changesets for packages ready to release:

```bash
# Edit multiple packages
vim packages/tokens/src/index.ts  # Ready ✅
vim packages/linter/src/rules.ts  # Not ready 🚧
vim apps/cli/src/commands.ts      # Not ready 🚧

# Create changeset for ready package only
pnpm changeset
# Select: @upft/tokens
# Skip: @upft/linter, @upft/cli

# Result: Only tokens releases, others wait
```

### Strategy 2: Accumulate Changes

Let changes build up, then release together:

```bash
# Week 1: Merge PR with tokens changes (no changeset)
# Week 2: Merge PR with linter changes (no changeset)  
# Week 3: Merge PR with CLI changes (no changeset)

# Week 4: Everything tested and ready
pnpm changeset
# Select all three packages
# Create coordinated release
```

### Strategy 3: Feature Flags in Code

Keep experimental code behind flags:

```typescript
// In @upft/linter - merged but unreleased
export const newRule = process.env.EXPERIMENTAL_RULES 
  ? experimentalImplementation
  : stableImplementation;
```

### What This Means for Development

1. **PR Reviews**: Reviewers see all changes, even unreleased ones
2. **Testing**: CI tests everything, including unreleased changes
3. **Local Dev**: `pnpm install` uses local versions with all changes
4. **Production**: npm users only get released versions
5. **Rollback**: Easy to revert unreleased changes without affecting users

### Benefits of This Approach

- **No pressure**: Merge code without immediately releasing
- **Better testing**: Changes can "soak" in main before release
- **Collaboration**: Multiple developers can build on unreleased changes
- **Flexibility**: Decide release timing independently of merge timing

## Release Scenarios

### Scenario 1: Bug Fix in One Package

```bash
# Fix bug in @upft/linter
pnpm changeset
# Select: @upft/linter
# Type: patch
# Summary: "Fix incorrect validation for hex colors"

# Result after merge:
# @upft/linter: 0.5.0 → 0.5.1
# Other packages: unchanged
```

### Scenario 2: Breaking Change in Core Package

```bash
# Breaking change in @upft/tokens
pnpm changeset
# Select: @upft/tokens
# Type: major
# Summary: "Change token format to support DTCG 2.0"

# Result after merge:
# @upft/tokens: 0.5.0 → 1.0.0
# @upft/cli: 0.5.0 → 0.5.1 (auto-bumped due to dependency)
# @upft/linter: 0.5.0 → 0.5.1 (auto-bumped due to dependency)
```

### Scenario 3: Multiple Independent Changes

```bash
# First changeset - new CLI feature
pnpm changeset
# Select: @upft/cli
# Type: minor

# Second changeset - linter fix
pnpm changeset
# Select: @upft/linter
# Type: patch

# Result after merge:
# @upft/cli: 0.5.0 → 0.6.0
# @upft/linter: 0.5.0 → 0.5.1
# @upft/tokens: unchanged
```

### Scenario 4: Coordinated Release

Sometimes you want to release multiple packages together:

```bash
pnpm changeset
# Select multiple packages:
# ◉ @upft/tokens
# ◉ @upft/cli
# ◉ @upft/linter
# Type: minor for all
# Summary: "Add support for new token types across all packages"
```

## How Turborepo Optimizes Releases

When changes are pushed, Turborepo:

1. **Detects what changed** using git diff
2. **Builds only affected packages** and their dependents
3. **Uses cache** for unchanged packages
4. **Runs tests in parallel** where possible

Example: If only `@upft/linter` changes:
```
Build graph:
@upft/schemas ✓ (cached)
@upft/tokens ✓ (cached)
@upft/linter ⚡ (building)
@upft/cli ⚡ (rebuilding - depends on linter)
```

## Manual Release Process

If automatic release fails or you need manual control:

```bash
# 1. Create changesets for your changes
pnpm changeset

# 2. Version packages locally
pnpm changeset version

# 3. Review changes
git diff

# 4. Commit version updates
git add .
git commit -m "chore: version packages"

# 5. Build all packages
pnpm turbo build

# 6. Publish to npm
pnpm changeset publish

# 7. Push tags
git push --follow-tags
```

## Pre-release Versions

For testing releases before official versions:

```bash
# 1. Enter pre-release mode
pnpm changeset pre enter beta

# 2. Create changesets as normal
pnpm changeset

# 3. Version will be like 0.6.0-beta.0
pnpm changeset version

# 4. Publish pre-release
pnpm changeset publish

# 5. Exit pre-release mode
pnpm changeset pre exit
```

## Release Checklist

Before creating a changeset:
- [ ] All tests pass locally (`pnpm test`)
- [ ] Code is formatted (`pnpm format`)
- [ ] TypeScript compiles (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)

Before merging to main:
- [ ] PR has been reviewed
- [ ] CI checks are green
- [ ] Changeset accurately describes changes
- [ ] Version bump type is appropriate

## Troubleshooting

### "No changesets found"
You forgot to create a changeset. Run `pnpm changeset` before pushing.

### "Package has breaking changes but only patch bump"
Review your changeset - breaking changes require major version bump.

### "Version Packages PR has conflicts"
1. Merge main into the PR branch
2. Resolve conflicts in package.json and CHANGELOG.md
3. Push resolved conflicts

### "Publish failed with 403"
Check NPM_TOKEN secret in GitHub:
1. Generate new token at npmjs.com
2. Update secret in GitHub repository settings
3. Re-run release workflow

## Configuration

### Changesets Config (`.changeset/config.json`)

```json
{
  "fixed": [],        // Packages that version together
  "linked": [],       // Packages that must release together
  "access": "public", // npm package visibility
  "updateInternalDependencies": "patch" // Auto-bump internal deps
}
```

### Turborepo Config (`turbo.json`)

Build tasks automatically handle dependencies:
```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"], // Build dependencies first
      "outputs": ["dist/**"],   // Cache these outputs
      "cache": true
    }
  }
}
```

### GitHub Actions (`.github/workflows/release.yml`)

The release workflow:
1. Runs on every push to main
2. Uses changesets/action for automation
3. Creates Version PR or publishes packages

## Best Practices

1. **One changeset per logical change** - Don't bundle unrelated changes
2. **Write clear summaries** - They become changelog entries
3. **Use conventional commits** - Helps reviewers understand changes
4. **Test pre-releases first** - For major changes, test with beta versions
5. **Keep packages focused** - Smaller packages = more flexible releases

## Common Patterns

### Pattern 1: Gradual Migration
Release backwards-compatible version first, then breaking changes:
1. Minor release with new API + deprecation warnings
2. Major release removing old API

### Pattern 2: Synchronized Features
When features span multiple packages:
1. Create single changeset selecting all affected packages
2. Use same version bump type for consistency

### Pattern 3: Hotfix Release
For urgent fixes:
1. Create hotfix branch from main
2. Fix issue with patch changeset
3. Merge directly to main (with approval)
4. Cherry-pick to development branches if needed

## Questions?

For more details:
- [Changesets Documentation](https://github.com/changesets/changesets)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [PNPM Workspaces](https://pnpm.io/workspaces)