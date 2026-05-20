#!/usr/bin/env bash
#
# Smoke test — run against any deployed URL.
# Usage:
#   ./tests/smoke.sh http://localhost:3000
#   ./tests/smoke.sh https://huawei-image-sharer.vercel.app
#
set -euo pipefail

BASE="${1:?Usage: smoke.sh <BASE_URL>}"
PASS=0
FAIL=0

check() {
  local label="$1" expect_status="$2" url="$3" expect_cc="$4" method="${5:-GET}"
  local status cc

  if [ "$method" = "POST" ]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' "$url" 2>/dev/null) || true
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null) || true
  fi

  if [ "$status" = "$expect_status" ]; then
    if [ -n "$expect_cc" ]; then
      if [ "$method" = "POST" ]; then
        cc=$(curl -s -D - -o /dev/null -X POST -H "Content-Type: application/json" -d '{}' "$url" 2>/dev/null | grep -i "^cache-control:" | tr -d '\r') || true
      else
        cc=$(curl -sI "$url" 2>/dev/null | grep -i "^cache-control:" | tr -d '\r') || true
      fi
      if echo "$cc" | grep -qi "$expect_cc"; then
        echo "  PASS  $label  (status=$status, cache-control contains '$expect_cc')"
        PASS=$((PASS + 1))
      else
        echo "  FAIL  $label  (status=$status, but cache-control missing '$expect_cc': $cc)"
        FAIL=$((FAIL + 1))
      fi
    else
      echo "  PASS  $label  (status=$status)"
      PASS=$((PASS + 1))
    fi
  else
    echo "  FAIL  $label  (expected status=$expect_status, got=$status)"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "=== Smoke Test: $BASE ==="
echo ""

# --- Pages ---
check "GET /                  → 307 (redirect)" 307 "$BASE/" ""
check "GET /auth/login        → 200" 200 "$BASE/auth/login" ""
check "GET /auth/register     → 200" 200 "$BASE/auth/register" ""
check "GET /pending           → 200" 200 "$BASE/pending" ""
check "GET /denied            → 200" 200 "$BASE/denied" ""
check "GET /dashboard         → 307 (redirect)" 307 "$BASE/dashboard" ""

# --- API: profile (unauthenticated) ---
check "GET /api/auth/profile  → 401" 401 "$BASE/api/auth/profile" "no-store"

# --- API: admin (unauthenticated) ---
check "GET /api/admin/users   → 401" 401 "$BASE/api/admin/users" "no-store"

# --- API: approve (unauthenticated) ---
check "POST /api/admin/approve → 401" 401 "$BASE/api/admin/approve" "no-store" POST

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
