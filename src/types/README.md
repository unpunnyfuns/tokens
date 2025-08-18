# Types

Centralized TypeScript type definitions establishing the contract for token structures and operations across the entire system. This module provides comprehensive type definitions for DTCG compliance, validation results, configuration options, and utility types, ensuring type safety and enabling IntelliSense support throughout development while maintaining strict alignment with the Design Token Community Group specification.

## Table of Contents

- [Overview](#overview)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Structure](#structure)
- [Design Principles](#design-principles)

## Overview

The types module provides a centralized collection of TypeScript type definitions and interfaces used throughout the UPFT token system. It includes comprehensive type definitions for DTCG tokens, validation results, configuration options, and utility types with proper type guards for runtime validation.

The module maintains strict type safety across all token operations, supports all DTCG token types with accurate TypeScript representations, and provides a hierarchical organization of types for different functional areas. All types are designed to work with strict TypeScript settings and include detailed JSDoc documentation for better development experience.

## Usage

### Working with Token Types

Define and validate token structures:

```typescript
import type { Token, TokenDocument } from '@unpunnyfuns/tokens';
import { isToken } from '@unpunnyfuns/tokens';

// Create typed token document
const document: TokenDocument = {
  colors: {
    primary: {
      $value: "#007bff",
      $type: "color",
      $description: "Primary brand color"
    },
    secondary: {
      $value: "#6c757d", 
      $type: "color"
    }
  },
  spacing: {
    small: {
      $value: "8px",
      $type: "dimension"
    },
    medium: {
      $value: "16px",
      $type: "dimension"
    }
  }
};

// Type-safe token processing
function processToken(value: unknown) {
  if (isToken(value)) {
    console.log(`Token value: ${value.$value}`);
    console.log(`Token type: ${value.$type || 'unspecified'}`);
    if (value.$description) {
      console.log(`Description: ${value.$description}`);
    }
  }
}
```

### Creating Type Guards

Build custom type guards for specific token types:

```typescript
import type { Token } from '@unpunnyfuns/tokens';
import { isToken } from '@unpunnyfuns/tokens';

function isColorToken(token: unknown): token is Token {
  return isToken(token) && token.$type === 'color';
}

function isDimensionToken(token: unknown): token is Token {
  return isToken(token) && token.$type === 'dimension';
}

function isTypographyToken(token: unknown): token is Token {
  return isToken(token) && token.$type === 'typography';
}

// Usage in processing functions
function processTokenValue(token: unknown) {
  if (isColorToken(token)) {
    console.log(`Color: ${token.$value}`);
  } else if (isDimensionToken(token)) {
    console.log(`Dimension: ${token.$value}`);
  } else if (isTypographyToken(token)) {
    console.log(`Typography: ${JSON.stringify(token.$value)}`);
  }
}
```

### Validation Result Handling

Work with validation results using proper typing:

```typescript
import type { 
  ValidationResult, 
  ValidationError,
  TokenValidationResult 
} from '@unpunnyfuns/tokens';

function handleValidationResult(result: ValidationResult): void {
  if (!result.valid) {
    console.log('Validation failed:');
    
    // Handle errors with proper typing
    result.errors.forEach((error: ValidationError) => {
      console.error(`Error at ${error.path}: ${error.message}`);
      
      if (error.rule) {
        console.error(`  Rule: ${error.rule}`);
      }
      
      if (error.context) {
        console.error(`  Context:`, error.context);
      }
    });
    
    // Handle warnings
    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach((warning: ValidationError) => {
        console.warn(`${warning.path}: ${warning.message}`);
      });
    }
  } else {
    console.log('Validation passed successfully');
  }
}

// Extended validation results with statistics
function handleTokenValidationResult(result: TokenValidationResult): void {
  handleValidationResult(result); // Handle base validation
  
  if (result.stats) {
    console.log(`\nValidation Statistics:`);
    console.log(`  Total tokens: ${result.stats.totalTokens}`);
    console.log(`  Valid tokens: ${result.stats.validTokens}`);
    console.log(`  Invalid tokens: ${result.stats.invalidTokens}`);
  }
}
```

### Configuration with Options Types

Configure modules using typed options:

```typescript
import type { 
  ResolverOptions, 
  BundlerOptions,
  FileSystemOptionsWithWriter 
} from '@unpunnyfuns/tokens';
import { TokenFileReader, TokenFileWriter } from '@unpunnyfuns/tokens';

// Configure resolver with options
const resolverOptions: ResolverOptions = {
  fileReader: new TokenFileReader({ cache: true }),
  basePath: './tokens',
  resolveValues: true,
  expandPermutations: false,
  validateManifest: true
};

// Configure bundler with comprehensive options
const bundlerOptions: BundlerOptions = {
  fileReader: new TokenFileReader({ cache: true }),
  fileWriter: new TokenFileWriter(),
  basePath: './tokens',
  outputFormat: 'dtcg',
  prettify: true,
  transforms: [
    (tokens) => {
      // Add metadata transform
      return {
        $metadata: { 
          version: "1.0.0", 
          generatedAt: new Date().toISOString() 
        },
        ...tokens
      };
    },
    (tokens) => {
      // Custom transform
      return tokens;
    }
  ]
};

// Type-safe option merging
function createBundlerOptions(
  base: Partial<BundlerOptions>, 
  overrides: Partial<BundlerOptions>
): BundlerOptions {
  return {
    outputFormat: 'dtcg',
    prettify: false,
    ...base,
    ...overrides
  };
}
```

### Working with Complex Token Types

Handle advanced token types with proper typing:

```typescript
import type { 
  ShadowToken, 
  BorderToken, 
  GradientToken,
  TransitionToken 
} from '@unpunnyfuns/tokens';

// Shadow token with multiple shadows
const shadowToken: ShadowToken = {
  $value: [
    {
      color: "#000000",
      offsetX: "0px",
      offsetY: "2px", 
      blur: "4px",
      spread: "0px",
      inset: false
    },
    {
      color: "#00000020",
      offsetX: "0px",
      offsetY: "4px",
      blur: "8px", 
      spread: "0px",
      inset: false
    }
  ],
  $type: "shadow",
  $description: "Card shadow with multiple layers"
};

// Border token
const borderToken: BorderToken = {
  $value: {
    color: "#e9ecef",
    width: "1px",
    style: "solid"
  },
  $type: "border"
};

// Gradient token
const gradientToken: GradientToken = {
  $value: [
    { color: "#007bff", position: 0 },
    { color: "#0056b3", position: 1 }
  ],
  $type: "gradient"
};

// Transition token
const transitionToken: TransitionToken = {
  $value: {
    duration: "200ms",
    delay: "0ms", 
    timingFunction: "ease-in-out"
  },
  $type: "transition"
};
```

### Discriminated Union Patterns

Leverage discriminated unions for type safety:

```typescript
import type { ValidationResult } from '@unpunnyfuns/tokens';

// Result type with discriminated union
type ProcessingResult = 
  | { success: true; data: TokenDocument; processedCount: number }
  | { success: false; error: string; failureReason: string };

function processTokens(document: TokenDocument): ProcessingResult {
  try {
    // Process tokens...
    return { 
      success: true, 
      data: document, 
      processedCount: Object.keys(document).length 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      failureReason: 'processing_failed'
    };
  }
}

// Type-safe result handling
const result = processTokens(document);
if (result.success) {
  // TypeScript knows result.data and result.processedCount exist
  console.log(`Processed ${result.processedCount} tokens`);
  console.log(result.data);
} else {
  // TypeScript knows result.error and result.failureReason exist
  console.error(`Processing failed: ${result.error}`);
  console.error(`Reason: ${result.failureReason}`);
}
```

### Branded Types for Type Safety

Use branded types for additional compile-time safety:

```typescript
// Define branded types
type TokenPath = string & { __brand: 'TokenPath' };
type TokenReference = string & { __brand: 'TokenReference' };

// Utility functions with branded types
function createTokenPath(path: string): TokenPath {
  // Validate path format
  if (!path.includes('.')) {
    throw new Error('Token path must contain dots');
  }
  return path as TokenPath;
}

function createTokenReference(ref: string): TokenReference {
  // Validate reference format
  if (!ref.startsWith('{') || !ref.endsWith('}')) {
    throw new Error('Token reference must be wrapped in braces');
  }
  return ref as TokenReference;
}

// Functions that only accept properly branded types
function resolveTokenReference(ref: TokenReference, document: TokenDocument): unknown {
  const path = ref.slice(1, -1); // Remove braces
  // Resolve reference...
  return document;
}
```

## API Reference

### Core Token Types

#### `Token`

Base token interface with required and optional properties:

```typescript
interface Token {
  $value?: TokenValue;
  $type?: string;
  $description?: string;
  $extensions?: Record<string, unknown>;
  [key: string]: unknown;
}
```

#### `TokenDocument`

Document containing tokens and groups:

```typescript
interface TokenDocument {
  $description?: string;
  $extensions?: Record<string, unknown>;
  [key: string]: TokenOrGroup | string | Record<string, unknown> | undefined;
}
```

#### `TokenGroup`

Group of tokens with optional metadata:

```typescript
interface TokenGroup {
  $description?: string;
  $type?: string;
  [key: string]: TokenOrGroup | string | undefined;
}
```

### Specific Token Types

#### `ColorToken`

Color token with string value and color type:

```typescript
interface ColorToken extends Token {
  $value: string; // Hex, rgb(), hsl(), etc.
  $type: "color";
}
```

#### `DimensionToken`

Dimension token with numeric or string value:

```typescript
interface DimensionToken extends Token {
  $value: string | number; // "16px", "1rem", 16
  $type: "dimension";
}
```

#### `TypographyToken`

Typography token with composite value:

```typescript
interface TypographyToken extends Token {
  $value: {
    fontFamily?: string | string[];
    fontSize?: string | number;
    fontWeight?: string | number;
    lineHeight?: string | number;
    letterSpacing?: string | number;
    textTransform?: string;
    fontStyle?: string;
  };
  $type: "typography";
}
```

#### `ShadowToken`

Shadow token with single or multiple shadow definitions:

```typescript
interface ShadowToken extends Token {
  $value: ShadowValue | ShadowValue[];
  $type: "shadow";
}

interface ShadowValue {
  color: string;
  offsetX: string | number;
  offsetY: string | number;
  blur?: string | number;
  spread?: string | number;
  inset?: boolean;
}
```

#### `BorderToken`

Border token with color, width, and style:

```typescript
interface BorderToken extends Token {
  $value: {
    color: string;
    width: string | number;
    style: string;
  };
  $type: "border";
}
```

#### `GradientToken`

Gradient token with color stops:

```typescript
interface GradientToken extends Token {
  $value: Array<{
    color: string;
    position: number;
  }>;
  $type: "gradient";
}
```

### Validation Types

#### `ValidationResult`

Result of validation operation:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}
```

#### `ValidationError`

Details of validation error or warning:

```typescript
interface ValidationError {
  path: string;
  message: string;
  severity: "error" | "warning";
  rule?: string;
  context?: unknown;
}
```

#### `TokenValidationResult`

Extended validation result with statistics:

```typescript
interface TokenValidationResult extends ValidationResult {
  stats?: {
    totalTokens: number;
    validTokens: number;
    invalidTokens: number;
  };
}
```

### Option Types

#### `BaseFileSystemOptions`

Base options for file system operations:

```typescript
interface BaseFileSystemOptions {
  basePath?: string;
  fileReader?: TokenFileReader;
}
```

#### `ResolverOptions`

Options for manifest resolution:

```typescript
interface ResolverOptions extends BaseFileSystemOptions {
  resolveValues?: boolean;
  expandPermutations?: boolean;
  validateManifest?: boolean;
}
```

#### `BundlerOptions`

Options for token bundling:

```typescript
interface BundlerOptions extends FileSystemOptionsWithWriter {
  outputFormat?: 'dtcg' | 'custom';
  prettify?: boolean;
  transforms?: TokenTransform[];
}
```

### Utility Types

#### `TokenValue`

Union type for all possible token values:

```typescript
type TokenValue = string | number | boolean | object | array;
```

#### `TokenType`

Union of valid DTCG token types:

```typescript
type TokenType = 
  | "color" 
  | "dimension" 
  | "fontFamily" 
  | "fontWeight" 
  | "duration" 
  | "cubicBezier" 
  | "number" 
  | "strokeStyle" 
  | "border" 
  | "transition" 
  | "shadow" 
  | "gradient" 
  | "typography";
```

#### `TokenOrGroup`

Union type for token or group:

```typescript
type TokenOrGroup = Token | TokenGroup;
```

## Structure

| File | Purpose |
|------|---------|
| `index.ts` | Centralized type exports |
| `validation.ts` | Validation-related types |
| `options.ts` | Option interfaces for modules |
| `../types.ts` | Core token type definitions |

## Design Principles

1. **Single source of truth** - All types defined once and exported centrally
2. **No circular dependencies** - Types module imports nothing, only exports
3. **Explicit exports** - No wildcard exports, every type explicitly listed
4. **Comprehensive documentation** - All interfaces have JSDoc comments
5. **Strict compatibility** - Types work with strict TypeScript settings
6. **Hierarchical organization** - Related types grouped together logically
7. **Runtime safety** - Type guards available for runtime validation
8. **Future-proof** - Extensible design for additional token types