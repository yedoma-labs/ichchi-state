#!/bin/bash

# Delete remote tags so they can be re-pushed with updated commits

set -e

REPO_NAME="yedoma-labs/ichchi-state"

echo "⚠️  WARNING: This will delete ALL tags from remote repository!"
echo "Repository: $REPO_NAME"
echo ""
read -p "Continue? Type 'yes': " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Fetching remote tags..."

# Get all remote tags
remote_tags=$(git ls-remote --tags origin | awk '{print $2}' | sed 's#refs/tags/##' | grep -v '\^{}')

if [ -z "$remote_tags" ]; then
    echo "No remote tags found"
    exit 0
fi

echo "Found tags:"
echo "$remote_tags"
echo ""

# Delete each remote tag
echo "$remote_tags" | while read -r tag; do
    if [ -n "$tag" ]; then
        echo "Deleting remote tag: $tag"
        git push origin ":refs/tags/$tag"
    fi
done

echo ""
echo "✅ Done! Remote tags deleted."
echo ""
echo "Now push tags: git push --force --tags"
