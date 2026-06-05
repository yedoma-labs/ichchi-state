# Release Process

## Overview

ichchi-state uses automated releases via GitHub Actions when version tags are pushed.

**Important:** E2E tests (Playwright) are NOT run in CI and must be tested manually before releasing.

## Release Workflow

### 1. Update Version and Changelog

```bash
# Update version in package.json
npm version patch  # or minor, or major

# Update CHANGELOG.md with release notes
# Commit changes
git add package.json CHANGELOG.md
git commit -m "chore: prepare v0.1.1 release"
```

### 2. Create and Push Tag

```bash
# Create tag (should match version in package.json)
git tag v0.1.1

# Push commit and tag
git push origin main
git push origin v0.1.1
```

### 3. Run E2E Tests Manually

**Critical:** Always run E2E tests locally before pushing a release tag:

```bash
# Build the package
pnpm run build

# Run E2E tests
pnpm run e2e

# Verify all tests pass before proceeding
```

### 4. Automated Release Pipeline

When a tag matching `v*.*.*` is pushed, GitHub Actions automatically:

1. ✅ Runs type checking
2. ✅ Runs all unit/integration tests (258 tests)
3. ✅ Builds the package
4. ✅ Publishes to npm
5. ✅ Creates GitHub Release

**Note:** E2E tests are NOT run in CI. You must verify them manually (step 3).

**View progress:** https://github.com/yedoma-labs/ichchi-state/actions

### 5. Prerequisites

Before releasing, ensure:

- ✅ `NPM_TOKEN` secret is configured in GitHub repo settings
- ✅ All tests pass locally: `pnpm test`
- ✅ Build succeeds: `pnpm run build`
- ✅ Version in `package.json` matches the tag
- ✅ `CHANGELOG.md` is updated

## E2E Testing

E2E tests (Playwright) are **never** run in CI due to flakiness.

**You must run them manually before every release:**

```bash
# Build the package
pnpm run build

# Install Playwright browsers (first time only)
pnpm run e2e:install

# Run E2E tests
pnpm run e2e

# Run E2E tests with UI
pnpm run e2e:ui
```

## Troubleshooting

### NPM Publish Fails

1. Check `NPM_TOKEN` secret is valid: https://www.npmjs.com/settings/~/tokens
2. Ensure token has "Automation" type with publish permissions
3. Verify package name isn't taken: https://www.npmjs.com/package/@yedoma-labs/ichchi-state

### E2E Tests Fail Locally

E2E tests must pass before releasing. If they fail:

1. Run with UI for debugging: `pnpm run e2e:ui`
2. Check test files: `e2e/basic.spec.ts`
3. Verify examples work: `pnpm run demo` and test manually
4. Fix issues, then re-run: `pnpm run build && pnpm run e2e`

**Do not push release tag until E2E tests pass locally.**

### GitHub Release Creation Fails

The `actions/create-release@v1` action is deprecated. If it fails:

1. Manually create release: https://github.com/yedoma-labs/ichchi-state/releases/new
2. Select the tag
3. Copy changelog content as description
4. Publish

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backwards-compatible
- **PATCH** (0.0.1): Bug fixes, backwards-compatible

Current version: **0.1.0** (initial release)
