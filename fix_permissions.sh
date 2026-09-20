#!/bin/bash
CONTAINER_ID=$(docker ps -qf "name=db" | head -n 1)

if [ -z "$CONTAINER_ID" ]; then
  echo "❌ Could not find postgres docker container."
  exit 1
fi

echo "Found database container: $CONTAINER_ID"

docker exec -i "$CONTAINER_ID" psql -U postgres -d postgres << 'EOF'
ALTER TABLE public.players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.globals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailbox DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_auctions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.distressed_acquisitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_codes DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
EOF

echo "✅ All permissions and tables successfully unlocked!"
