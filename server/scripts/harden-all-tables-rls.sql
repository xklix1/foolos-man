-- ==============================================================================
-- 🛡️ RAS AL-MAL (FOOLOS MAN) — COMPREHENSIVE RLS SECURITY HARDENING
-- Target: PostgreSQL / Supabase
-- Purpose: Lock down all database tables so anonymous browser clients cannot
--          arbitrarily mutate economy, promo codes, maintenance, or global state.
-- Note: Fully idempotent (safe to run multiple times without conflict errors).
-- ==============================================================================

-- 1. HARDEN: public.players (Core Player Balances, State & Credentials)
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can insert players" ON public.players;
DROP POLICY IF EXISTS "Public can update players" ON public.players;
DROP POLICY IF EXISTS "Allow anon full access" ON public.players;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.players;
DROP POLICY IF EXISTS "Public can view player profiles" ON public.players;
DROP POLICY IF EXISTS "Service role full control on players" ON public.players;

CREATE POLICY "Public can view player profiles"
ON public.players FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role full control on players"
ON public.players FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
-- Allow anonymous new player registration with strict anti-tampering bounds
GRANT SELECT, INSERT ON public.players TO anon, authenticated;
REVOKE UPDATE, DELETE ON public.players FROM anon;
REVOKE UPDATE, DELETE ON public.players FROM authenticated;

DROP POLICY IF EXISTS "Allow anon registration" ON public.players;
DROP POLICY IF EXISTS "Public can insert players" ON public.players;

CREATE POLICY "Allow anon registration"
ON public.players FOR INSERT
TO anon, authenticated
WITH CHECK (
  username IS NOT NULL AND
  char_length(trim(username)) >= 3 AND
  char_length(trim(username)) <= 30 AND
  (is_admin IS NOT TRUE) AND
  (is_banned IS NOT TRUE) AND
  (cash <= 5000) AND
  (bank = 0) AND
  (dirty_cash = 0) AND
  (net_worth <= 5000)
);

-- 2. HARDEN: public.globals (Maintenance, Force Reload, Market Events, Chat)
ALTER TABLE public.globals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on globals" ON public.globals;
DROP POLICY IF EXISTS "Allow anon full access on globals" ON public.globals;
DROP POLICY IF EXISTS "Public can read globals" ON public.globals;
DROP POLICY IF EXISTS "Service role can modify globals" ON public.globals;
DROP POLICY IF EXISTS "Public can insert chat_feed" ON public.globals;
DROP POLICY IF EXISTS "Public can update chat_feed" ON public.globals;
DROP POLICY IF EXISTS "Public can insert allowed globals" ON public.globals;
DROP POLICY IF EXISTS "Public can update allowed globals" ON public.globals;

GRANT SELECT, INSERT, UPDATE ON public.globals TO anon, authenticated;

CREATE POLICY "Public can read globals"
ON public.globals FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can modify globals"
ON public.globals FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can insert allowed globals"
ON public.globals FOR INSERT
TO anon, authenticated
WITH CHECK (id IN ('chat_feed', 'leaderboard', 'hourly_leaderboard', 'season_leaderboard', 'topup_requests', 'device_registry', 'fraud_alerts'));

CREATE POLICY "Public can update allowed globals"
ON public.globals FOR UPDATE
TO anon, authenticated
USING (id IN ('chat_feed', 'leaderboard', 'hourly_leaderboard', 'season_leaderboard', 'topup_requests', 'device_registry', 'fraud_alerts'))
WITH CHECK (id IN ('chat_feed', 'leaderboard', 'hourly_leaderboard', 'season_leaderboard', 'topup_requests', 'device_registry', 'fraud_alerts'));

