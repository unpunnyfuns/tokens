# GitHub Actions Workflows

This project uses GitHub Actions for CI/CD. Here are the workflows:

## CI Workflow (`ci.yml`)

**Triggers:** On every push to main and on pull requests

**What it does:**

1. Runs linting and formatting checks (`npm run check`)
2. Runs unit tests (`npm run test:run`)
3. Validates all schema files (`npm run dev:schemas`)
4. Builds schemas and checks if dist/ is up to date
5. Validates example files against schemas

**Purpose:** Ensures code quality, tests pass, and schemas are valid

## Prepare Release Workflow (`release.yml`)

**Triggers:** Manual trigger with version selection (patch/minor/major)

**What it does:**

1. Runs quality checks
2. Bumps version in package.json
3. Rebuilds schemas with new version
4. Commits and tags the release
5. Creates GitHub release (without publishing to npm)

## Publish Workflow (`publish.yml`)

**Triggers:**

- Automatically when a GitHub release is published
- Manual trigger with tag selection

**What it does:**

1. Builds npm package
2. Verifies package contents
3. Publishes to npm

**Required Secrets:**

- `NPM_TOKEN` - For publishing to npm (get from npmjs.com)

## Deploy to Netlify (`deploy-netlify.yml`)

**Triggers:** Manual workflow dispatch only

**What it does:**

1. Sets up Node.js and installs dependencies
2. Builds schemas (`npm run build:schemas`)
3. Deploys the dist/ folder to Netlify
4. Makes schemas available at https://tokens.unpunny.fun

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

#### Prepare Release

1. Go to Actions tab
2. Select "Prepare Release" workflow
3. Click "Run workflow"
4. Choose version type (patch/minor/major)
5. Click "Run workflow"

This will:

- Run quality checks
- Bump version (0.1.0 → 0.1.1 for patch)
- Rebuild schemas with new version URLs
- Commit and push changes
- Create GitHub release (draft)

#### Publish to npm

1. Go to the Releases page
2. Find your draft release and click "Publish release"
3. This automatically triggers the publish workflow to push to npm

Or manually:

1. Go to Actions tab
2. Select "Publish to npm" workflow
3. Click "Run workflow"
4. Enter the tag (e.g., v1.0.0)
5. Click "Run workflow"
