# Utils

Utility functions for logging and token manipulation that are pending refactoring into their respective domain modules. This temporary module contains cross-cutting concerns that will be redistributed to maintain proper module boundaries, with logging utilities moving to a dedicated diagnostics module and token helpers being absorbed into the core module.

## Table of Contents

- [Overview](#overview)
- [Structure](#structure)
- [Logger](#logger)
- [Token Helpers](#token-helpers)
- [Testing Utilities](#testing-utilities)
- [Performance](#performance)
- [Design Principles](#design-principles)
- [Refactoring Plan](#refactoring-plan)

## Overview

**Note: This module is scheduled for refactoring. The utilities here will be moved to their appropriate domain modules to maintain proper architectural boundaries.**

The utils module currently serves as a temporary home for cross-cutting utilities that don't yet have a proper domain module. The logger utilities provide consistent console output with color support and verbosity control, while the token helpers offer convenience functions for common token manipulations. These functions are used throughout the codebase but violate the principle of domain cohesion by being grouped by function type rather than business domain.

The planned refactoring will distribute these utilities to their logical homes: logging will move to a dedicated diagnostics or observability module that can grow to include metrics and tracing, while token manipulation functions will be absorbed into the core module where they naturally belong with other token operations.

## Structure

| File | Purpose |
|------|---------|
| `logger.ts` | Logging utilities with color support |
| `token-helpers.ts` | Token manipulation helpers |

## Logger

Console logging with color support and verbosity control.

### Functions

```typescript
import { 
  log, 
  error, 
  warn, 
  success, 
  info, 
  debug,
  setVerbosity 
} from './utils/logger';

// Set verbosity level
setVerbosity('debug'); // 'silent' | 'error' | 'warn' | 'info' | 'debug'

// Log messages with colors
success('✓ Operation completed');
error('✗ Operation failed');
warn('⚠ Warning message');
info('ℹ Information');
debug('🔍 Debug details');
```

### Color Support

```typescript
import { colors } from './utils/logger';

console.log(colors.green('Success'));
console.log(colors.red('Error'));
console.log(colors.yellow('Warning'));
console.log(colors.blue('Info'));
console.log(colors.gray('Debug'));
```

### Verbosity Levels

| Level | Shows |
|-------|-------|
| `silent` | Nothing |
| `error` | Errors only |
| `warn` | Errors and warnings |
| `info` | Errors, warnings, and info |
| `debug` | Everything |

## Token Helpers

Utility functions for working with tokens.

### flattenTokens

Flattens nested token structure to dot-notation paths.

```typescript
import { flattenTokens } from './utils/token-helpers';

const nested = {
  color: {
    primary: {
      $value: '#007acc',
      $type: 'color'
    }
  }
};

const flat = flattenTokens(nested);
// { 'color.primary': { $value: '#007acc', $type: 'color' } }
```

### expandTokens

Expands flat tokens back to nested structure.

```typescript
import { expandTokens } from './utils/token-helpers';

const flat = {
  'color.primary': { $value: '#007acc', $type: 'color' }
};

const nested = expandTokens(flat);
// { color: { primary: { $value: '#007acc', $type: 'color' } } }
```

### filterTokensByType

Filters tokens by their type.

```typescript
import { filterTokensByType } from './utils/token-helpers';

const tokens = {
  color: { primary: { $value: '#007acc', $type: 'color' } },
  spacing: { small: { $value: '4px', $type: 'dimension' } }
};

const colors = filterTokensByType(tokens, 'color');
// { color: { primary: { $value: '#007acc', $type: 'color' } } }
```

### getTokenPaths

Gets all token paths from a document.

```typescript
import { getTokenPaths } from './utils/token-helpers';

const paths = getTokenPaths(tokenDocument);
// ['color.primary', 'color.secondary', 'spacing.small', ...]
```

### resolveTokenValue

Resolves a token's effective value, following references.

```typescript
import { resolveTokenValue } from './utils/token-helpers';

const value = resolveTokenValue(token, tokenDocument);
// Returns resolved value or original if no references
```

## Testing Utilities

Helper functions for tests.

```typescript
import { 
  createMockToken, 
  createMockDocument 
} from './utils/test-helpers';

const token = createMockToken('color', '#007acc');
const document = createMockDocument({
  'color.primary': token
});
```

## Performance

| Operation | Complexity |
|-----------|------------|
| flattenTokens | O(n) where n = total tokens |
| expandTokens | O(n) where n = total tokens |
| filterTokensByType | O(n) where n = total tokens |
| getTokenPaths | O(n) where n = total tokens |

## Design Principles

1. **Pure functions** - No side effects except logging
2. **Type safety** - Full TypeScript support
3. **No dependencies** - Uses only Node.js built-ins
4. **Tree-shakeable** - Import only what you need
5. **Test helpers** - Utilities for testing

## Refactoring Plan

The refactoring of this module is planned as follows:

### Logger → Diagnostics Module
The logging utilities will move to a new diagnostics module that can evolve to include:
- Structured logging with log levels
- Metrics collection for performance monitoring
- Tracing for debugging complex operations
- Error reporting with stack trace enhancement
- Debug output with namespace filtering

### Token Helpers → Core Module
The token manipulation functions naturally belong in the core module alongside other token operations:
- `flattenTokens` and `expandTokens` complement the path operations already in core
- `filterTokensByType` duplicates functionality better served by the AST module
- `getTokenPaths` is redundant with core's `getAllPaths`
- `resolveTokenValue` belongs with the references module

### Testing Utilities → Test Infrastructure
Test helpers should move to a dedicated test infrastructure package or test utilities directory:
- Mock creation functions can be centralized for all tests
- Test fixtures can be properly typed and validated
- Common test patterns can be abstracted into reusable utilities

This refactoring will improve code organization, reduce duplication, and make the codebase more maintainable by ensuring each module has a clear, focused responsibility.