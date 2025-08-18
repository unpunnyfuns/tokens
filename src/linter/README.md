# Linter

Configurable rule engine for enforcing design token best practices, naming conventions, and organizational standards beyond basic schema validation. This work-in-progress module will provide customizable linting rules with auto-fix capabilities, enabling teams to maintain consistent token quality through automated checks integrated into development workflows and CI/CD pipelines.

## Table of Contents

- [Overview](#overview)
- [Structure](#structure)
- [Rule Categories](#rule-categories)
- [Configuration](#configuration)
- [Usage](#usage)
- [Built-in Rule Sets](#built-in-rule-sets)
- [Custom Rules](#custom-rules)
- [Auto-fixing](#auto-fixing)
- [Performance](#performance)
- [Future Considerations](#future-considerations)

## Overview

**Note: This module is currently work in progress and not yet available for use.**

The linter module extends the platform's validation capabilities beyond structural correctness to enforce team-specific conventions and best practices. While the validation module ensures tokens conform to the DTCG specification, the linter ensures they conform to your organization's standards.

The design prioritizes configurability and extensibility, recognizing that different teams have different conventions. Rules can be mixed and matched, configured with custom parameters, and extended with project-specific requirements. The auto-fix capability allows many issues to be resolved automatically, reducing the manual burden of maintaining consistency.

## Structure

### Core Components
- **token-linter.ts** - Main linting engine
- **lint-rules.ts** - Built-in rule definitions


## Rule Categories

### Naming Rules
Enforce consistent naming patterns:
- **camelCase** - Require camelCase names
- **kebab-case** - Require kebab-case names
- **no-abbreviations** - Disallow common abbreviations
- **hierarchical-naming** - Enforce path-based naming

### Structure Rules
Maintain organizational standards:
- **max-depth** - Limit nesting depth
- **group-consistency** - Ensure consistent group structure
- **required-groups** - Enforce presence of specific groups
- **no-empty-groups** - Disallow groups without tokens

### Value Rules
Validate token values beyond type checking:
- **color-format** - Enforce specific color formats
- **unit-consistency** - Require consistent units
- **value-constraints** - Custom value restrictions
- **no-magic-numbers** - Require semantic values

### Reference Rules
Control reference patterns:
- **no-circular-refs** - Prevent circular dependencies
- **max-ref-depth** - Limit reference chain length
- **ref-naming** - Enforce reference naming patterns
- **local-refs-only** - Restrict cross-file references

## Configuration

Linter configuration via `.lintrc.json`:
```json
{
  "extends": "recommended",
  "rules": {
    "naming/camelCase": "error",
    "structure/max-depth": ["warning", { "max": 4 }],
    "values/color-format": ["error", { "format": "hex" }],
    "references/max-ref-depth": ["warning", { "max": 3 }]
  },
  "ignore": [
    "**/generated/**",
    "**/vendor/**"
  ]
}
```

## Severity Levels

- **error** - Must be fixed, fails linting
- **warning** - Should be addressed, passes with warnings
- **info** - Suggestions, informational only
- **off** - Rule disabled

## Usage

```typescript
import { TokenLinter } from './linter';

const linter = new TokenLinter({
  rules: {
    'naming/camelCase': 'error',
    'structure/max-depth': ['warning', { max: 4 }]
  }
});

const results = linter.lint(tokenDocument);
results.forEach(issue => {
  console.log(`${issue.severity}: ${issue.message} at ${issue.path}`);
});
```

## Built-in Rule Sets

### Recommended
Balanced set of best practices:
- Consistent naming
- Reasonable depth limits
- Standard value formats

### Strict
Enforces strict conventions:
- No abbreviations
- Minimal nesting
- Explicit types required

### Minimal
Essential rules only:
- No circular references
- Valid value formats

## Custom Rules

Create custom lint rules:
```typescript
const customRule: LintRule = {
  name: 'custom/no-brand-colors',
  check: (token, path) => {
    if (path.includes('brand') && token.$type === 'color') {
      return {
        severity: 'error',
        message: 'Brand colors not allowed',
        path
      };
    }
  }
};

linter.addRule(customRule);
```

## Auto-fixing

Some rules support automatic fixing:
```typescript
const results = linter.lint(document, { fix: true });
// Returns fixed document and remaining issues
```

Fixable rules:
- Naming convention conversion
- Color format normalization
- Group organization
- Whitespace normalization

## Integration Points

- **CLI** - Lint command
- **API** - Linting functions
- **Validation** - Extended validation
- **CI/CD** - Automated quality checks

## Performance

Linting performance characteristics:
- **Small files** (<100 tokens): <5ms
- **Medium files** (<1000 tokens): <20ms
- **Large files** (<10000 tokens): <100ms

Rules are executed in parallel when possible.

## Reporting

Multiple output formats:
- **Terminal** - Colored, formatted output
- **JSON** - Machine-readable results
- **HTML** - Interactive report
- **Markdown** - Documentation-friendly

## Future Considerations

- **Rule plugins** - External rule packages
- **Context-aware rules** - Rules based on token usage
- **Progressive enhancement** - Gradual rule adoption
- **Smart suggestions** - AI-powered fixes
- **Cross-file rules** - Rules spanning multiple files
- **Performance rules** - Optimization suggestions
- **Accessibility rules** - Color contrast checks
- **Security rules** - Detect sensitive values
- **Documentation rules** - Require descriptions
- **IDE integration** - Real-time linting feedback