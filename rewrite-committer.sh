#!/bin/bash

# WARNING: This script rewrites git history!
# Only run this if you understand the consequences.
# If the repository has been pushed, you'll need to force-push after running this.

set -e

COMMITTER_NAME="yedoma-labs"
COMMITTER_EMAIL="yedoma-labs@proton.me"

echo "⚠️  WARNING: This will rewrite ALL commits in your git history!"
echo "Committer info will be set to:"
echo "  Name:  $COMMITTER_NAME"
echo "  Email: $COMMITTER_EMAIL"
echo ""
echo "This will:"
echo "  - Change both author and committer info for all commits"
echo "  - Require force-push if already pushed to remote"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Starting rewrite..."

git filter-branch --env-filter '
export GIT_AUTHOR_NAME="'"$COMMITTER_NAME"'"
export GIT_AUTHOR_EMAIL="'"$COMMITTER_EMAIL"'"
export GIT_COMMITTER_NAME="'"$COMMITTER_NAME"'"
export GIT_COMMITTER_EMAIL="'"$COMMITTER_EMAIL"'"
' --tag-name-filter cat -- --branches --tags

echo ""
echo "✅ Done! Author and committer info has been rewritten."
echo ""
echo "Next steps:"
echo "  1. Verify the changes: git log --pretty=fuller"
echo "  2. If you've already pushed, force-push: git push --force-with-lease origin main"
echo "  3. Clean up backup refs: rm -rf .git/refs/original/"
