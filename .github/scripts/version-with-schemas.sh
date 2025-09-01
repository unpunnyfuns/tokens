#!/bin/bash
set -e

# Run changeset version to update package versions
echo "📦 Running changeset version..."
pnpm changeset version

# Check if any changes were made (particularly to schemas package)
if git diff --quiet HEAD -- libs/schemas/package.json; then
  echo "📝 No schema package version changes, skipping web schema rebuild"
else
  echo "📦 Schema package version changed, building web schemas..."
  cd libs/schemas
  pnpm build:web
  cd ../..
  
  # Stage the web schemas for the commit
  echo "📦 Staging web schemas for commit..."
  git add libs/schemas/dist-web
fi

echo "✅ Version bump and web schemas ready for commit"