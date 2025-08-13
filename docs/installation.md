# Installation

## Requirements

- Node.js 18 or higher
- npm or yarn

## Install as Project Dependency

```bash
npm install --save-dev @unpunnyfuns/tokens
```

or

```bash
yarn add -D @unpunnyfuns/tokens
```

## Development Installation

Clone and build for development:

```bash
git clone https://github.com/unpunnyfuns/tokens.git
cd tokens
npm install
npm run build
```

## Using the CLI

When installed as a dependency, the CLI is available as `upft`:

```bash
# Validate a token file
upft validate -f tokens.json

# Validate a resolver manifest
upft validate -m resolver.manifest.json

# Validate all token files in a directory
upft validate -d ./tokens
```

Or run directly with npx:

```bash
npx @unpunnyfuns/tokens validate -f tokens.json
```

For development from source:

```bash
npx tsx src/cli/cli.ts validate -f tokens.json
```

## Using as a Library

```javascript
import { TokenValidator, UPFTResolver, TokenBundler } from '@unpunnyfuns/tokens';
```

## Next Steps

- Read the [Quick Start](./quick-start.md) guide
- Learn about [Token Specification](./token-specification.md)
- Explore the [CLI Reference](./cli-reference.md)