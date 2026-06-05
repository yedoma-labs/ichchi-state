#!/bin/bash

# Create tags via GitHub API instead of git push
# Workaround for rule cache issues

set -e

REPO="yedoma-labs/ichchi-state"

echo "Creating tags via GitHub API..."
echo ""

# Get commit SHAs for tags
v010_sha=$(git rev-parse v0.1.0)
v020_sha=$(git rev-parse v0.2.0)

echo "v0.1.0 -> $v010_sha"
echo "v0.2.0 -> $v020_sha"
echo ""

# Create v0.1.0
echo "Creating v0.1.0..."
gh api repos/$REPO/git/refs -f ref='refs/tags/v0.1.0' -f sha="$v010_sha"

# Create v0.2.0
echo "Creating v0.2.0..."
gh api repos/$REPO/git/refs -f ref='refs/tags/v0.2.0' -f sha="$v020_sha"

echo ""
echo "✅ Tags created via API"
echo ""
echo "Verify: git ls-remote --tags origin"
