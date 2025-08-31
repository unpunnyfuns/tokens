# Developer Experience

## Overview

Tools and integrations to improve the developer workflow when working with UPFT tokens.

## Dev Server

### Architecture

```typescript
interface DevServerConfig {
  port?: number;
  manifest: string;
  watch?: boolean;
  open?: boolean;
}

class DevServer {
  constructor(config: DevServerConfig) {}
  
  async start(): Promise<void> {
    // Start Express server
    // Setup WebSocket for live reload
    // Watch token files
    // Serve UI
  }
}
```

### Features

- Token browser UI
- Live reload on token changes
- Permutation switcher
- Export tools
- Validation panel
- Diff viewer

### API Endpoints

```typescript
// REST API
GET /api/tokens              // Get all tokens
GET /api/tokens/:path        // Get specific token
GET /api/manifest            // Get manifest
GET /api/permutations        // List all permutations
POST /api/resolve            // Resolve specific permutation
POST /api/validate           // Validate tokens
POST /api/transform          // Apply transforms
POST /api/format             // Generate formatted output

// WebSocket events
ws.on('token-changed')       // Token file changed
ws.on('manifest-changed')    // Manifest changed
ws.on('validation-error')    // Validation error
```

### UI Components

```
dev-server/ui/
├── App.tsx
├── pages/
│   ├── Browser.tsx         # Token browser
│   ├── Validator.tsx       # Validation results
│   ├── Transformer.tsx    # Transform playground
│   ├── Differ.tsx         # Diff viewer
│   └── Exporter.tsx       # Export tools
└── components/
    ├── TokenGrid.tsx
    ├── TokenDetail.tsx
    ├── PermutationSelector.tsx
    └── SearchBar.tsx
```

### CLI Command

```bash
# Start dev server
upft serve manifest.json

# With options
upft serve manifest.json --port 3000 --open

# Watch mode
upft serve manifest.json --watch
```

## VS Code Extension

### Features

1. **Token Autocomplete**
```typescript
// Provides autocomplete for token paths
const color = tokens.color.primary; // Autocomplete after 'color.'
```

2. **Hover Information**
```typescript
// Shows token value on hover
tokens.color.primary // Hover: "#007bff"
```

3. **Go to Definition**
```typescript
// Jump to token definition
// Ctrl+Click on token reference
```

4. **Color Decorators**
```typescript
// Shows color swatches in editor
tokens.color.primary // [■] #007bff
```

5. **Validation Diagnostics**
```typescript
// Shows errors/warnings inline
tokens.color.invalid // Error: Token not found
```

### Extension Structure

```
vscode-upft/
├── src/
│   ├── extension.ts
│   ├── providers/
│   │   ├── CompletionProvider.ts
│   │   ├── HoverProvider.ts
│   │   ├── DefinitionProvider.ts
│   │   └── ColorProvider.ts
│   ├── diagnostics/
│   │   └── TokenValidator.ts
│   └── commands/
│       ├── ValidateCommand.ts
│       └── TransformCommand.ts
├── package.json
└── language-configuration.json
```

### Configuration

```json
// .vscode/settings.json
{
  "upft.manifestPath": "./tokens/manifest.json",
  "upft.autoValidate": true,
  "upft.showColorDecorators": true,
  "upft.enableAutocomplete": true
}
```

## Build Tool Plugins

### Webpack Plugin

```javascript
// webpack.config.js
const { UPFTWebpackPlugin } = require('@unpunnyfuns/webpack-plugin');

module.exports = {
  plugins: [
    new UPFTWebpackPlugin({
      manifest: './tokens/manifest.json',
      platform: 'web',
      emitCSS: true,
      emitJSON: true
    })
  ]
};
```

### Vite Plugin

```javascript
// vite.config.js
import { upftPlugin } from '@unpunnyfuns/vite-plugin';

export default {
  plugins: [
    upftPlugin({
      manifest: './tokens/manifest.json',
      hot: true, // HMR for tokens
      inject: true // Auto-inject CSS variables
    })
  ]
};
```

