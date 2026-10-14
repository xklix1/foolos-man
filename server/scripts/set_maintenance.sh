#!/bin/bash
# ==============================================================================
# 🛠️ Ras ALmal Tycoon — Quick Maintenance Mode Switcher
# Usage:
#   ./server/scripts/set_maintenance.sh on   [custom message] [tester_pass]
#   ./server/scripts/set_maintenance.sh off
# ==============================================================================

ACTION="${1:-on}"
MSG="${2:-تخضع اللعبة حالياً لأعمال تحديث وصيانة طارئة من قبل الإدارة لتحسين الأداء وتأمين الحسابات. يرجى الانتظار والمحاولة لاحقاً.}"
TESTER_PASS="${3:-TESTER-2026}"
TS=$(date +%s000)

CONTAINER_ID=$(docker ps -qf "name=db" | head -n 1)
if [ -z "$CONTAINER_ID" ]; then
  CONTAINER_ID=$(docker ps -qf "name=postgres" | head -n 1)
fi

if [ -z "$CONTAINER_ID" ]; then
  echo "⚠️ Trying direct curl to local PostgREST (127.0.0.1:8000)..."
  if [ "$ACTION" == "off" ]; then
    curl -s -X POST "http://127.0.0.1:8000/rest/v1/globals" \
      -H "Content-Type: application/json" \
      -H "Prefer: resolution=merge-duplicates" \
      -d "{\"id\":\"maintenance\",\"data\":{\"active\":false,\"enabled\":false,\"message\":\"\",\"timestamp\":$TS},\"updated_at\":$TS}"
    echo "✅ Maintenance mode turned OFF via local PostgREST."
  else
    curl -s -X POST "http://127.0.0.1:8000/rest/v1/globals" \
      -H "Content-Type: application/json" \
      -H "Prefer: resolution=merge-duplicates" \
      -d "{\"id\":\"maintenance\",\"data\":{\"active\":true,\"enabled\":true,\"message\":\"$MSG\",\"tester_pass\":\"$TESTER_PASS\",\"timestamp\":$TS},\"updated_at\":$TS}"
    echo "✅ Maintenance mode turned ON via local PostgREST with Tester Pass: $TESTER_PASS"
  fi
  exit 0
fi

echo "🚀 Found PostgreSQL Container: $CONTAINER_ID"

if [ "$ACTION" == "off" ]; then
  docker exec -i "$CONTAINER_ID" psql -U postgres -d postgres -c \
    "INSERT INTO globals (id, data, updated_at) VALUES ('maintenance', '{\"active\": false, \"enabled\": false, \"message\": \"\", \"timestamp\": $TS}', $TS) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;"
  echo "✅ Maintenance mode turned OFF. Game is now OPEN to all players!"
else
  # Escape single quotes in message
  ESCAPED_MSG=$(echo "$MSG" | sed "s/'/''/g")
  ESCAPED_PASS=$(echo "$TESTER_PASS" | sed "s/'/''/g")
  docker exec -i "$CONTAINER_ID" psql -U postgres -d postgres -c \
    "INSERT INTO globals (id, data, updated_at) VALUES ('maintenance', '{\"active\": true, \"enabled\": true, \"message\": \"$ESCAPED_MSG\", \"tester_pass\": \"$ESCAPED_PASS\", \"timestamp\": $TS}', $TS) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;"
  echo "🔒 Maintenance mode turned ON. Game is now LOCKED for all players with maintenance overlay!"
  echo "🔑 Tester Bypass Pass: $TESTER_PASS"
fi
