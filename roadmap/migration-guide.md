# Migration Guide

## From Style Dictionary

### Configuration Translation

Style Dictionary config:
```javascript
// config.js
module.exports = {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/',
      files: [{
        destination: 'tokens.css',
        format: 'css/variables'
      }]
    }
  }
};
```

UPFT equivalent:
```json
// manifest.json
{
  "sets": [
    { "values": ["tokens/**/*.json"] }
  ],
  "platforms": {
    "css": {
      "transforms": ["attribute/cti", "dimension/px-to-rem", "color/hex"],
      "buildPath": "dist/",
      "formats": [{
        "format": "css",
        "destination": "tokens.css",
        "options": { "selector": ":root" }
      }]
    }
  }
}
```

### Transform Migration

```javascript
// Style Dictionary transform
StyleDictionary.registerTransform({
  name: 'color/hex8',
  type: 'value',
  matcher: (token) => token.attributes.category === 'color',
  transformer: (token) => token.value + 'FF'
});

// UPFT equivalent
const transform: Transform = {
  name: 'color/hex8',
  type: 'value',
  matcher: (token) => token.$type === 'color',
  transformer: (token) => ({
    ...token,
    $value: token.$value + 'FF'
  })
};
```

### Format Migration

```javascript
// Style Dictionary format
StyleDictionary.registerFormat({
  name: 'custom/format',
  formatter: ({ dictionary }) => {
    return dictionary.allTokens.map(token => 
      `--${token.name}: ${token.value};`
    ).join('\n');
  }
});

// UPFT equivalent
const formatter: Formatter = {
  name: 'custom/format',
  extension: 'css',
  format: (tokens) => {
    return Object.entries(tokens)
      .map(([name, token]) => `--${name}: ${token.$value};`)
      .join('\n');
  }
};
```

### Token Structure

Style Dictionary tokens:
```json
{
  "color": {
    "primary": {
      "value": "#007bff",
      "type": "color"
    }
  }
}
```

UPFT tokens (DTCG format):
```json
{
  "color": {
    "primary": {
      "$value": "#007bff",
      "$type": "color"
    }
  }
}
```

### Migration Script

```typescript
// migrate-from-style-dictionary.ts
import { migrateTokens } from '@unpunnyfuns/tokens/migration';

// Convert token format
const upftTokens = migrateTokens(styleDictionaryTokens, {
  from: 'style-dictionary',
  to: 'dtcg'
});

// Convert config
const upftManifest = migrateConfig(styleDictionaryConfig, {
  from: 'style-dictionary',
  to: 'upft'
});
```

## From Terrazzo

### Configuration

Terrazzo config:
```javascript
// terrazzo.config.js
export default {
  tokens: './tokens.json',
  plugins: [
    '@terrazzo/plugin-css',
    '@terrazzo/plugin-swift'
  ],
  output: {
    css: { filename: 'tokens.css' },
    swift: { filename: 'Tokens.swift' }
  }
};
```

UPFT equivalent:
```json
{
  "sets": [
    { "values": ["./tokens.json"] }
  ],
  "plugins": [
    "upft-plugin-css",
    "upft-plugin-swift"
  ],
  "platforms": {
    "web": {
      "formats": [{
        "format": "css",
        "destination": "tokens.css"
      }]
    },
    "ios": {
      "formats": [{
        "format": "swift",
        "destination": "Tokens.swift"
      }]
    }
  }
}
```

### Plugin Migration

```javascript
// Terrazzo plugin
export default {
  name: 'my-plugin',
  transform(token) {
    return { ...token, value: token.value.toUpperCase() };
  }
};

// UPFT plugin
const plugin: UPFTPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  register(api) {
    api.addTransform({
      name: 'my-transform',
      type: 'value',
      transformer: (token) => ({
        ...token,
        $value: token.$value.toUpperCase()
      })
    });
  }
};
```

## From Theo

### Token Conversion

Theo tokens:
```yaml
# tokens.yml
props:
  color_primary:
    value: "#007bff"
    type: color
    category: color
```

UPFT tokens:
```json
{
  "color": {
    "primary": {
      "$value": "#007bff",
      "$type": "color"
    }
  }
}
```

### Build Process

Theo:
```bash
theo tokens.yml --transform web --format css
```

UPFT:
```bash
upft build manifest.json --platform web
```

## From Custom Solutions

### Common Patterns

1. **JSON to DTCG**
```typescript
function convertToDTO(customTokens: any): TokenDocument {
  const converted: TokenDocument = {};
  
  for (const [key, value] of Object.entries(customTokens)) {
    converted[key] = {
      $value: value.value || value,
      $type: value.type || inferType(value),
      $description: value.description
    };
  }
  
  return converted;
}
```

2. **Build Script Migration**
```typescript
// Old build script
const tokens = JSON.parse(fs.readFileSync('tokens.json'));
const css = generateCSS(tokens);
fs.writeFileSync('tokens.css', css);

// UPFT replacement
import { bundle } from '@unpunnyfuns/tokens';

await bundle({
  manifest: './manifest.json',
  platform: 'web'
});
```

## Compatibility Layers

### Style Dictionary Compatibility

```typescript
// style-dictionary-compat.ts
import { createCompatibilityLayer } from '@unpunnyfuns/tokens/compat';

const compat = createCompatibilityLayer('style-dictionary');

// Use Style Dictionary API with UPFT
compat.registerTransform(sdTransform);
compat.registerFormat(sdFormat);
compat.buildAllPlatforms();
```

### Gradual Migration

```typescript
// Run both systems in parallel
async function build() {
  // Existing Style Dictionary build
  await StyleDictionary.buildAllPlatforms();
  
  // New UPFT build
  await upft.build('./manifest.json');
  
  // Compare outputs
  const diff = await compareOutputs('./dist-sd', './dist-upft');
  console.log('Differences:', diff);
}
```

## Migration Checklist

### Pre-Migration
- [ ] Audit current token structure
- [ ] Document custom transforms
- [ ] List required output formats
- [ ] Identify platform requirements
- [ ] Plan migration phases

### Phase 1: Setup
- [ ] Install UPFT
- [ ] Convert tokens to DTCG format
- [ ] Create manifest.json
- [ ] Set up basic configuration

### Phase 2: Transforms
- [ ] Migrate custom transforms
- [ ] Test transform pipeline
- [ ] Verify output correctness

### Phase 3: Formats
- [ ] Configure output formats
- [ ] Set up platform builds
- [ ] Validate generated files

### Phase 4: Integration
- [ ] Update build scripts
- [ ] Configure CI/CD
- [ ] Update documentation
- [ ] Train team

### Post-Migration
- [ ] Remove old tool dependencies
- [ ] Clean up legacy code
- [ ] Performance comparison
- [ ] Gather feedback

## Common Issues

### Issue: Token format differences
**Solution:** Use migration script or manual conversion

### Issue: Missing transforms
**Solution:** Create custom transforms or wait for built-in support

### Issue: Output format differences
**Solution:** Adjust formatter options or create custom formatter

### Issue: Build process changes
**Solution:** Update CI/CD scripts and documentation

## Support Resources

- Migration scripts: `@unpunnyfuns/tokens/migration`
- Compatibility layers: `@unpunnyfuns/tokens/compat`
- Documentation: https://upft.dev/migration
- Community: Discord/GitHub Discussions