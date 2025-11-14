#!/usr/bin/env bash
set -euo pipefail
BASE=${1:-http://localhost:4000}

echo "[smoke] GET /incidents/stats ..."
RES=$(curl -sS -w "\n%{http_code}" "$BASE/incidents/stats")
BODY=$(echo "$RES" | head -n -1)
CODE=$(echo "$RES" | tail -n 1)
echo "HTTP $CODE"
echo "$BODY" | jq -c . 2>/dev/null || echo "$BODY"
if [[ "$CODE" != "200" ]]; then echo "[smoke] stats failed" >&2; exit 1; fi

if command -v jq >/dev/null 2>&1; then
  TOTAL=$(echo "$BODY" | jq -r '.total // 0')
  echo "total=$TOTAL"
fi
