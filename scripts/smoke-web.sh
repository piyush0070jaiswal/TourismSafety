#!/usr/bin/env bash
set -euo pipefail

WEB_URL="${WEB_URL:-http://localhost:${PORT:-3037}}"

check() {
  local url="$1" name="$2" follow="${3:-no}"
  local args=(-sS -o /dev/null -w '%{http_code}')
  if [[ "$follow" == "yes" ]]; then args=(-L "${args[@]}"); fi
  echo "[web] $name => $url"; local code
  code=$(curl "${args[@]}" "$url" || true)
  echo "HTTP $code"; [[ "$code" == "200" ]]
}

ok=1

check "$WEB_URL/healthz" "healthz" || ok=0
check "$WEB_URL/" "home" || ok=0
check "$WEB_URL/dashboard/incidents" "dashboard/incidents" || ok=0
check "$WEB_URL/tourist/report" "tourist/report" || ok=0
check "$WEB_URL/tourist/id-demo" "tourist/id-demo" || ok=0
check "$WEB_URL/report" "report redirect" yes || ok=0

if [[ "$ok" -ne 1 ]]; then
  echo "Smoke failed" >&2
  exit 1
fi
echo "Smoke OK"
