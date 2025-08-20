# UPFT Linting

UPFT includes a linter for checking token files against style guidelines and best practices.

## Quick Start

```bash
# Lint a token file with default settings
upft lint tokens.json

# Use a specific configuration
upft lint tokens.json --config .upftrc.json

# Output in different formats
upft lint tokens.json --format json
upft lint tokens.json --format compact
```

## Configuration

Create a `.upftrc.json` file in your project root:

```json5
{
  "lint": {
    "extends": "recommended",  // or "minimal" or "strict"
    "rules": {
      "prefer-rem-over-px": "error",
      "naming-convention": ["warn", { "style": "kebab-case" }],
      "description-required": "off"
    },
    "ignore": [
      "**/generated/**",
      "**/vendor/**"
    ]
  }
}
```

## Rule Presets

### Minimal
Basic rules for essential quality:
- `naming-convention`: Consistent token naming
- `duplicate-values`: Find duplicate values

### Recommended (Default)
Balanced set of rules:
- All minimal rules plus:
- `min-font-size`: Accessibility font size minimum
- `group-description-required`: Groups need descriptions
- `max-nesting-depth`: Limit nesting complexity
- `no-mixed-token-types`: Consistent type grouping
- `prefer-references`: Suggest token references

### Strict
All best practices enforced:
- All recommended rules plus:
- `prefer-rem-over-px`: Accessibility-first units
- `naming-hierarchy`: Enforce naming structure
- `description-required`: All tokens documented
- `description-min-length`: Meaningful descriptions
- `consistent-property-order`: Consistent structure
- `unused-tokens`: Find unreferenced tokens

## Available Rules

### Accessibility

#### prefer-rem-over-px
Prefer rem units over px for better accessibility and scaling.

```json5
"prefer-rem-over-px": ["warn", {
  "ignore": ["border", "outline"]  // Paths to ignore
}]
```

#### min-font-size
Ensure font sizes meet minimum accessibility standards.

```json5
"min-font-size": ["error", {
  "minSize": "14px"  // Minimum allowed size
}]
```

### Naming

#### naming-convention
Enforce consistent naming style.

```json5
"naming-convention": ["warn", {
  "style": "kebab-case",  // "kebab-case", "camelCase", or "any"
  "allowLeadingUnderscore": true
}]
```

#### naming-hierarchy
Enforce hierarchical naming patterns.

```json5
"naming-hierarchy": ["warn", {
  "separator": ".",
  "minDepth": 2  // Minimum hierarchy levels
}]
```

### Documentation

#### description-required
All tokens must have descriptions.

```json5
"description-required": "warn"
```

#### group-description-required
All groups must have descriptions.

```json5
"group-description-required": "warn"
```

#### description-min-length
Descriptions must be meaningful.

```json5
"description-min-length": ["warn", {
  "minLength": 10  // Minimum character count
}]
```

### Organization

#### max-nesting-depth
Limit token nesting depth for maintainability.

```json5
"max-nesting-depth": ["warn", {
  "maxDepth": 4  // Maximum nesting levels
}]
```

#### consistent-property-order
Enforce consistent property ordering.

```json5
"consistent-property-order": ["warn", {
  "order": ["$type", "$value", "$description"]
}]
```

#### no-mixed-token-types
Prevent mixing unrelated token types in groups.

```json5
"no-mixed-token-types": "warn"
```

### Quality

#### unused-tokens
Find tokens that aren't referenced by others.

```json5
"unused-tokens": "warn"
```

#### duplicate-values
Identify tokens with identical values.

```json5
"duplicate-values": "warn"
```

#### prefer-references
Suggest using references for repeated values.

```json5
"prefer-references": ["warn", {
  "threshold": 3  // Repetitions before warning
}]
```

## CLI Options

```bash
# Specify configuration file
upft lint tokens.json --config custom-config.json

# Output formats
upft lint tokens.json --format stylish  # Default, human-readable
upft lint tokens.json --format json     # Machine-readable JSON
upft lint tokens.json --format compact  # One line per violation

# Filter output
upft lint tokens.json --quiet           # Only show errors

# Exit codes
upft lint tokens.json --max-warnings 5  # Exit 1 if >5 warnings
```

## Ignoring Files

Use glob patterns in your configuration:

