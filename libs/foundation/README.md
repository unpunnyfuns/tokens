# Foundation

Core types and utilities for the UPFT design token ecosystem.

## Structure

| File | Purpose |
|------|---------|
| `types.ts` | Complete type definitions for tokens, manifests, and validation |
| `core/index.ts` | Core utilities and guards |
| `core/token/` | Token type guards and reference extraction |
| `core/merge/` | Token merging utilities (future expansion) |
| `index.ts` | Public exports |

## Core Type System

### DTCG Token Types

```typescript
import type { Token, TokenDocument } from '@upft/foundation';

// Basic DTCG token with all standard properties
const token: Token = {
  $type: 'color',
  $value: '#ff0000',
  $description: 'Primary brand color'
};

// Token document structure with nested groups and references
const document: TokenDocument = {
  colors: {
    primary: token,
    secondary: { $type: 'color', $value: '{colors.primary}' }
  }
};
```

Defines DTCG-compliant token structures with proper typing for values, references, and metadata.

### UPFT Manifest Types

```typescript
import type { UPFTResolverManifest, OneOfModifier } from '@upft/foundation';

// UPFT manifest with sets, modifiers, and generation rules
const manifest: UPFTResolverManifest = {
  name: 'Design System',
  sets: [{ name: 'core', files: ['tokens.json'] }],
  modifiers: {
    theme: {
      oneOf: ['light', 'dark'],
      values: {
        light: ['theme-light.json'],
        dark: ['theme-dark.json']
      }
    }
  }
};
```

Provides complete typing for UPFT manifest format including token sets, modifiers, and permutation generation.

## Core Utilities

### Token Type Guards

```typescript
import { isToken, isTokenGroup } from '@upft/foundation';

// Safely identify tokens vs groups
if (isToken(value)) {
  console.log(value.$type); // TypeScript knows this is Token
}

if (isTokenGroup(value)) {
  console.log(Object.keys(value)); // TypeScript knows this is TokenGroup
}
```

Type guards that safely distinguish between individual tokens and token groups with full TypeScript support.

### Reference Extraction

```typescript
import { extractReferences } from '@upft/foundation';

const token = {
  $type: 'color',
  $value: 'hsl({hue.primary} {saturation.high} {lightness.medium})'
};

const refs = extractReferences(token);
// Returns: ['hue.primary', 'saturation.high', 'lightness.medium']
```

Extracts all DTCG reference paths from token values, handling both simple references and complex nested objects.

### Manifest Type Guards

```typescript
import { isUPFTManifest } from '@upft/foundation';

// Detect UPFT manifest format
if (isUPFTManifest(data)) {
  console.log(data.sets.length); // TypeScript knows this is UPFTResolverManifest
  console.log(Object.keys(data.modifiers));
}
```

Detects UPFT manifest format from unknown data with full TypeScript type narrowing.

## Validation Types

### Validation Results

```typescript
import type { ValidationResult } from '@upft/foundation';

// Standard validation structure
const result: ValidationResult = {
  valid: false,
  errors: [{
    message: 'Missing required $type property',
    path: 'colors.primary',
    severity: 'error'
  }],
  warnings: []
};
```

Standardized validation result format used across all validation operations with errors, warnings, and context paths.

## File I/O Interfaces

### File I/O Interfaces

```typescript
import type { TokenFileReader, TokenFile } from '@upft/foundation';

// Token file operations with metadata
const reader: TokenFileReader = {
  async readFile(path: string): Promise<TokenFile> {
    return {
      filePath: path,
      tokens: {},
      format: 'json',
      metadata: { references: new Set() }
    };
  }
};
```

Interface definitions for dependency injection, allowing custom file I/O implementations for testing and different environments.

## CLI Integration

### CLI Options

```typescript
import type { CLIOptions } from '@upft/foundation';

// Standard CLI configuration
const options: CLIOptions = {
  verbose: true,
  format: 'json',
  output: './dist'
};
```

Standardized option types for CLI commands with common flags and configuration.

## Integration Examples

### With Other Packages

```typescript
// Type-safe manifest processing
import type { UPFTResolverManifest } from '@upft/foundation';
import { isUPFTManifest } from '@upft/foundation';

if (isUPFTManifest(data)) {
  console.log(data.name); // Fully typed
}

// Validation integration
import type { ValidationResult } from '@upft/foundation';
const result: ValidationResult = validate(tokens);
```

Shared types ensure consistency across all packages in the UPFT ecosystem.

## Testing

```bash
pnpm --filter @upft/foundation test
```