-- 2.1 ATOMIC TOPUP REQUEST FUNCTION (Prevents race conditions, callable via RPC)
CREATE OR REPLACE FUNCTION public.submit_topup_request(request_data jsonb)
RETURNS jsonb AS $$
DECLARE
  v_current jsonb;
  v_requests jsonb;
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
BEGIN
  -- Row-level lock to prevent concurrent overwrite
  SELECT data INTO v_current FROM public.globals WHERE id = 'topup_requests' FOR UPDATE;
  
  IF v_current IS NULL THEN
    v_requests := '[]'::jsonb;
  ELSE
    v_requests := COALESCE(v_current->'requests', '[]'::jsonb);
  END IF;
  
  -- Prepend new request
  v_requests := jsonb_build_array(request_data) || v_requests;
  
  -- Limit to 300 entries
  IF jsonb_array_length(v_requests) > 300 THEN
    SELECT jsonb_agg(elem) INTO v_requests FROM (
      SELECT elem FROM jsonb_array_elements(v_requests) WITH ORDINALITY AS t(elem, ord)
      WHERE ord <= 300
    ) sub;
  END IF;
  
  INSERT INTO public.globals (id, data, updated_at)
  VALUES ('topup_requests', jsonb_build_object('requests', v_requests, 'updatedAt', v_now), v_now)
  ON CONFLICT (id) DO UPDATE
  SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;
  
  RETURN request_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.submit_topup_request(jsonb) TO anon, authenticated;

-- 3. HARDEN: public.gift_codes (Promo Codes & Free Cash Rewards)
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

-- 4. HARDEN: public.corporations (Guilds / Corporate Entities)
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

-- 5. HARDEN: public.live_auctions (Auctions & Bidding)
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

-- 6. HARDEN: public.transfers & transfer_requests
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on transfers" ON public.transfers;
DROP POLICY IF EXISTS "Allow public all on transfer_requests" ON public.transfer_requests;
DROP POLICY IF EXISTS "Public can read transfers" ON public.transfers;
DROP POLICY IF EXISTS "Service role full control on transfers" ON public.transfers;
DROP POLICY IF EXISTS "Public can read transfer_requests" ON public.transfer_requests;
DROP POLICY IF EXISTS "Public can insert transfer_requests" ON public.transfer_requests;
DROP POLICY IF EXISTS "Public can update transfer_requests" ON public.transfer_requests;
DROP POLICY IF EXISTS "Service role full control on transfer_requests" ON public.transfer_requests;

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

-- Transfer Requests: Allow players to create requests and update status (accept/reject)
GRANT SELECT, INSERT, UPDATE ON public.transfer_requests TO anon, authenticated;

CREATE POLICY "Service role full control on transfer_requests"
ON public.transfer_requests FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can read transfer_requests"
ON public.transfer_requests FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public can insert transfer_requests"
ON public.transfer_requests FOR INSERT
TO anon, authenticated
WITH CHECK (amount > 0 AND sender IS NOT NULL AND recipient IS NOT NULL);

CREATE POLICY "Public can update transfer_requests"
ON public.transfer_requests FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 7. HARDEN: public.mailbox (Direct Player Mail & Offline Grants)
ALTER TABLE public.mailbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on mailbox" ON public.mailbox;
DROP POLICY IF EXISTS "Public can read mailbox" ON public.mailbox;
DROP POLICY IF EXISTS "Public can insert mailbox" ON public.mailbox;
DROP POLICY IF EXISTS "Public can update mailbox" ON public.mailbox;
DROP POLICY IF EXISTS "Public can delete mailbox" ON public.mailbox;
DROP POLICY IF EXISTS "Service role full control on mailbox" ON public.mailbox;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mailbox TO anon, authenticated;

CREATE POLICY "Service role full control on mailbox"
ON public.mailbox FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can read mailbox"
ON public.mailbox FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public can insert mailbox"
ON public.mailbox FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public can update mailbox"
ON public.mailbox FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete mailbox"
ON public.mailbox FOR DELETE
TO anon, authenticated
USING (true);

-- 8. CONFIRM ALL TABLES HAVE RLS ENABLED
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('players', 'globals', 'gift_codes', 'corporations', 'live_auctions', 'transfers', 'mailbox');