```json5
{
  "lint": {
    "ignore": [
      "**/node_modules/**",
      "**/dist/**",
      "temp-*.json",
      "**/*.generated.json"
    ]
  }
}
```

## Programmatic Usage

```typescript
import { TokenLinter } from "@unpunnyfuns/tokens/linter";

const linter = new TokenLinter({
  configPath: ".upftrc.json"
});

const result = linter.lint(tokenDocument);

console.log(`Found ${result.summary.errors} errors`);
console.log(`Found ${result.summary.warnings} warnings`);

for (const violation of result.violations) {
  console.log(`${violation.path}: ${violation.message}`);
}
```

## Writing Custom Rules

```typescript
import type { LintRule } from "@unpunnyfuns/tokens/linter";

const customRule: LintRule = {
  name: "no-hex-colors",
  description: "Disallow hex color values",
  category: "quality",
  check: (token, path, options) => {
    if (token.$type === "color" && 
        typeof token.$value === "string" &&
        token.$value.startsWith("#")) {
      return {
        path,
        rule: "no-hex-colors",
        severity: "warn",
        message: "Use rgb() or hsl() instead of hex colors"
      };
    }
    return null;
  }
};

// Use with linter
const linter = new TokenLinter({
  customRules: [customRule]
});
```

## Best Practices

1. **Start with recommended**: Begin with the recommended preset and adjust as needed
2. **Progressive enhancement**: Start with warnings, upgrade to errors as your team adapts
3. **Document exceptions**: Use ignore patterns sparingly and document why
4. **CI integration**: Run linting in CI to catch issues early
5. **Team agreement**: Discuss and agree on rules as a team

## Manifest Linting

UPFT also provides linting for manifest files with rules specific to manifest structure and best practices.

### Running Manifest Linting

```bash
# Lint a manifest file (auto-detected)
upft lint manifest.json

# Explicitly lint as manifest
upft lint file.json --manifest

# Force lint as token file (not manifest)
upft lint file.json --no-manifest
```

### Manifest Configuration

Configure manifest linting in `.upftrc.json`:

```json5
{
  "lintManifest": {
    "extends": "recommended",
    "rules": {
      "consistent-modifier-naming": ["warn", { "style": "kebab-case" }],
      "reasonable-permutation-count": ["warn", { "max": 100 }]
    }
  }
}
```

### Manifest Rules

#### consistent-modifier-naming
Enforce consistent naming style for modifiers.

```json5
"consistent-modifier-naming": ["warn", {
  "style": "kebab-case"  // "kebab-case", "camelCase", or "any"
}]
```

#### modifier-description-required
Modifiers should have descriptions for documentation.

```json5
"modifier-description-required": "warn"
```

#### no-duplicate-files
Warn about files appearing in multiple places.

```json5
"no-duplicate-files": "warn"
```

#### prefer-default-values
Suggest default values for common modifiers.

```json5
"prefer-default-values": "info"
```

#### no-empty-sets
Sets must contain at least one file.

```json5
"no-empty-sets": "error"
```

#### no-unused-modifiers
Find modifiers not used in generate configurations.

```json5
"no-unused-modifiers": "warn"
```

#### consistent-output-paths
Check output path naming patterns.

```json5
"consistent-output-paths": ["warn", {
  "pattern": "^dist/.*\\.json$"  // Regex pattern for paths
}]
```

#### reasonable-permutation-count
Warn about excessive permutation counts.

```json5
"reasonable-permutation-count": ["warn", {
  "max": 50  // Maximum recommended permutations
}]
```

### Manifest Linting Example

```typescript
import { lintManifest } from "@unpunnyfuns/tokens/linter";

const manifest = {
  sets: [{ values: ["base.json"] }],
  modifiers: {
    theme: { oneOf: ["light", "dark"] }
  }
};

const result = lintManifest(manifest, {
  configPath: ".upftrc.json"
});

console.log(`Errors: ${result.summary.errors}`);
console.log(`Warnings: ${result.summary.warnings}`);
```

## Future Features

- **Auto-fix**: Automatic fixing of certain violations (v0.6.0)
- **IDE integration**: Real-time linting in VS Code
- **Custom presets**: Share rule configurations as packages
- **Performance rules**: Detect performance anti-patterns
- **A11y rules**: Enhanced accessibility checking