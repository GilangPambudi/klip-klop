#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

started=$(date +%s)
old_head=$(git rev-parse HEAD)
git pull --ff-only -q
new_head=$(git rev-parse HEAD)
echo "Commit: $(git log --oneline -1)"

if [ "$old_head" = "$new_head" ] && [ "${1:-}" != "--force" ]; then
  echo "No new commits. Use --force to rebuild anyway."
  exit 0
fi

if [ ! -d node_modules ] || ! git diff --quiet "$old_head" "$new_head" -- package-lock.json; then
  echo "package-lock.json changed, running npm ci..."
  npm ci --no-audit --no-fund
else
  echo "Dependencies unchanged, skipping npm ci."
fi

echo "Building..."
npm run build > /tmp/klip-klop-build.log 2>&1 || { tail -30 /tmp/klip-klop-build.log; exit 1; }
sudo systemctl restart klip-klop
echo "Deployed in $(( $(date +%s) - started ))s."