### Rollup Plugin

```javascript
// rollup.config.js
import { upftRollup } from '@unpunnyfuns/rollup-plugin';

export default {
  plugins: [
    upftRollup({
      manifest: './tokens/manifest.json',
      formats: ['esm', 'cjs']
    })
  ]
};
```

### PostCSS Plugin

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('@unpunnyfuns/postcss-plugin')({
      tokens: './tokens/tokens.json',
      prefix: '--token'
    })
  ]
};
```

Usage in CSS:
```css
.button {
  background: token(color.primary);
  padding: token(spacing.medium);
}
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/tokens.yml
name: Token Validation

on:
  pull_request:
    paths:
      - 'tokens/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup UPFT
        uses: unpunnyfuns/setup-upft@v1
        
      - name: Validate Tokens
        run: upft validate tokens/manifest.json
        
      - name: Lint Tokens
        run: upft lint tokens/**/*.json
        
      - name: Build Platforms
        run: upft build tokens/manifest.json --all-platforms
        
      - name: Upload Artifacts
        uses: actions/upload-artifact@v2
        with:
          name: token-builds
          path: dist/
```

### Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: validate-tokens
        name: Validate Tokens
        entry: upft validate
        language: system
        files: tokens/.*\.json$
        
      - id: lint-tokens
        name: Lint Tokens
        entry: upft lint
        language: system
        files: tokens/.*\.json$
```

## Design Tool Integrations

### Figma Plugin (Future)

```typescript
// Basic structure for Figma plugin
interface FigmaSync {
  // Export tokens from Figma
  exportTokens(): Promise<TokenDocument>;
  
  // Import tokens to Figma
  importTokens(tokens: TokenDocument): Promise<void>;
  
  // Sync bidirectionally
  sync(options: SyncOptions): Promise<SyncResult>;
}
```

### Sketch Integration (Future)

```typescript
interface SketchIntegration {
  exportLibrary(): Promise<TokenDocument>;
  updateLibrary(tokens: TokenDocument): Promise<void>;
}
```

## Development Workflow

### Watch Mode

```bash
# Watch and rebuild on changes
upft build manifest.json --watch

# Watch with specific platforms
upft build manifest.json --watch --platform web,ios

# Watch with notifications
upft build manifest.json --watch --notify
```

### Debug Mode

```bash
# Verbose output
upft build manifest.json --verbose

# Debug transform pipeline
upft transform tokens.json --debug

# Profile performance
upft build manifest.json --profile
```

### REPL

```bash
# Interactive UPFT shell
upft repl

> load('./tokens.json')
> validate()
> transform('dimension/px-to-rem')
> format('css')
> save('./output.css')
```

## Testing Utilities

### Test Helpers

```typescript
import { createMockTokens, validateOutput } from '@unpunnyfuns/test-utils';

describe('Token Integration', () => {
  it('generates valid CSS', () => {
    const tokens = createMockTokens();
    const css = formatAsCSS(tokens);
    
    expect(validateOutput(css, 'css')).toBe(true);
  });
});
```

### Snapshot Testing

```typescript
import { tokenSnapshot } from '@unpunnyfuns/test-utils';

it('transforms correctly', () => {
  const result = transform(tokens, ['dimension/px-to-rem']);
  expect(result).toMatchTokenSnapshot();
});
```

## Performance Monitoring

```typescript
// Performance API
import { performance } from '@unpunnyfuns/tokens';

performance.mark('transform-start');
const transformed = await transform(tokens);
performance.mark('transform-end');

const measure = performance.measure('transform', 'transform-start', 'transform-end');
console.log(`Transform took ${measure.duration}ms`);
```

## Error Reporting

```typescript
// Enhanced error messages
class TokenError extends Error {
  constructor(
    message: string,
    public code: string,
    public path?: string,
    public suggestion?: string
  ) {
    super(message);
  }
}

// Usage
throw new TokenError(
  'Invalid color value',
  'INVALID_COLOR',
  'color.primary',
  'Use hex, rgb, or hsl format'
);
```