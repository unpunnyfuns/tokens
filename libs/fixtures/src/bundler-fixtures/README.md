# Bundler Test Fixtures

This directory contains test fixtures for validating the UPFT bundler functionality. Each manifest tests specific bundling scenarios and behaviors.

## Test Scenarios

### 1. Simple Bundle (`simple-bundle.manifest.json`)

**What it tests:** Basic token merging from multiple files into a single output.

**Input files:**
- `colors-base.json` - Primitive color tokens
- `typography-base.json` - Typography tokens

**Expected behavior:**
- Merges all tokens into a single output file
- No token conflicts (different token paths)
- Output contains all tokens from both files

**Output:** `output/simple-bundle.json`

```json
{
  "color": { /* all color tokens */ },
  "typography": { /* all typography tokens */ }
}
```

---

### 2. Theme Bundle (`theme-bundle.manifest.json`)

**What it tests:** Modifier-based bundling with theme variants.

**Input files:**
- `colors-base.json` - Base color primitives
- `colors-semantic.json` - Semantic color references
- `theme-light.json` - Light theme overrides
- `theme-dark.json` - Dark theme overrides

**Expected behavior:**
- Generates separate bundles for each theme
- Theme-specific tokens override base tokens
- References remain unresolved (as strings)

**Outputs:**
- `output/theme-light.json` - Light theme bundle
- `output/theme-dark.json` - Dark theme bundle

**Key insight:** Later files in the merge order override earlier ones. Theme files loaded last can override semantic and base values.

---

### 3. Resolved References (`resolve-refs.manifest.json`)

**What it tests:** Reference resolution during bundling.

**Input files:**
- `colors-base.json` - Base colors with actual values
- `colors-semantic.json` - Semantic colors with references like `{color.primary}`

**Expected behavior:**
- When `resolveReferences: true`, replaces `{color.primary}` with actual color value
- Resolved tokens contain complete values, no references
- Output is self-contained and doesn't require runtime resolution

**Output:** `output/resolved-refs.json`

**Example transformation:**
```json
// Input (colors-semantic.json)
"background": { "$value": "{color.neutral.100}" }

// Output (resolved)
"background": { 
  "$value": {
    "colorSpace": "srgb",
    "components": [0.961, 0.961, 0.961],
    "alpha": 1
  }
}
```

---

### 4. Complex Merge (`complex-merge.manifest.json`)

**What it tests:** Multi-layer token composition with override behavior.

**Input files (in order):**
1. `colors-base.json` - Base color primitives
2. `spacing-base.json` - Base spacing values
3. `colors-semantic.json` - Semantic color references
4. `spacing-semantic.json` - Semantic spacing references
5. `colors-override.json` - Override for primary color (only in "override" theme)

**Expected behavior:**
- Base sets (1-4) are shared across all outputs
- Override modifier adds additional file that changes token values
- Tests merge precedence: last file wins for duplicate token paths

**Outputs:**
- `output/complex-default.json` - Without overrides
  - `color.primary` = blue (from base)
- `output/complex-override.json` - With override file
  - `color.primary` = red (from override)

**Key insight:** This demonstrates how the same base tokens can be shared across multiple outputs, with selective overrides per variant.

---

### 5. Complex Merge Resolved (`complex-merge-resolved.manifest.json`)

**What it tests:** Same as Complex Merge but with reference resolution enabled.

**Expected behavior:**
- All references resolved to actual values
- Override affects resolved references
- `color.brand` (which references `{color.primary}`) resolves to:
  - Blue in default output
  - Red in override output (following the override)

**Key insight:** Reference resolution happens AFTER merging, so references pick up overridden values correctly.

---

### 6. Multi-Output (`multi-output.manifest.json`)

**What it tests:** Multiple permutations with shared base sets.

**Configuration:**
- 2 themes (light, dark)
- 2 densities (comfortable, compact)
- = 4 total outputs

**Expected behavior:**
- Each output contains complete token set
- Base tokens duplicated in each output (current strategy)
- File size: ~249 lines per output (all contain same base)

**Current implementation:** Full bundle strategy
- ✅ Simple, self-contained outputs
- ❌ Duplicated base tokens across files

**Alternative strategies (documented in `/docs/bundling-strategies.md`):**
1. Layered output - Separate base from variant-specific tokens
2. Reference-only - Permutations only contain overrides
3. Build-time optimization - Generate both full and layered

---

### 7. Invalid References (`invalid-refs.manifest.json`)

**What it tests:** Error handling for invalid token references.

**Test cases:**
- Non-existent reference: `{color.nonexistent}`
- Circular references: `circular1` → `circular2` → `circular1`

**Expected behavior:**
- Bundling fails with clear error messages
- Identifies all problematic references
- Prevents infinite loops in circular references

**Error output:**
```
Reference resolution failed:
- color.invalid: Reference to non-existent token: {color.nonexistent}
- color.circular2: Circular reference detected
- color.circular1: Circular reference detected
```

---

## How the Bundler Works

### Merge Order
1. Load all base sets in order
2. Apply modifier-specific files
3. Later files override earlier ones for same token paths
4. If `resolveReferences: true`, resolve after merging

### Token Precedence
When the same token path exists in multiple files:
```
base.json:     color.primary = blue
override.json: color.primary = red
Result:        color.primary = red (last wins)
```

### Reference Resolution Timing
References are resolved AFTER all merging is complete:
1. Merge all files → Combined token set
2. Resolve references → Final output

This ensures references use the final, overridden values.

### Output Generation
For each permutation in the manifest:
1. Collect all relevant files (base + modifier-specific)
2. Merge tokens in order
3. Optionally resolve references
4. Write to specified output path

## Running Tests

```bash
# Run bundler fixture tests
npm run test:bundler

# Validate all outputs are valid DTCG
npm run validate:bundler-output

# Run all quality checks
npm run quality
```

## Adding New Test Cases

1. Create input files in `input/`
2. Create manifest file describing the scenario
3. Add expected output in `expected/` (for comparison tests)
4. Update this README with scenario description
5. Run tests to validate