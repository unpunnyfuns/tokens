# Linter

Configurable linting for design tokens and manifests with best practice enforcement and quality checks.

## Structure

| File | Purpose |
|------|---------|
| config.ts | Configuration loading with JSON5 support and preset management |
| token-linter.ts | Main TokenLinter class for token file linting |
| rules.ts | Token lint rule implementations (13 built-in rules) |
| types.ts | TypeScript type definitions for linting |
| manifest/lint-manifest.ts | Functional manifest linting implementation |
| manifest/manifest-rules.ts | Manifest-specific rule implementations (8 rules) |
| manifest/manifest-types.ts | Types for manifest linting |
| index.ts | Module exports |

## Token Linting

### Available Rules

#### Accessibility
- **prefer-rem-over-px** - Prefer rem units for better accessibility
- **min-font-size** - Ensure minimum font size for readability

#### Naming
- **naming-convention** - Enforce consistent naming style (kebab-case, camelCase, any)
- **naming-hierarchy** - Enforce hierarchical naming patterns

#### Documentation
- **description-required** - All tokens must have descriptions
- **group-description-required** - All groups must have descriptions
- **description-min-length** - Ensure meaningful descriptions

#### Organization
- **max-nesting-depth** - Limit token nesting depth
- **consistent-property-order** - Enforce property ordering
- **no-mixed-token-types** - Prevent mixing unrelated types in groups

#### Quality
- **unused-tokens** - Find tokens not referenced by others
- **duplicate-values** - Identify tokens with identical values
- **prefer-references** - Suggest using references for repeated values

### Configuration

Create `.upftrc.json` in your project root:

```typescript
{
  "lint": {
    "extends": "recommended",  // "minimal", "recommended", or "strict"
    "rules": {
      "prefer-rem-over-px": "error",
      "naming-convention": ["warn", { "style": "kebab-case" }],
      "description-required": "off"
    },
    "ignore": [
      "**/generated/**"
    ]
  }
}
```

### Usage

```typescript
import { TokenLinter } from '@upft/linter';

const linter = new TokenLinter({
  configPath: '.upftrc.json'
});

const result = linter.lint(tokenDocument);

console.log(`Errors: ${result.summary.errors}`);
console.log(`Warnings: ${result.summary.warnings}`);

for (const violation of result.violations) {
  console.log(`${violation.severity}: ${violation.message} at ${violation.path}`);
}
```

## Manifest Linting

### Available Rules

#### Structure
- **no-empty-sets** - Sets must contain at least one file
- **consistent-modifier-naming** - Enforce modifier naming style
- **consistent-output-paths** - Check output path patterns

#### Best Practices
- **no-duplicate-files** - Warn about duplicate file references
- **no-unused-modifiers** - Find modifiers not used in generate
- **prefer-default-values** - Suggest defaults for common modifiers

#### Documentation
- **modifier-description-required** - Modifiers should have descriptions

#### Performance
- **reasonable-permutation-count** - Warn about excessive permutations

### Configuration

Configure manifest linting in `.upftrc.json`:

```typescript
{
  "lintManifest": {
    "extends": "recommended",
    "rules": {
      "consistent-modifier-naming": ["error", { "style": "kebab-case" }],
      "reasonable-permutation-count": ["warn", { "max": 100 }]
    }
  }
}
```

### Usage

```typescript
import { lintManifest } from '@upft/linter';

const manifest = {
  sets: [{ values: ["base.json"] }],
  modifiers: {
    theme: { oneOf: ["light", "dark"] }
  }
};

const result = lintManifest(manifest, {
  configPath: '.upftrc.json'
});

console.log(`Errors: ${result.summary.errors}`);
console.log(`Warnings: ${result.summary.warnings}`);
```

## CLI Usage

```bash
# Lint token file (auto-detected)
upft lint tokens.json

# Explicitly lint as manifest
upft lint manifest.json --manifest

# Use custom configuration
upft lint tokens.json --config .upftrc.json

# Output formats
upft lint tokens.json --format json
upft lint tokens.json --format compact

# Filter output
upft lint tokens.json --quiet  # Only show errors
```

## Presets

### Minimal
Basic quality checks:
- naming-convention
- duplicate-values

### Recommended (Default)
Balanced best practices:
- All minimal rules plus:
- min-font-size
- group-description-required
- max-nesting-depth
- no-mixed-token-types
- prefer-references

### Strict
Comprehensive enforcement:
- All recommended rules plus:
- prefer-rem-over-px
- naming-hierarchy
- description-required
- description-min-length
- consistent-property-order
- unused-tokens

## Severity Levels

- **error** - Must be fixed, exits with code 1
- **warn** - Should be addressed but won't fail
- **info** - Suggestions for improvement
- **off** - Rule disabled

## Performance

- Token linting: O(n) where n is token count
- Manifest linting: O(m*f) where m is modifiers, f is files
- Typical performance: <50ms for most files

## Integration

The linter integrates with:
- **CLI** - `upft lint` command
- **API** - Programmatic linting
- **CI/CD** - Exit codes for automation
- **Configuration** - `.upftrc.json` files

## Design Principles

1. **Separation of Concerns** - Validation (requirements) vs Linting (opinions)
2. **Configurable** - Every rule can be configured or disabled
3. **Functional** - Manifest linting uses functional approach
4. **Extensible** - Easy to add new rules
5. **Performant** - Optimized for large token systems

## Testing

```bash
pnpm --filter @upft/linter test
```