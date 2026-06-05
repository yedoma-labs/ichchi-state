#!/bin/bash

# WARNING: This completely rewrites git history!
# - Squashes all commits into one
# - Resets version to 0.1.0
# - Deletes all tags

set -e

echo "⚠️  WARNING: This will:"
echo "  1. Squash ALL commits into one initial commit"
echo "  2. Delete ALL tags (local)"
echo "  3. Reset version to 0.1.0"
#echo "  4. Rewrite CHANGELOG.md"
echo ""
echo "This is IRREVERSIBLE!"
echo ""
read -p "Type 'yes' to continue: " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "=== Step 1: Delete all local tags ==="
git tag -l | xargs -n 1 git tag -d

#echo ""
#echo "=== Step 2: Update version to 0.1.0 ==="
#sed -i '' 's/"version": "0.3.0"/"version": "0.1.0"/' package.json
#sed -i '' 's/v0.3.0/v0.1.0/g' README.md
#cp CHANGELOG-new.md CHANGELOG.md
#rm CHANGELOG-new.md

echo ""
echo "=== Step 3: Create orphan branch with single commit ==="

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Create orphan branch
git checkout --orphan new-main

# Stage all files
git add -A

# Create single commit
git commit -m "feat: initial release of ichchi-state

@yedoma-labs/ichchi-state - Lightweight, TypeScript-first state manager

Core features:
- < 3KB gzipped bundle size
- Full TypeScript support with type inference
- Redux DevTools integration
- Time-travel debugging with undo/redo
- Built-in persistence (localStorage/sessionStorage)
- Middleware support (logger, thunk, debounce)
- React bindings with hooks
- Framework-agnostic core

About ichchi:
The name comes from Yakutian (Sakha) 'ichchi' (иччи), meaning 'guardian spirit' - 
protective spirits that watch over places and objects. Like the permafrost (yedoma) 
preserves ancient matter, ichchi guards and preserves your application's state."

echo ""
echo "=== Step 4: Replace main branch ==="

# Delete old main and rename
git branch -D "$CURRENT_BRANCH"
git branch -m "$CURRENT_BRANCH"

echo ""
echo "=== Step 5: Commit version changes ==="
git add package.json CHANGELOG.md README.md
git commit --amend --no-edit

echo ""
echo "=== Step 6: Clean up reflog and old objects ==="
# Delete reflog (keeps history of ref changes)
git reflog expire --expire=now --all

# Remove any filter-branch backups
rm -rf .git/refs/original/

# Garbage collect to permanently delete old commits
git gc --prune=now --aggressive

echo ""
echo "✅ Done!"
echo ""
echo "Old commits are now unreachable locally."
echo ""
echo "Git history has been squashed into one commit."
echo "Version: 0.1.0"
echo "CHANGELOG: Updated"
echo ""
echo "Review:"
git log --oneline -1
echo ""
echo "Next steps:"
echo "  1. Review changes: git log --pretty=fuller"
echo "  2. Force push: git push --force origin main"
echo "  3. Create and push tag: git tag v0.1.0 && git push --tags"
echo ""
echo "Note: Old commits are removed locally. Remote history will be"
echo "overwritten after force push. Anyone who cloned before needs to:"
echo "  git fetch origin && git reset --hard origin/main"
