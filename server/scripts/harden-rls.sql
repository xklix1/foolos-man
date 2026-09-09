-- ==============================================================================
-- 🛡️ RAS AL-MAL (FOOLOS MAN) — ROW LEVEL SECURITY (RLS) HARDENING
-- Target: PostgreSQL / Supabase
-- Purpose: Eradicate direct browser mutation of player balances and progress.
-- ==============================================================================

-- 1. Enable Row Level Security on players table
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing overly-permissive public write policies if any exist
DROP POLICY IF EXISTS "Public can insert players" ON public.players;
DROP POLICY IF EXISTS "Public can update players" ON public.players;
DROP POLICY IF EXISTS "Allow anon full access" ON public.players;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.players;

-- 3. Policy: Public Read for Leaderboards and Profiles (Read-Only)
-- Allows reading player profiles for leaderboard rankings without exposing PIN or raw internal state
CREATE POLICY "Public can view player profiles"
ON public.players
FOR SELECT
TO anon, authenticated
USING (true);

-- 4. Policy: Strict Service-Role Exclusive Mutation Authority
-- Only the backend server daemon (using service_role key) can insert, update, or delete rows.
-- Browsers using the 'anon' key will be strictly rejected with HTTP 403.
CREATE POLICY "Service role full control on players"
ON public.players
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Revoke direct write grants from anon role as defense-in-depth
REVOKE INSERT, UPDATE, DELETE ON public.players FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.players FROM authenticated;

-- Confirm RLS configuration
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'players';
