# @upft/examples

Single source of truth for design token examples and test fixtures in the UPFT ecosystem.

## Structure

| Directory | Purpose |
|-----------|---------|
| `src/bundler-fixtures/` | Bundler test fixtures with input/output token files |
| `src/error-cases/` | Invalid token examples for validation testing |
| `src/test-scenarios/` | Integration test manifests and token sets |
| `src/test-fixtures/` | Basic token examples for unit tests |
| `src/tokens/` | Comprehensive token examples by pattern |

## Bundler Fixtures

Test fixtures for bundler operations with complete input/output examples:

- `input/colors-base.json` - DTCG-compliant color tokens
- `input/spacing-base.json` - Dimension tokens with proper units
- `input/theme-light.json` / `input/theme-dark.json` - Theme overrides
- Various manifest files for bundling scenarios

## Token Examples

### Full Example
`tokens/full-example.json` - Complete design system with all token types

### By Category
- `tokens/primitives/` - Base tokens (colors, dimensions, typography, borders)
- `tokens/semantic/` - Semantic layer tokens
- `tokens/components/` - Component-specific tokens
- `tokens/themes/` - Theme variant tokens

### Advanced Patterns
- `tokens/advanced-colors.json` - Complex color formats and gradients
- `tokens/composite-tokens.json` - Multi-property tokens
- `tokens/reference-patterns.json` - Reference usage patterns
- `tokens/shadows.json` - Shadow token examples

## Test Scenarios

Integration test manifests with corresponding token files:

- `simple.manifest.json` + `simple-tokens.json` - Basic validation scenario
- `density-variants.manifest.json` - Density modifier examples
- Various layered and filtering scenarios

## Error Cases

Examples of invalid tokens for validation testing:

- `broken-references.json` - Invalid token references
- `legacy-color-formats.json` - Deprecated color formats

## Usage

All test files across the UPFT monorepo import from this package to ensure consistent fixtures:

```typescript
import colorsBase from "@upft/examples/bundler-fixtures/input/colors-base.json";
import simpleManifest from "@upft/examples/test-scenarios/simple.manifest.json";
import fullExample from "@upft/examples/tokens/full-example.json";
```

## DTCG Compliance

All token examples use proper DTCG structure with:
- Correct `$value` formats for each token type
- Proper `$type` declarations
- Valid reference syntax `{token.path}`
- Color tokens use `colorSpace`/`components` format, not hex strings