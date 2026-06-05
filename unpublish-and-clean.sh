#!/bin/bash

# WARNING: This script will:
# - Unpublish ALL versions of @yedoma-labs/ichchi-state from npm
# - Delete ALL GitHub releases
# This is IRREVERSIBLE!

set -e

PACKAGE_NAME="@yedoma-labs/ichchi-state"
REPO_NAME="yedoma-labs/ichchi-state"

echo "⚠️  WARNING: This script will:"
echo "  1. Unpublish ALL versions of $PACKAGE_NAME from npm"
echo "  2. Delete ALL GitHub releases from $REPO_NAME"
echo ""
echo "This is IRREVERSIBLE!"
echo ""
read -p "Are you absolutely sure? Type 'yes' to continue: " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "=== Step 1: Unpublishing from npm ==="
echo ""

# Check if npm is logged in
if ! npm whoami &> /dev/null; then
    echo "❌ Not logged in to npm. Please run 'npm login' first."
    exit 1
fi

# Get all versions
echo "Fetching all published versions..."
versions=$(npm view "$PACKAGE_NAME" versions --json 2>/dev/null || echo "[]")

if [ "$versions" = "[]" ]; then
    echo "No versions found on npm (package may not exist or already unpublished)"
else
    echo "Found versions to unpublish:"
    echo "$versions" | jq -r '.[]'
    echo ""
    
    # Unpublish all versions (npm unpublish without version removes all)
    echo "Unpublishing package..."
    npm unpublish "$PACKAGE_NAME" --force
    echo "✅ Package unpublished from npm"
fi

echo ""
echo "=== Step 2: Deleting GitHub releases ==="
echo ""

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found. Install it first: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub. Please run 'gh auth login' first."
    exit 1
fi

# Get all releases
echo "Fetching all releases..."
releases=$(gh release list --repo "$REPO_NAME" --limit 1000 --json tagName --jq '.[].tagName' 2>/dev/null || echo "")

if [ -z "$releases" ]; then
    echo "No releases found on GitHub"
else
    echo "Found releases to delete:"
    echo "$releases"
    echo ""
    
    # Delete each release
    echo "$releases" | while read -r tag; do
        if [ -n "$tag" ]; then
            echo "Deleting release: $tag"
            gh release delete "$tag" --repo "$REPO_NAME" --yes --cleanup-tag
        fi
    done
    
    echo "✅ All GitHub releases deleted"
fi

echo ""
echo "=== Done! ==="
echo ""
echo "Next steps:"
echo "  1. Update git history with ./rewrite-committer.sh"
echo "  2. Force push: git push --force-with-lease origin main"
echo "  3. Force push tags: git push --force-with-lease --tags"
echo "  4. Republish to npm: npm publish"
echo "  5. Create new GitHub releases as needed"
