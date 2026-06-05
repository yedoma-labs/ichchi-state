# GitHub Workflows

This directory contains CI/CD workflows for the project.

## Workflows

### CI (`ci.yml`)

Runs on every push to `main` and all pull requests.

**Jobs:**

1. **test**: Runs tests on Node.js 20 and 22
   - Installs dependencies
   - Runs type checking
   - Runs test suite

2. **coverage**: Generates code coverage report
   - Runs tests with coverage
   - Uploads coverage to Codecov (optional)

3. **build**: Verifies the build process
   - Builds the package
   - Checks that all expected files are generated

### Release (`release.yml`)

Runs when a version tag (e.g., `v1.0.0`) is pushed.

**Steps:**
1. Runs type checking
2. Runs tests
3. Builds the package
4. Publishes to npm with provenance
5. Creates a GitHub release with generated notes

## Secrets Required

For the release workflow to work, you need to configure:

- **`NPM_TOKEN`**: npm access token with publish permissions
  - Create at https://www.npmjs.com/settings/YOUR_USERNAME/tokens
  - Add as repository secret: Settings → Secrets → Actions → New repository secret

## Creating a Release

1. Update version in `package.json`
2. Commit changes: `git commit -am "Release v1.0.0"`
3. Create and push tag: `git tag v1.0.0 && git push origin v1.0.0`
4. Workflow will automatically publish to npm and create GitHub release

## Local Testing

You can test the CI steps locally:

```bash
# Run the same checks as CI
npm ci --legacy-peer-deps
npm run typecheck
npm test
npm run build
```

## Troubleshooting

### Build Failures

- Check Node.js version (CI uses 20 and 22)
- Ensure all dependencies are committed in `package-lock.json`
- Run `npm ci --legacy-peer-deps` to match CI environment

### Test Failures

- Tests run in `happy-dom` environment
- Some browser APIs are mocked
- Check test output in Actions tab for details

### Publish Failures

- Verify `NPM_TOKEN` is set correctly
- Ensure version in `package.json` is higher than published version
- Check npm registry status
