# Plugin Architecture

## Overview

The plugin system allows extending UPFT with custom transforms, formatters, validators, and other functionality without modifying core code.

## Plugin Interface

```typescript
interface UPFTPlugin {
  name: string;
  version: string;
  register(api: PluginAPI): void | Promise<void>;
}

interface PluginAPI {
  addTransform(transform: Transform): void;
  addFormatter(formatter: Formatter): void;
  addValidator(validator: Validator): void;
  addLintRule(rule: LintRule): void;
  
  // Access to core utilities
  utils: {
    createAST: typeof createAST;
    resolveReferences: typeof resolveReferences;
    validateDocument: typeof validateDocument;
  };
  
  // Hook system
  hooks: {
    beforeTransform: Hook<TokenDocument>;
    afterTransform: Hook<TokenDocument>;
    beforeFormat: Hook<TokenDocument>;
    afterFormat: Hook<string>;
  };
}
```

## Plugin Types

### Transform Plugin

```typescript
const colorPlugin: UPFTPlugin = {
  name: 'upft-plugin-advanced-colors',
  version: '1.0.0',
  register(api) {
    api.addTransform({
      name: 'color/wcag-contrast',
      type: 'value',
      matcher: (token) => token.$type === 'color',
      transformer: (token, context) => ({
        ...token,
        $extensions: {
          wcag: calculateWCAGLevel(token.$value)
        }
      })
    });

    api.addTransform({
      name: 'color/palette-generate',
      type: 'value',
      transformer: (token) => generateColorScale(token)
    });
  }
};
```

### Formatter Plugin

```typescript
const tailwindPlugin: UPFTPlugin = {
  name: 'upft-plugin-tailwind',
  version: '1.0.0',
  register(api) {
    api.addFormatter({
      name: 'tailwind-config',
      extension: 'js',
      format: (tokens, config) => {
        return `module.exports = {
  theme: {
    extend: {
      colors: ${generateTailwindColors(tokens)},
      spacing: ${generateTailwindSpacing(tokens)}
    }
  }
}`;
      }
    });
  }
};
```

### Validator Plugin

```typescript
const a11yPlugin: UPFTPlugin = {
  name: 'upft-plugin-a11y',
  version: '1.0.0',
  register(api) {
    api.addValidator({
      name: 'a11y/contrast',
      validate: (tokens) => {
        const errors = [];
        for (const [path, token] of Object.entries(tokens)) {
          if (token.$type === 'color' && token.usage === 'text') {
            const contrast = calculateContrast(token.$value, backgroundColor);
            if (contrast < 4.5) {
              errors.push({
                path,
                message: `Insufficient contrast ratio: ${contrast}`
              });
            }
          }
        }
        return errors;
      }
    });
  }
};
```

## Plugin Loading

### Discovery

```typescript
class PluginLoader {
  private plugins = new Map<string, UPFTPlugin>();

  async loadFromPackage(packageName: string): Promise<void> {
    const plugin = await import(packageName);
    this.register(plugin.default || plugin);
  }

  async loadFromPath(filePath: string): Promise<void> {
    const plugin = await import(filePath);
    this.register(plugin.default || plugin);
  }

  async loadFromConfig(config: PluginConfig): Promise<void> {
    for (const pluginDef of config.plugins) {
      if (typeof pluginDef === 'string') {
        await this.loadFromPackage(pluginDef);
      } else {
        await this.loadFromPackage(pluginDef.package);
        // Apply plugin-specific config
        this.configurePlugin(pluginDef.package, pluginDef.options);
      }
    }
  }

  private register(plugin: UPFTPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }
}
```

### Configuration

```json
{
  "plugins": [
    "upft-plugin-tailwind",
    {
      "package": "upft-plugin-advanced-colors",
      "options": {
        "generateScales": true
      }
    },
    "./local-plugin.js"
  ]
}
```

## Plugin Development

### Plugin Template

