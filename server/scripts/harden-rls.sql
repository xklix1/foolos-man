-- ==============================================================================
-- 🛡️ RAS AL-MAL (FOOLOS MAN) — COMPREHENSIVE RLS & DATABASE HARDENING
-- Target: PostgreSQL / Supabase
-- Purpose: Eradicate direct browser/curl mutation of players and core tables.
-- ==============================================================================

-- 1. Enable Row Level Security across all game tables
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.globals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

-- 2. Drop legacy permissive write policies
DROP POLICY IF EXISTS "Public can insert players" ON public.players;
DROP POLICY IF EXISTS "Public can update players" ON public.players;
DROP POLICY IF EXISTS "Allow anon full access" ON public.players;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.players;
DROP POLICY IF EXISTS "Public can modify globals" ON public.globals;
DROP POLICY IF EXISTS "Allow anon full access on globals" ON public.globals;

-- 3. Players Table Policies
-- Read-Only for public leaderboards and public profile discovery
DROP POLICY IF EXISTS "Public can view player profiles" ON public.players;
CREATE POLICY "Public can view player profiles"
ON public.players FOR SELECT
TO anon, authenticated
USING (true);

-- Mutations restricted exclusively to the backend server (service_role)
DROP POLICY IF EXISTS "Service role full control on players" ON public.players;
CREATE POLICY "Service role full control on players"
ON public.players FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Globals Table Policies (System config, chat feed, market prices)
-- Read-Only for public
DROP POLICY IF EXISTS "Public can read globals" ON public.globals;
CREATE POLICY "Public can read globals"
ON public.globals FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Service role full control on globals" ON public.globals;
CREATE POLICY "Service role full control on globals"
ON public.globals FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Mailbox, Corporations, Transfers, Gift Codes Policies
DROP POLICY IF EXISTS "Public read mailbox" ON public.mailbox;
CREATE POLICY "Public read mailbox" ON public.mailbox FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Service role mailbox" ON public.mailbox;
CREATE POLICY "Service role mailbox" ON public.mailbox FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read corporations" ON public.corporations;
CREATE POLICY "Public read corporations" ON public.corporations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Service role corporations" ON public.corporations;
CREATE POLICY "Service role corporations" ON public.corporations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role transfers" ON public.transfers;
CREATE POLICY "Service role transfers" ON public.transfers FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role transfer_requests" ON public.transfer_requests;
CREATE POLICY "Service role transfer_requests" ON public.transfer_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role gift_codes" ON public.gift_codes;
CREATE POLICY "Service role gift_codes" ON public.gift_codes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read auctions" ON public.live_auctions;
CREATE POLICY "Public read auctions" ON public.live_auctions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Service role auctions" ON public.live_auctions;
CREATE POLICY "Service role auctions" ON public.live_auctions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read bids" ON public.auction_bids;
CREATE POLICY "Public read bids" ON public.auction_bids FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Service role bids" ON public.auction_bids;
CREATE POLICY "Service role bids" ON public.auction_bids FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. Revoke direct write grants from anon and authenticated roles
REVOKE INSERT, UPDATE, DELETE ON public.players FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.globals FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.mailbox FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.corporations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.transfers FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.transfer_requests FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.gift_codes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.live_auctions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.auction_bids FROM anon, authenticated;

-- Column-level write revocation on sensitive player assets
REVOKE UPDATE (cash, bank, dirty_cash, net_worth, gold, xp, is_admin, is_banned) ON public.players FROM anon, authenticated;

-- Verification query
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
