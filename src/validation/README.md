# Validation

Schema-based validation engine ensuring DTCG compliance and structural integrity through JSON Schema validation with AJV. This module provides precise error reporting, optimized schema caching, and extensible validation strategies, supporting both strict type validation for production systems and flexible validation for experimental token types during development.

## Table of Contents

- [Overview](#overview)
- [Usage](#usage)  
- [API Reference](#api-reference)
- [Structure](#structure)
- [Performance](#performance)
- [Testing](#testing)

## Overview

The validation module provides comprehensive schema-based validation for Design Token Community Group (DTCG) token documents and UPFT manifests. It uses JSON Schema with AJV for precise validation, supports all DTCG token types, and includes advanced features like reference validation and schema caching for optimal performance.

The module offers both functional APIs for modern usage and maintains legacy class-based APIs for backward compatibility. It features detailed error reporting with precise path information, configurable validation strictness, and extensible schema management for custom token types.

## Usage

### Basic Token Validation

Validate token documents against DTCG schemas:

```typescript
import { validateTokens, isValidTokens } from '@unpunnyfuns/tokens/validation';

const document = {
  colors: {
    primary: { 
      $value: "#007bff", 
      $type: "color",
      $description: "Primary brand color"
    },
    invalid: {
      $value: "not-a-color",
      $type: "color"
    }
  },
  spacing: {
    small: {
      $value: "8px",
      $type: "dimension"
    }
  }
};

// Quick boolean check
if (isValidTokens(document)) {
  console.log('Document is valid');
} else {
  console.log('Document has validation errors');
}

// Detailed validation with options
const result = validateTokens(document, {
  strict: true,              // Use strict schema validation
  validateReferences: false  // Skip reference checking for now
});

if (!result.valid) {
  console.log(`Found ${result.errors.length} validation errors:`);
  
  for (const error of result.errors) {
    console.error(`${error.path}: ${error.message}`);
    if (error.rule) {
      console.error(`  Violated rule: ${error.rule}`);
    }
  }
  
  // Handle warnings
  if (result.warnings.length > 0) {
    console.log(`\nWarnings (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      console.warn(`${warning.path}: ${warning.message}`);
    }
  }
}
```

### Advanced Validation Options

Configure validation behavior with comprehensive options:

```typescript
import { validateTokens } from '@unpunnyfuns/tokens/validation';

const result = validateTokens(document, {
  strict: false,             // Allow some flexibility
  validateReferences: true   // Check that references exist and are valid
});

// Process results with context
for (const error of result.errors) {
  console.error(`Validation Error:`);
  console.error(`  Path: ${error.path}`);
  console.error(`  Message: ${error.message}`);
  console.error(`  Severity: ${error.severity}`);
  
  if (error.context) {
    console.error(`  Context:`, error.context);
  }
  
  if (error.rule) {
    console.error(`  Rule: ${error.rule}`);
  }
}
```

### Batch Validation

Validate multiple token documents efficiently:

```typescript
import { validateTokenDocuments } from '@unpunnyfuns/tokens';

const documents = [
  { colors: { primary: { $value: "#007bff", $type: "color" } } },
  { spacing: { small: { $value: "8px", $type: "dimension" } } },
  { typography: { heading: { $value: "32px", $type: "typography" } } }
];

const results = await validateTokenDocuments(documents, {
  strict: true,
  validateReferences: false
});

results.forEach((result, index) => {
  console.log(`\nDocument ${index + 1}:`);
  if (result.valid) {
    console.log('  ✅ Valid');
  } else {
    console.log(`  ❌ Invalid (${result.errors.length} errors)`);
    result.errors.forEach(error => {
      console.log(`    ${error.path}: ${error.message}`);
    });
  }
});

// Summary statistics
const validCount = results.filter(r => r.valid).length;
const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
console.log(`\nSummary: ${validCount}/${results.length} valid, ${totalErrors} total errors`);
```

### Manifest Validation

Validate UPFT manifest structure and content:

```typescript
import { validateManifest, isValidManifest } from '@unpunnyfuns/tokens';

const manifest = {
  name: "Design System Tokens",
  description: "Multi-dimensional token system",
  sets: [
    { name: "core", values: ["tokens/core.json"] },
    { name: "brand", values: ["tokens/brand.json"] }
  ],
  modifiers: {
    theme: {
      oneOf: ["light", "dark"],
      values: {
        light: ["tokens/themes/light.json"],
        dark: ["tokens/themes/dark.json"]
      }
    },
    density: {
      anyOf: ["comfortable", "compact"],
      values: {
        comfortable: ["tokens/density/comfortable.json"],
        compact: ["tokens/density/compact.json"]
      }
    }
  },
  generate: [
    { theme: "light", output: "dist/light.json" },
    { theme: "dark", output: "dist/dark.json" },
    { theme: "dark", density: ["compact"], output: "dist/dark-compact.json" }
  ]
};

// Quick validation
if (isValidManifest(manifest)) {
  console.log('Manifest structure is valid');
}

// Detailed validation
const result = validateManifest(manifest);

if (!result.valid) {
  console.log('Manifest validation failed:');
  for (const error of result.errors) {
    console.error(`  ${error.path}: ${error.message}`);
  }
} else {
  console.log('Manifest is valid and ready for processing');
}
```

### Reference Validation

Validate that token references exist and are properly formatted:

```typescript
import { validateTokenDocument } from '@unpunnyfuns/tokens';

const documentWithReferences = {
  colors: {
    base: { $value: "#007bff", $type: "color" },
    primary: { $value: "{colors.base}", $type: "color" },
    secondary: { $value: "{colors.primary}", $type: "color" },
    broken: { $value: "{colors.nonexistent}", $type: "color" }
  },
  spacing: {
    base: { $value: "8px", $type: "dimension" },
    double: { $value: "{spacing.base} * 2", $type: "dimension" }
  }
};

const result = await validateTokenDocument(documentWithReferences, {
  validateReferences: true,
  strict: true
});

if (!result.valid) {
  // Filter for reference-specific errors
  const referenceErrors = result.errors.filter(error => 
    error.message.includes('reference') || error.rule?.includes('ref')
  );
  
  if (referenceErrors.length > 0) {
    console.log('Reference validation errors:');
    for (const error of referenceErrors) {
      console.error(`  ${error.path}: ${error.message}`);
    }
  }
}
```

### Schema Management

Work with schemas directly for advanced scenarios:

```typescript
import { 
  loadSchema, 
  compileSchema, 
  getCachedValidator,
  clearSchemaCache 
} from '@unpunnyfuns/tokens';

// Load specific token type schema
const colorSchema = await loadSchema('color');
if (colorSchema) {
  console.log('Color schema loaded:', colorSchema);
}

// Compile schema for direct usage
const validator = compileSchema(colorSchema, 'color');
const isValid = validator({ $value: "#007bff", $type: "color" });
console.log('Direct validation result:', isValid);

// Check for cached validators
const cachedValidator = getCachedValidator('color');
if (cachedValidator) {
  console.log('Using cached validator for color tokens');
}

// Clear cache when needed (e.g., after schema updates)
clearSchemaCache();
console.log('Schema cache cleared');
```

### Token Linting

Lint tokens for best practices and consistency:

```typescript
import { TokenLinter } from '@unpunnyfuns/tokens';

const linter = new TokenLinter();
const lintResults = await linter.lint(document);

if (lintResults.length > 0) {
  console.log('Linting suggestions:');
  
  for (const result of lintResults) {
    const icon = result.severity === 'error' ? '❌' : '⚠️';
    console.log(`${icon} ${result.path}: ${result.message}`);
    
    if (result.fix) {
      console.log(`    💡 Suggested fix: ${result.fix}`);
    }
    
    if (result.rule) {
      console.log(`    📋 Rule: ${result.rule}`);
    }
  }
} else {
  console.log('✅ No linting issues found');
}
```

### Error Analysis and Reporting

Analyze validation results systematically:

```typescript
import { validateTokenDocument } from '@unpunnyfuns/tokens';

const result = await validateTokenDocument(document, { strict: true });

// Group errors by type
const errorsByType = result.errors.reduce((groups, error) => {
  const type = error.rule || 'unknown';
  if (!groups[type]) groups[type] = [];
  groups[type].push(error);
  return groups;
}, {} as Record<string, ValidationError[]>);

console.log('\nError Analysis:');
for (const [type, errors] of Object.entries(errorsByType)) {
  console.log(`\n${type.toUpperCase()} (${errors.length} errors):`);
  for (const error of errors.slice(0, 5)) { // Show first 5
    console.log(`  • ${error.path}: ${error.message}`);
  }
  if (errors.length > 5) {
    console.log(`  ... and ${errors.length - 5} more`);
  }
}

// Path analysis
const pathFrequency = result.errors.reduce((freq, error) => {
  const pathParts = error.path.split('.');
  const rootPath = pathParts[0];
  freq[rootPath] = (freq[rootPath] || 0) + 1;
  return freq;
}, {} as Record<string, number>);

console.log('\nErrors by root path:');
for (const [path, count] of Object.entries(pathFrequency)) {
  console.log(`  ${path}: ${count} errors`);
}
```

## API Reference

### Functional Validation API

#### `validateTokenDocument`

```typescript
function validateTokenDocument(
  document: unknown, 
  options?: TokenValidationOptions
): Promise<ValidationResult>
```

Validate a single token document against DTCG schemas with comprehensive options.

#### `validateTokenDocuments`

```typescript
function validateTokenDocuments(
  documents: unknown[], 
  options?: TokenValidationOptions
): Promise<ValidationResult[]>
```

Validate multiple token documents efficiently with shared schema caching.

#### `isValidTokenDocument`

```typescript
function isValidTokenDocument(document: unknown): boolean
```

Quick synchronous check for token document validity without detailed error reporting.

#### `validateManifest`

```typescript
function validateManifest(manifest: unknown): ValidationResult
```

Validate UPFT manifest structure and content against manifest schema.

#### `isValidManifest`

```typescript
function isValidManifest(manifest: unknown): boolean
```

Quick boolean check for manifest validity.

### Schema Management Functions

#### `loadSchema`

```typescript
function loadSchema(
  schemaId: string, 
  locations?: SchemaLocation[]
): Promise<unknown | null>
```

Load JSON schema by identifier with optional custom locations.

#### `compileSchema`

```typescript
function compileSchema(
  schema: unknown, 
  schemaId?: string
): ValidateFunction
```

Compile JSON schema using AJV with optimized settings.

#### `getCachedValidator`

```typescript
function getCachedValidator(schemaId: string): ValidateFunction | undefined
```

Retrieve cached AJV validator function for performance optimization.

### Legacy Class-Based API

#### `TokenValidator`

Legacy class-based validator (deprecated, use functional API):

```typescript
class TokenValidator {
  constructor(options?: TokenValidationOptions);
  validate(document: unknown): Promise<ValidationResult>;
  validateMany(documents: unknown[]): Promise<ValidationResult[]>;
}
```

#### `ManifestValidator`

Legacy manifest validator (deprecated, use functional API):

```typescript
class ManifestValidator {
  constructor();
  validate(manifest: unknown): ValidationResult;
}
```

### Token Linting API

#### `TokenLinter`

Linter for token best practices and style consistency:

```typescript
class TokenLinter {
  constructor(rules?: LintRule[]);
  lint(document: TokenDocument): Promise<LintResult[]>;
  addRule(rule: LintRule): void;
  removeRule(ruleName: string): void;
}
```

### Configuration Types

#### `TokenValidationOptions`

```typescript
interface TokenValidationOptions {
  strict?: boolean;              // Use strict DTCG validation (default: true)
  validateReferences?: boolean;  // Check reference validity (default: false)
  errorLimit?: number;           // Maximum errors to report (default: 100)
  schemaVersion?: string;        // DTCG schema version to use (default: 'latest')
}
```

#### `ValidationResult`

```typescript
interface ValidationResult {
  valid: boolean;              // Overall validation success
  errors: ValidationError[];   // Validation errors found
  warnings: ValidationError[]; // Validation warnings
}
```

#### `ValidationError`

```typescript
interface ValidationError {
  path: string;        // JSONPath to error location
  message: string;     // Human-readable error description
  severity: 'error' | 'warning';
  rule?: string;       // Validation rule identifier
  context?: unknown;   // Additional context data
}
```

#### `SchemaLocation`

```typescript
interface SchemaLocation {
  id: string;          // Schema identifier
  path: string;        // File system path or URL
  format?: string;     // Schema format ('json', 'yaml')
}
```

#### `LintRule`

```typescript
interface LintRule {
  name: string;                    // Rule identifier
  description: string;             // Rule description
  severity: 'error' | 'warning';  // Default severity
  check: (token: Token, path: string) => LintResult | null;
}
```

#### `LintResult`

```typescript
interface LintResult {
  path: string;         // Token path
  rule: string;         // Rule name
  message: string;      // Issue description
  severity: 'error' | 'warning';
  fix?: string;         // Suggested fix description
}
```

### Supported Token Types

The validation module supports all DTCG token types:

| Type | Schema | Description |
|------|--------|-------------|
| `color` | Color values | Hex, RGB, HSL, named colors |
| `dimension` | Dimension values | Pixel, rem, em units |
| `fontFamily` | Font families | String or array of font names |
| `fontWeight` | Font weights | Numeric or keyword values |
| `duration` | Duration values | Time units (ms, s) |
| `cubicBezier` | Cubic bezier | Four-number array |
| `number` | Numeric values | Integer or float |
| `strokeStyle` | Stroke styles | Solid, dashed, dotted |
| `border` | Border definitions | Color, width, style composite |
| `transition` | Transition definitions | Duration, timing, delay composite |
| `shadow` | Shadow definitions | Single or multiple shadows |
| `gradient` | Gradient definitions | Color stop arrays |
| `typography` | Typography composite | Font properties composite |

## Structure

| File | Purpose |
|------|---------|
| `token-validator.ts` | Functional token validation API |
| `manifest-validation.ts` | Manifest validation functions |
| `schema-utils.ts` | Schema management and caching utilities |
| `validator.ts` | Legacy class-based token validator |
| `manifest-validator.ts` | Legacy class-based manifest validator |
| `token-linter.ts` | Token linting for best practices |
| `lint-rules.ts` | Built-in linting rule definitions |
| `schema-registry.ts` | Legacy schema registry (deprecated) |

## Performance

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Schema validation | O(n) | Where n = number of tokens |
| Reference checking | O(r) | Where r = number of references |
| Schema compilation | O(1) | Cached after first use |
| Batch validation | O(n×d) | Where n = documents, d = tokens per doc |
| Schema loading | O(1) | Network/disk access, then cached |

Performance optimizations include:
- Schema compilation caching for repeated validations
- Lazy loading of schemas on demand
- Efficient AJV configuration for fast validation
- Batch processing for multiple documents
- Reference validation short-circuiting

## Testing

```bash
npm test -- src/validation
```

Key test scenarios:
- Valid and invalid token documents across all DTCG types
- Reference validation with circular and missing references
- Manifest validation with complex modifier configurations
- Schema loading and caching behavior
- Error message accuracy and path reporting
- Performance with large token sets