```typescript
// my-plugin/index.ts
import type { UPFTPlugin } from '@unpunnyfuns/tokens';

const plugin: UPFTPlugin = {
  name: 'my-custom-plugin',
  version: '1.0.0',
  
  async register(api) {
    // Add transforms
    api.addTransform({
      name: 'custom/transform',
      type: 'value',
      transformer: (token) => token
    });

    // Add formatters
    api.addFormatter({
      name: 'custom-format',
      extension: 'custom',
      format: (tokens) => JSON.stringify(tokens)
    });

    // Use hooks
    api.hooks.beforeTransform.tap('my-plugin', (tokens) => {
      console.log('Before transform:', Object.keys(tokens).length);
      return tokens;
    });
  }
};

export default plugin;
```

### Plugin Utilities

```typescript
// Shared utilities for plugin developers
export const pluginUtils = {
  // Token traversal
  walkTokens(tokens: TokenDocument, visitor: (token: Token, path: string) => void): void;
  
  // Type checking
  isColorToken(token: Token): boolean;
  isDimensionToken(token: Token): boolean;
  
  // Value parsing
  parseColor(value: string): { r: number; g: number; b: number; a: number };
  parseDimension(value: string): { value: number; unit: string };
  
  // Common transforms
  lighten(color: string, amount: number): string;
  darken(color: string, amount: number): string;
  scale(value: number, factor: number): number;
};
```

## Hook System

```typescript
interface Hook<T> {
  tap(name: string, fn: (value: T) => T | Promise<T>): void;
  call(value: T): Promise<T>;
}

class HookManager {
  private hooks = new Map<string, Hook<any>>();

  create<T>(name: string): Hook<T> {
    const hook = new AsyncSeriesWaterfallHook<T>();
    this.hooks.set(name, hook);
    return hook;
  }

  get<T>(name: string): Hook<T> | undefined {
    return this.hooks.get(name);
  }
}

// Usage in plugins
api.hooks.beforeTransform.tap('my-plugin', async (tokens) => {
  // Modify tokens before transform
  return modifyTokens(tokens);
});
```

## Security

### Sandbox

Plugins run in a restricted environment:

```typescript
class PluginSandbox {
  private allowedModules = ['path', 'url', 'querystring'];
  
  async execute(plugin: UPFTPlugin, api: PluginAPI): Promise<void> {
    const sandboxedAPI = this.createSandboxedAPI(api);
    
    // Run plugin in isolated context
    const vm = new VM({
      sandbox: {
        require: this.createSecureRequire(),
        console: this.createSecureConsole(),
        process: { env: {} }
      }
    });
    
    await vm.run(plugin.register, sandboxedAPI);
  }
  
  private createSecureRequire() {
    return (module: string) => {
      if (!this.allowedModules.includes(module)) {
        throw new Error(`Module '${module}' is not allowed in plugins`);
      }
      return require(module);
    };
  }
}
```

### Validation

```typescript
function validatePlugin(plugin: unknown): plugin is UPFTPlugin {
  return (
    typeof plugin === 'object' &&
    plugin !== null &&
    'name' in plugin &&
    'version' in plugin &&
    'register' in plugin &&
    typeof plugin.register === 'function'
  );
}
```

## Testing Plugins

```typescript
import { createTestAPI } from '@unpunnyfuns/tokens/testing';

describe('My Plugin', () => {
  it('registers transforms', async () => {
    const api = createTestAPI();
    await myPlugin.register(api);
    
    expect(api.getTransform('custom/transform')).toBeDefined();
  });

  it('transforms tokens correctly', async () => {
    const api = createTestAPI();
    await myPlugin.register(api);
    
    const transform = api.getTransform('custom/transform');
    const result = transform.transformer(inputToken, context);
    
    expect(result).toMatchSnapshot();
  });
});
```

## Plugin Distribution

### Package Structure

```
my-upft-plugin/
├── package.json
├── README.md
├── src/
│   ├── index.ts
│   ├── transforms/
│   ├── formatters/
│   └── validators/
├── test/
└── dist/
```

### Package.json

```json
{
  "name": "upft-plugin-example",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["upft-plugin", "design-tokens"],
  "peerDependencies": {
    "@unpunnyfuns/tokens": "^1.0.0"
  }
}
```

## CLI Integration

```bash
# Install plugin
npm install upft-plugin-tailwind

# Use plugin
upft build manifest.json --plugin upft-plugin-tailwind

# Use local plugin
upft build manifest.json --plugin ./my-plugin.js

# With plugin options
upft build manifest.json --plugin tailwind --plugin-options '{"important": true}'
```