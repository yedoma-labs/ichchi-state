#!/bin/bash

# WARNING: This script deletes ALL workflow runs from GitHub Actions
# This is IRREVERSIBLE!

set -e

REPO_NAME="yedoma-labs/ichchi-state"

echo "⚠️  WARNING: This will delete ALL GitHub Actions workflow runs!"
echo "Repository: $REPO_NAME"
echo ""
echo "This is IRREVERSIBLE!"
echo ""
read -p "Are you sure you want to continue? Type 'yes': " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "=== Deleting all workflow runs ==="
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

# Get all workflow runs
echo "Fetching workflow runs..."
run_ids=$(gh run list --repo "$REPO_NAME" --limit 1000 --json databaseId --jq '.[].databaseId')

if [ -z "$run_ids" ]; then
    echo "No workflow runs found"
    exit 0
fi

# Count runs
count=$(echo "$run_ids" | wc -l | xargs)
echo "Found $count workflow run(s) to delete"
echo ""

# Delete each run
counter=0
echo "$run_ids" | while read -r run_id; do
    if [ -n "$run_id" ]; then
        counter=$((counter + 1))
        echo "[$counter/$count] Deleting run ID: $run_id"
        gh run delete "$run_id" --repo "$REPO_NAME" || echo "  ⚠️  Failed to delete run $run_id (may already be deleted)"
    fi
done

echo ""
echo "✅ Done! All workflow runs deleted."
