# @upft/linter

Advanced linting and style checking for design tokens - enforce conventions, detect issues, and maintain consistency.

## Features

| Feature | Purpose |
|---------|---------|
| **Naming Conventions** | Enforce consistent token naming |
| **Structure Analysis** | Validate token organization |
| **Reference Checking** | Detect broken or circular references |
| **Type Consistency** | Ensure proper type usage |
| **Performance Analysis** | Identify optimization opportunities |

## Quick Start

```typescript
import { createLinter, LintConfig } from "@upft/linter";

const linter = createLinter({
  rules: {
    naming: "kebab-case",
    structure: "semantic-hierarchy",
    references: "strict"
  }
});

const result = await linter.lintTokenFile("tokens.json");
console.log(result.violations);
```

## Linting Rules

### Naming Rules

```typescript
// Configure naming conventions
const config: LintConfig = {
  naming: {
    pattern: "kebab-case",        // color-primary, not colorPrimary
    prefix: "ds",                 // ds-color-primary
    maxDepth: 4,                  // Limit nesting depth
    reservedWords: ["system"]     // Avoid reserved names
  }
};
```

### Structure Rules

```typescript
const config: LintConfig = {
  structure: {
    requireGroups: true,          // Tokens must be in groups
    groupOrder: ["primitives", "semantic", "components"],
    maxGroupDepth: 3,
    requireDescriptions: "semantic" // Descriptions required for semantic tokens
  }
};
```

### Reference Rules

```typescript
const config: LintConfig = {
  references: {
    allowCircular: false,         // Prevent circular references
    requireResolvable: true,      // All refs must resolve
    preferShortPaths: true,       // Suggest shorter reference paths
    validateScope: "strict"       // Check reference scope validity
  }
};
```

## API Reference

### Core Functions

```typescript
import { 
  lintTokenFile,
  lintManifest,
  createLinter,
  LintResult 
} from "@upft/linter";

// Lint single file
const result = await lintTokenFile("tokens.json", config);

// Lint manifest
const manifestResult = await lintManifest("manifest.json", config);

// Create reusable linter
const linter = createLinter(config);
const result = await linter.lint(tokenDocument);
```

### Result Structure

```typescript
interface LintResult {
  valid: boolean;
  violations: LintViolation[];
  warnings: LintWarning[];
  stats: LintStats;
}

interface LintViolation {
  rule: string;
  severity: "error" | "warning";
  message: string;
  path: string;
  line?: number;
  suggestions?: string[];
}
```

## Rule Categories

### 1. Naming & Conventions

| Rule | Description | Example |
|------|-------------|---------|
| `naming-convention` | Enforce naming pattern | `color-primary` ✅ `colorPrimary` ❌ |
| `consistent-casing` | Consistent case usage | All kebab-case or camelCase |
| `meaningful-names` | Avoid generic names | `brand-blue` ✅ `color1` ❌ |
| `reserved-words` | Avoid system keywords | Don't use `default`, `inherit` |

### 2. Structure & Organization

| Rule | Description | Example |
|------|-------------|---------|
| `semantic-hierarchy` | Proper token layering | Primitive → Semantic → Component |
| `group-organization` | Logical token grouping | Colors grouped, not scattered |
| `nesting-depth` | Limit deep nesting | Max 4 levels deep |
| `required-metadata` | Ensure descriptions | Semantic tokens need descriptions |

### 3. Type & Value Validation

| Rule | Description | Example |
|------|-------------|---------|
| `type-consistency` | Consistent type usage | All colors use `color` type |
| `value-format` | Proper value formats | `#ff0000` ✅ `red` ❌ for colors |
| `unit-consistency` | Consistent units | Use `px` or `rem`, not mixed |
| `range-validation` | Values in valid ranges | Opacity 0-1, degrees 0-360 |

### 4. Reference Management

| Rule | Description | Example |
|------|-------------|---------|
| `reference-validity` | All refs resolve | `{color.primary}` must exist |
| `circular-detection` | No circular refs | A → B → A is invalid |
| `reference-scope` | Proper ref scoping | Semantic can ref primitive |
| `unused-tokens` | Detect orphaned tokens | Warn about unreferenced tokens |

## Configuration Examples

### Strict Configuration

```json
{
  "rules": {
    "naming-convention": "error",
    "semantic-hierarchy": "error", 
    "reference-validity": "error",
    "circular-detection": "error",
    "type-consistency": "error"
  },
  "naming": {
    "pattern": "kebab-case",
    "maxDepth": 4
  },
  "structure": {
    "requireGroups": true,
    "requireDescriptions": "semantic"
  }
}
```

### Relaxed Configuration

```json
{
  "rules": {
    "naming-convention": "warning",
    "semantic-hierarchy": "warning",
    "reference-validity": "error",
    "type-consistency": "warning"
  },
  "naming": {
    "pattern": "flexible",
    "allowMixed": true
  }
}
```

## CLI Integration

```bash
# Lint single file
upft lint tokens.json

# Lint with specific config
upft lint tokens.json --config .lintrc.json

# Lint directory
upft lint tokens/ --recursive

# Fix auto-fixable issues
upft lint tokens.json --fix

# Generate report
upft lint tokens/ --format json > lint-report.json
```

## Custom Rules

```typescript
import { createCustomRule, RuleContext } from "@upft/linter";

const customRule = createCustomRule({
  name: "company-prefix",
  description: "Ensure tokens have company prefix",
  
  check(token: Token, context: RuleContext) {
    if (!token.path.startsWith("acme-")) {
      return {
        violation: true,
        message: "Token must start with 'acme-' prefix",
        suggestion: `acme-${token.path}`
      };
    }
    return { violation: false };
  }
});

const linter = createLinter({
  customRules: [customRule]
});
```

## Performance Analysis

```typescript
import { analyzePerformance } from "@upft/linter";

const analysis = await analyzePerformance("tokens.json");

console.log({
  tokenCount: analysis.stats.totalTokens,
  referenceDepth: analysis.stats.maxReferenceDepth,
  bundleSize: analysis.performance.estimatedBundleSize,
  suggestions: analysis.optimizations
});
```

## IDE Integration

### VS Code Extension

```json
// .vscode/settings.json
{
  "upft.linting.enabled": true,
  "upft.linting.config": ".upftrc.json",
  "upft.linting.onSave": true
}
```

### Real-time Validation

```typescript
// File watcher integration
import { createFileWatcher } from "@upft/linter";

const watcher = createFileWatcher({
  pattern: "**/*.tokens.json",
  onLint: (result) => {
    if (!result.valid) {
      console.error(`Linting errors in ${result.file}`);
    }
  }
});
```

## Testing

```bash
# Run linter tests
pnpm test

# Test custom rules
pnpm test:rules

# Test performance
pnpm test:performance
```