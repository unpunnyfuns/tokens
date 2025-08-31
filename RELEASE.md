# UPFT Release Procedures

This guide covers how to release packages in the UPFT monorepo. Follow these procedures to ensure smooth, predictable releases.

## Quick Reference

| Action | Command | When to Use |
|--------|---------|-------------|
| Add changeset | `pnpm changeset` | After any change that affects users |
| Check status | `pnpm changeset status` | See what will be released |
| Version packages | `pnpm changeset version` | Prepare for release (creates version PR) |
| Publish packages | `pnpm changeset publish` | Actually publish to NPM (CI handles this) |

## Release Types

### 🔄 **Automatic Release** (Recommended)
1. **Make changes** to packages
2. **Add changeset** before merging PR
3. **Merge to main** → CI creates version PR or publishes
4. **Done!**

### 🚀 **Manual Release** (Emergency)
1. **Add changeset** if not already done
2. **Run manual publish workflow** in GitHub Actions
3. **Monitor results**

---

## Step-by-Step Procedures

### 1. Adding a Changeset

**When:** After making any user-facing changes to a package.

```bash
# Add a changeset for your changes
pnpm changeset
```

**The interactive prompts will ask:**

1. **Which packages changed?** 
   - Use space to select, enter to confirm
   - Select all packages that users will notice changes in

2. **What type of change?**
   - **patch** (0.1.0 → 0.1.1) - Bug fixes, documentation
   - **minor** (0.1.0 → 0.2.0) - New features, backwards compatible
   - **major** (0.1.0 → 1.0.0) - Breaking changes

3. **Description:**
   - Write a clear, user-facing description
   - This becomes the changelog entry
   - Good: "Add support for CSS custom properties in tokens"
   - Bad: "Fix stuff" or "Update code"

**Example Changeset Flow:**
```bash
$ pnpm changeset

🦋  Which packages would you like to include?
◯ @upft/analysis
◯ @upft/ast
◯ @upft/bundler
◉ @upft/cli        # ← You added a new command
◯ @upft/foundation
◯ @upft/loader
◯ @upft/schemas

🦋  What type of change is this for @upft/cli?
◯ patch
◉ minor            # ← New feature
◯ major

🦋  Please enter a summary for this change:
Add 'upft init' command for project scaffolding
```

This creates a file like `.changeset/green-trains-wave.md`:
```md
---
"@upft/cli": minor
---

Add 'upft init' command for project scaffolding
```

### 2. Checking Release Status

**When:** Before releasing, to see what will happen.

```bash
# See what packages will be released and their new versions
pnpm changeset status

# See detailed changelog preview
pnpm changeset status --verbose
```

**Example Output:**
```
🦋  The following packages are included in this release:
🦋  @upft/cli: 0.1.2 => 0.2.0 (minor)
🦋  @upft/foundation: 0.1.0 => 0.1.1 (patch)

🦋  Note: You are in a prerelease mode (beta).
🦋  The following packages will be released:
🦋  @upft/cli@0.2.0-beta.0
🦋  @upft/foundation@0.1.1-beta.0
```

### 3. Automatic Release Process

**The Normal Flow:**

1. **Create PR with changes + changeset**
2. **Merge PR to main**
3. **CI runs automatically:**
   - If changesets exist → Creates "Version Packages" PR
   - If no changesets → No version PR created
4. **Review and merge Version PR**
   - CI automatically publishes to NPM
   - Creates GitHub releases
   - Updates CHANGELOGs

**What the Version PR looks like:**
- Title: "Version Packages"
- Updates `package.json` versions
- Updates `CHANGELOG.md` files
- Removes consumed changesets

**After merging Version PR:**
- Packages automatically publish to NPM
- GitHub releases created for each published package
- Each release includes the relevant changelog section
- Release tags follow format: `@upft/package@version`
- **Schemas deployed to Netlify** if @upft/schemas was updated

### 4. Manual Release Process

**When to use:**
- CI is broken
- Emergency hotfix needed
- Testing release process

**Steps:**

1. **Ensure changesets exist:**
   ```bash
   pnpm changeset status
   ```

2. **Go to GitHub Actions:**
   - Navigate to Actions tab
   - Select "Manual Publish" workflow
   - Click "Run workflow"

3. **Configure the run:**
   - **Packages:** Leave empty for all, or specify like "@upft/cli,@upft/foundation"
   - **Dry run:** ✅ Check this first to test
   - Click "Run workflow"

4. **Review dry run results:**
   - Check the workflow output
   - Verify versions and changelogs look correct

5. **Run for real:**
   - Run workflow again with "Dry run" ❌ unchecked
   - Monitor the workflow execution

---

## GitHub Releases

### **Automatic Release Creation**

When packages are published via the automated workflow:

1. **Individual releases** are created for each published package
2. **Release tags** follow the format: `@upft/package@version`
   - Example: `@upft/cli@1.2.0`, `@upft/foundation@0.5.1`
