# API Design Decisions and Refactoring History

This document captures the major API design issues we identified and how we resolved them during the refactoring from a class-based to functional API.

## Refactoring Timeline

### Phase 1: Function Naming Standardization
**Status**: ✅ Completed

**Problem**: Inconsistent naming patterns made the API confusing
- Multiple functions with same name but different signatures
- Inconsistent use of get/find/build/create/generate prefixes
- No clear convention for when to use which prefix

**Solution**: Established clear naming conventions
- `get*` - Single item lookups (returns T | undefined)
- `find*` - Searches/filters that return arrays (returns T[])
- `create*` - Simple object instantiation/initialization
- `build*` - Complex construction from data (deprecated in favor of create)
- `generate*` - Producing output/permutations
- `load*` - Reading and parsing from filesystem
- `read*` - Raw I/O operations

**Changes Made**:
```typescript
// Before
buildAST() → createASTFromDocument()
buildASTFromFileSystem() → loadASTFromFileSystem()
getTokensByType() → findTokensByType()
buildReferenceGraph() → createReferenceGraph()
```

### Phase 2: Merge Function Consolidation
**Status**: ✅ Completed

**Problem**: Three separate merge functions with unclear use cases
- `mergeTokens` - Basic merge
- `mergeTokensPartial` - Partial merge with options
- `mergeTokensSafe` - Safe merge with conflicts

**Solution**: Single `merge()` function with options
```typescript
// Now we have:
merge(a, b, options?: MergeTokensOptions)
mergeTokens(a, b) // Simple wrapper, always safe

// Options control behavior:
interface MergeTokensOptions {
  include?: string[]     // Paths to include
  exclude?: string[]     // Paths to exclude  
  types?: string[]       // Token types to merge
  preferRight?: boolean  // Conflict resolution
  safe?: boolean        // Return conflicts vs throw
}
```

### Phase 3: Complete Deprecation Removal
**Status**: ✅ Completed

**Problem**: Deprecated classes still exported prominently
- `TokenValidator` class
- `ManifestValidator` class
- `ASTQuery` class
- `ReferenceResolver` class
- `TokenBundler` class

**Solution**: Removed all deprecated classes entirely
- No legacy exports
- Clean functional API only
- No backwards compatibility baggage

**Files Deleted**:
- `src/ast/ast-query.ts` and tests
- `src/ast/reference-resolver.ts` and tests
- `src/validation/validator.ts` and tests
- `src/validation/manifest-validator.ts`
- `src/bundler/bundler.ts` and tests

### Phase 4: Type Consolidation
**Status**: ✅ Completed

**Problem**: Confusing proliferation of similar types
- Multiple ValidationResult variants
- Duplicate BundleOptions interfaces
- Too many similar Options types

**Solution**: Clear type hierarchy
```typescript
// Validation types inherit from base
ValidationResult
  ├── ValidationResultWithStats
  │     └── TokenValidationResult
  └── ManifestValidationResult

// Renamed duplicate options
BundleOptions → BundlerOptions (bundler module)
BundleOptions → ApiBundleOptions (api module)
```

### Phase 5: Async Pattern Consistency
**Status**: ✅ Completed

**Problem**: Inconsistent use of async/await
- Some functions async without doing I/O
- Unclear when async is actually needed

**Solution**: Only async when doing actual I/O
```typescript
// Before (unnecessary async)
async function validateTokenDocument(doc): Promise<ValidationResult>

// After (synchronous - no I/O)
function validateTokenDocument(doc): ValidationResult
```

### Phase 6: Export Organization
**Status**: ✅ Completed

**Problem**: Messy exports with deprecated items
- Mixed functional and class exports
- Unclear what's public API vs internal

**Solution**: Clean, organized exports
- Main export (`src/index.ts`) - High-level API
- Core export (`src/public-core.ts`) - Advanced users
- No deprecated exports
- Clear module boundaries

## Current API Structure

### High-Level API (`@unpunnyfuns/tokens`)
For most users - simple, task-focused functions:
- `bundleWithMetadata()` - Bundle tokens with metadata
- `validateManifestWithPermutations()` - Validate manifests
- `mergeTokens()` - Safe token merging
- `formatTokens()` - Format for output

### Core API (`@unpunnyfuns/tokens/core`)
For advanced users - building tools and extensions:
- AST operations
- Reference resolution
- Path indexing
- Low-level validation

## Design Principles

1. **Functional First**: Pure functions over classes
2. **Predictable Naming**: Consistent prefixes with clear semantics
3. **Type Safety**: Leverage TypeScript fully
4. **No Surprises**: Functions do what their names suggest
5. **Progressive Disclosure**: Simple API for common tasks, core API for advanced use
6. **Clean Breaks**: No deprecated code in exports

## Migration Guide

### From Classes to Functions

```typescript
// Before
const validator = new TokenValidator()
await validator.validateDocument(doc)

// After  
import { validateTokenDocument } from '@unpunnyfuns/tokens'
validateTokenDocument(doc)
```

```typescript
// Before
const bundler = new TokenBundler(options)
await bundler.bundle(manifest)

// After
import { bundle } from '@unpunnyfuns/tokens'
bundle(manifest, options)
```

### From Multiple Merge Functions

```typescript
// Before
mergeTokensPartial(a, b, { includes: [...] })
mergeTokensSafe(a, b)

// After
merge(a, b, { include: [...] })
merge(a, b, { safe: true }) // default behavior
```

## Future Considerations

1. **Namespace Types**: Consider prefixing types to avoid conflicts (e.g., `DTCGToken` vs `Token`)
2. **Performance**: Add caching layer for validation schemas
3. **Error Messages**: Enhance with suggestions and fixes
4. **Testing Utilities**: Export test helpers as `@unpunnyfuns/tokens/testing`

## Lessons Learned

1. **Incremental Migration Works**: We successfully migrated from classes to functions while maintaining functionality
2. **Clear Conventions Matter**: Establishing get/find/create conventions immediately improved API clarity  
3. **Less is More**: Removing deprecated code and consolidating functions made the API more approachable
4. **Type Safety Helps**: TypeScript caught many issues during refactoring
5. **Tests Enable Confidence**: Comprehensive test suite allowed aggressive refactoring

---

*Last Updated: 2024-01-19*
*Original Issues Document Created: 2024-01-19*