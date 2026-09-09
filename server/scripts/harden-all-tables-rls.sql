-- ==============================================================================
-- 🛡️ RAS AL-MAL (FOOLOS MAN) — COMPREHENSIVE RLS SECURITY HARDENING
-- Target: PostgreSQL / Supabase
-- Purpose: Lock down all database tables so anonymous browser clients cannot
--          arbitrarily mutate economy, promo codes, maintenance, or global state.
-- ==============================================================================

-- 1. HARDEN: public.globals (Maintenance, Force Reload, Market Events, Chat)
ALTER TABLE public.globals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on globals" ON public.globals;
DROP POLICY IF EXISTS "Allow anon full access on globals" ON public.globals;
DROP POLICY IF EXISTS "Public can read globals" ON public.globals;
DROP POLICY IF EXISTS "Service role can modify globals" ON public.globals;

CREATE POLICY "Public can read globals"
ON public.globals FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can modify globals"
ON public.globals FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE ON public.globals FROM anon, authenticated;

-- 2. HARDEN: public.gift_codes (Promo Codes & Free Cash Rewards)
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on gift_codes" ON public.gift_codes;
DROP POLICY IF EXISTS "Public can read gift_codes" ON public.gift_codes;
DROP POLICY IF EXISTS "Service role full control on gift_codes" ON public.gift_codes;

CREATE POLICY "Public can read gift_codes"
ON public.gift_codes FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role full control on gift_codes"
ON public.gift_codes FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE ON public.gift_codes FROM anon, authenticated;

-- 3. HARDEN: public.corporations (Guilds / Corporate Entities)
ALTER TABLE public.corporations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on corporations" ON public.corporations;
DROP POLICY IF EXISTS "Public can read corporations" ON public.corporations;
DROP POLICY IF EXISTS "Service role full control on corporations" ON public.corporations;

CREATE POLICY "Public can read corporations"
ON public.corporations FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role full control on corporations"
ON public.corporations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE ON public.corporations FROM anon, authenticated;

-- 4. HARDEN: public.live_auctions (Auctions & Bidding)
ALTER TABLE public.live_auctions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on live_auctions" ON public.live_auctions;
DROP POLICY IF EXISTS "Public can read live_auctions" ON public.live_auctions;
DROP POLICY IF EXISTS "Service role full control on live_auctions" ON public.live_auctions;

CREATE POLICY "Public can read live_auctions"
ON public.live_auctions FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role full control on live_auctions"
ON public.live_auctions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE ON public.live_auctions FROM anon, authenticated;

-- 5. HARDEN: public.transfers & transfer_requests
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on transfers" ON public.transfers;
DROP POLICY IF EXISTS "Allow public all on transfer_requests" ON public.transfer_requests;

CREATE POLICY "Public can read transfers"
ON public.transfers FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role full control on transfers"
ON public.transfers FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE ON public.transfers FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.transfer_requests FROM anon, authenticated;

-- 6. HARDEN: public.mailbox (Direct Player Mail & Offline Grants)
ALTER TABLE public.mailbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on mailbox" ON public.mailbox;

CREATE POLICY "Public can read mailbox"
ON public.mailbox FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role full control on mailbox"
ON public.mailbox FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE ON public.mailbox FROM anon, authenticated;

-- 7. CONFIRM ALL TABLES HAVE RLS ENABLED
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('players', 'globals', 'gift_codes', 'corporations', 'live_auctions', 'transfers', 'mailbox');