3. **Release notes** are extracted from the package's CHANGELOG.md
4. **Assets** include the source code at that point

### **Release Organization**

- **Per-package releases** - Each package gets its own GitHub release
- **Independent versioning** - Packages can be at different versions
- **Changelog integration** - Release notes pulled from CHANGELOG.md files
- **Chronological listing** - Releases appear in the order they're published

### **Finding Releases**

```bash
# Latest release for a specific package
https://github.com/your-org/upft/releases/tag/@upft/cli@latest

# All releases
https://github.com/your-org/upft/releases

# Specific version
https://github.com/your-org/upft/releases/tag/@upft/foundation@1.0.0
```

### **Manual Release Creation**

If you need to create a GitHub release manually:

```bash
# Create a release using GitHub CLI
gh release create @upft/cli@1.2.0 \
  --title "@upft/cli 1.2.0" \
  --notes "Release notes here" \
  --latest=false

# Or use the GitHub web interface
# Go to: Releases → Create a new release
```

---

## Schema Deployment

### **Automatic Schema Deployment**

When `@upft/schemas` is published, schemas are automatically deployed to `https://tokens.unpunny.fun`:

1. **Version-specific URLs** are created:
   ```
   https://tokens.unpunny.fun/schemas/v1.2.0/tokens/base.schema.json
   https://tokens.unpunny.fun/schemas/v1.2.0/manifest.schema.json
   ```

2. **Latest version** is updated:
   ```
   https://tokens.unpunny.fun/schemas/latest/tokens/base.schema.json
   ```

3. **All previous versions remain available** for backwards compatibility

### **Schema URL Structure**

```
https://tokens.unpunny.fun/schemas/{version}/{schema-type}

# Examples:
https://tokens.unpunny.fun/schemas/v1.0.0/tokens/base.schema.json
https://tokens.unpunny.fun/schemas/v1.0.0/tokens/full.schema.json
https://tokens.unpunny.fun/schemas/v1.0.0/tokens/types/color.schema.json
https://tokens.unpunny.fun/schemas/v1.0.0/manifest.schema.json
https://tokens.unpunny.fun/schemas/latest/tokens/base.schema.json
```

### **Manual Schema Deployment**

If you need to deploy schemas manually:

1. **Build schemas for web:**
   ```bash
   cd libs/schemas
   pnpm run build
   # This creates dist-web/ directory
   ```

2. **Deploy using GitHub Actions:**
   - Go to Actions → "Deploy to Netlify"
   - Click "Run workflow"
   - Monitor deployment

3. **Or deploy locally (if you have Netlify CLI):**
   ```bash
   cd libs/schemas
   netlify deploy --prod --dir=dist-web
   ```

### **Verifying Schema Deployment**

After schema release:

- [ ] **Version-specific URLs work:**
  ```bash
  curl https://tokens.unpunny.fun/schemas/v1.2.0/tokens/base.schema.json
  ```

- [ ] **Latest URLs updated:**
  ```bash
  curl https://tokens.unpunny.fun/schemas/latest/tokens/base.schema.json
  ```

- [ ] **Schema validation works:**
  ```bash
  # Test with a token file
  ajv validate -s https://tokens.unpunny.fun/schemas/latest/tokens/full.schema.json -d my-tokens.json
  ```

- [ ] **Previous versions still work:**
  ```bash
  curl https://tokens.unpunny.fun/schemas/v1.1.0/tokens/base.schema.json
  ```

---

## Package-Specific Release Guidelines

### 📦 **@upft/foundation** (Core Utilities)
- **Stability:** HIGH - Breaking changes require careful consideration
- **Versioning:** Conservative - prefer patches and minors
- **Testing:** Full test suite must pass
- **Dependencies:** Check impact on all other packages

### 🗂️ **@upft/schemas** (JSON Schemas)  
- **Stability:** HIGH - Schema changes affect all users
- **Versioning:** Breaking schema changes = major version
- **Testing:** Validate against example files
- **Dependencies:** Update schema URLs in documentation
- **Deployment:** Automatically deployed to https://tokens.unpunny.fun when published
- **URL Structure:** `https://tokens.unpunny.fun/schemas/v{version}/tokens/base.schema.json`

### 🌳 **@upft/ast** (AST Processing)
- **Stability:** MEDIUM - Internal APIs can change more freely
- **Versioning:** API changes = minor, breaking changes = major  
- **Testing:** Verify with real-world token files
- **Dependencies:** Coordinate with loader and bundler

### 📦 **@upft/bundler** (Bundle Generation)
- **Stability:** MEDIUM - Output format stability important
- **Versioning:** Output changes = minor, API changes = major
- **Testing:** Test against example manifests
- **Dependencies:** Check CLI integration

### 📂 **@upft/loader** (File Loading)
- **Stability:** MEDIUM - Performance and API stability focus
- **Versioning:** Performance improvements = patch, API changes = minor
- **Testing:** Test with various file structures
- **Dependencies:** Core dependency for AST and bundler

