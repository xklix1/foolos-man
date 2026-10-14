#!/bin/bash
# ==============================================================================
# Script to apply 50M Wire Transfer Migration directly into PostgreSQL container
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/update_wire_transfer_50m_5pct_tax.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ Error: SQL migration file not found at $SQL_FILE"
  exit 1
fi

CONTAINER_ID=$(docker ps -qf "name=db" | head -n 1)

if [ -z "$CONTAINER_ID" ]; then
  # Fallback: check for supabase_db or postgres
  CONTAINER_ID=$(docker ps -qf "name=postgres" | head -n 1)
fi

if [ -z "$CONTAINER_ID" ]; then
  echo "⚠️ Could not automatically detect postgres container via docker."
  echo "Please run the SQL file manually in Supabase SQL Editor or with:"
  echo "docker exec -i <container_id> psql -U postgres -d postgres < server/scripts/update_wire_transfer_50m_5pct_tax.sql"
  exit 1
fi

echo "🚀 Found PostgreSQL container: $CONTAINER_ID"
echo "Applying 50M wire transfer migration from $SQL_FILE..."

docker exec -i "$CONTAINER_ID" psql -U postgres -d postgres < "$SQL_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Wire transfer procedure successfully updated to 50,000,000 EGP with 5% tax in live PostgreSQL!"
else
  echo "❌ Failed to apply SQL migration into container $CONTAINER_ID"
  exit 1
fi
