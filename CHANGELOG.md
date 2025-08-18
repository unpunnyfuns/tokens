# Changelog

## [Unreleased] - 2024-01-19

### Breaking Changes
- **Complete removal of deprecated classes** - All class-based APIs have been removed:
  - `TokenValidator` → use `validateTokenDocument()`
  - `ManifestValidator` → use `validateManifest()`  
  - `TokenBundler` → use `bundle()`
  - `ASTQuery` → use functional API from `ast/query.js`
  - `ReferenceResolver` → use `resolveReferences()`
- **Merge functions consolidated** - `mergeTokensPartial` and `mergeTokensSafe` removed, use `merge()` with options
- **Async functions made synchronous** - Functions that don't do I/O are no longer async:
  - `validateTokenDocument()` is now synchronous
  - `validateTokens()` is now synchronous
- **Renamed types for clarity**:
  - `BundleOptions` in bundler → `BundlerOptions`
  - `BundleOptions` in api → `ApiBundleOptions` (exported as `BundleOptions` for compatibility)

### Added
- New unified `merge()` function with comprehensive options
- Design decisions document (`API-DESIGN-DECISIONS.md`)
- Functional API for all operations

### Changed
- **Consistent function naming**:
  - `buildAST` → `createASTFromDocument`
  - `getTokensByType` → `findTokensByType`
  - `buildReferenceGraph` → `createReferenceGraph`
- **Module structure**:
  - Renamed `filesystem` module to `io`
  - Clean separation between high-level and core APIs
- **Export organization**:
  - Main export for high-level API
  - `public-core` export for advanced users
  - No deprecated exports

### Fixed
- Duplicate function names with different signatures
- Inconsistent async patterns
- Confusing type names
- Mixed class and functional exports

### Performance
- Removed unnecessary async overhead from validation functions
- More efficient functional APIs replace class instantiation

### Developer Experience
- Clearer, more predictable API
- Better TypeScript types
- Consistent naming conventions:
  - `get*` for single items
  - `find*` for arrays
  - `create*` for instantiation
  - `generate*` for output generation