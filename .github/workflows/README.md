# GitHub Actions Workflows

This project uses GitHub Actions for CI/CD. Here are the workflows:

## CI Workflow (`ci.yml`)

**Triggers:** On every push to main and on pull requests

**What it does:**
1. Runs linting (`npm run check`)
2. Validates all schema files
3. Builds schemas and checks if dist/ is up to date
4. Validates example files

**Purpose:** Ensures code quality and that all schemas are valid

## Release Workflow (`release.yml`)

**Triggers:** Manual trigger with version selection (patch/minor/major)

**What it does:**
1. Bumps version in package.json
2. Rebuilds schemas with new version
3. Commits and tags the release
4. Publishes to npm
5. Creates GitHub release

**Required Secrets:**
- `NPM_TOKEN` - For publishing to npm (get from npmjs.com)

## Deploy to Netlify (`deploy-netlify.yml`)

**Triggers:** When dist/ or netlify.toml changes on main branch

**What it does:**
1. Deploys the dist/ folder to Netlify
2. Makes schemas available at https://tokens.unpunny.fun

**Required Secrets:**
- `NETLIFY_AUTH_TOKEN` - Personal access token from Netlify
- `NETLIFY_SITE_ID` - Your Netlify site ID

## Setting up Secrets

1. Go to Settings → Secrets and variables → Actions in your GitHub repo
2. Add the following repository secrets:
   - `NPM_TOKEN`: Get from npmjs.com → Access Tokens → Generate New Token (Automation type)
   - `NETLIFY_AUTH_TOKEN`: Get from Netlify → User Settings → Applications → Personal Access Tokens
   - `NETLIFY_SITE_ID`: Get from Netlify → Site Settings → General → Site ID

## Usage

### Making a Release

1. Go to Actions tab
2. Select "Release" workflow
3. Click "Run workflow"
4. Choose version type (patch/minor/major)
5. Click "Run workflow"

The workflow will:
- Bump version (0.1.0 → 0.1.1 for patch)
- Rebuild schemas with new version URLs
- Commit and push changes
- Publish to npm
- Create GitHub release
- Deploy to Netlify automatically (via the deploy workflow)