### 🖥️ **@upft/cli** (Command Line Tool)
- **Stability:** HIGH - User-facing API must be stable
- **Versioning:** New commands = minor, breaking CLI changes = major
- **Testing:** Test all commands and help output
- **Dependencies:** End-user impact is highest

---

## Emergency Procedures

### 🚨 **Hotfix Release**

**When:** Critical bug needs immediate fix.

1. **Create hotfix branch:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-issue
   ```

2. **Make minimal fix and add changeset:**
   ```bash
   # Make your fix
   pnpm changeset  # Select patch version
   git add .
   git commit -m "fix: critical issue description"
   ```

3. **Push and create PR:**
   ```bash
   git push origin hotfix/critical-issue
   # Create PR to main
   ```

4. **Use manual release if CI is slow:**
   - Merge PR
   - Run "Manual Publish" workflow immediately
   - Monitor npm and verify fix is available

### 🔄 **Rollback Release**

**If a release has issues:**

1. **Identify problematic version:**
   ```bash
   npm view @upft/cli versions --json
   ```

2. **Deprecate bad version:**
   ```bash
   npm deprecate @upft/cli@1.2.0 "Contains critical bug, use 1.1.0 or 1.2.1+"
   ```

3. **Release fix version:**
   - Follow hotfix procedure above
   - Bump to next patch version
   - Include fix and changelog noting the issue

### 🐛 **Failed Release Recovery**

**If CI fails during release:**

1. **Check workflow logs in GitHub Actions**
2. **Common issues:**
   - NPM token expired → Update `NPM_TOKEN` secret
   - Network timeout → Re-run workflow
   - Version conflict → Check if version already exists on NPM

3. **Manual recovery:**
   ```bash
   # If version PR was created but publish failed
   git checkout main
   git pull origin main
   pnpm changeset publish  # Publish manually
   ```

---

## Verification Checklist

After any release, verify:

- [ ] **NPM packages published:**
  ```bash
  npm view @upft/cli version
  npm view @upft/foundation version
  # Check all released packages
  ```

- [ ] **GitHub releases created:**
  - Check https://github.com/your-org/upft/releases
  - Verify one release per published package
  - Verify changelog entries are correct
  - Release tags should be `@upft/package@version` format

- [ ] **Installation works:**
  ```bash
  npm install -g @upft/cli@latest
  upft --version  # Should show new version
  ```

- [ ] **Dependencies updated:**
  - Check if any packages depend on updated packages
  - Verify internal version constraints are satisfied

- [ ] **Documentation updated:**
  - README versions if referenced
  - API documentation if changed
  - Migration guides if breaking changes

---

## Troubleshooting

### "No changesets found"
- You forgot to add a changeset
- Run `pnpm changeset` and try again

### "Version already exists on NPM"  
- Another release happened simultaneously
- Check NPM for the existing version
- May need to bump version manually and re-release

### "Publish failed with 401"
- NPM token expired or invalid
- Update `NPM_TOKEN` in GitHub secrets
- Re-run the workflow

### "Cannot find package"
- Package may not be published yet
- Check NPM registry: `npm view @upft/package-name`
- Verify package name is correct in package.json

### "Dependency version mismatch"
- Internal packages may be out of sync
- Run `pnpm changeset version` to update dependents
- Check workspace version constraints

---

## Best Practices

### 📝 **Changeset Messages**
- Write for users, not developers
- Focus on impact, not implementation
- Use imperative mood: "Add support for..." not "Added support for..."
- Include context: "Fix token resolution in nested groups" not "Fix bug"

### 🏷️ **Version Selection**
- **Patch (0.1.0 → 0.1.1):** Bug fixes, docs, internal changes
- **Minor (0.1.0 → 0.2.0):** New features, new CLI commands, new APIs
- **Major (0.1.0 → 1.0.0):** Breaking changes, removed APIs, changed behavior

### ⏰ **Release Timing**
- Avoid Friday releases (weekend incident response)
- Release early in your day (time to monitor)
- Coordinate with team for major releases
- Consider user timezones for critical updates

### 🧪 **Pre-release Testing**
- Always run `pnpm changeset status` first
- Test installation: `npm install @upft/cli@beta`
- Use prerelease versions for testing: `pnpm changeset pre enter beta`
- Exit prerelease mode: `pnpm changeset pre exit`

---

## Quick Commands Reference

```bash
# Development
pnpm changeset                    # Add changeset
pnpm changeset status            # Check what will release
pnpm changeset version           # Create version PR locally

# Publishing  
pnpm changeset publish           # Publish to NPM (usually CI does this)

# Prerelease
pnpm changeset pre enter beta    # Enter prerelease mode
pnpm changeset pre exit          # Exit prerelease mode

# Utilities
pnpm changeset add               # Add changeset (alternative)
npm view @upft/cli versions      # Check NPM versions
npm deprecate @upft/cli@1.0.0    # Deprecate a version
```

---

**Remember:** When in doubt, ask the team or check the changeset docs at https://github.com/changesets/changesets