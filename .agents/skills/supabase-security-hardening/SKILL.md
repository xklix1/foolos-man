---
name: supabase-security-hardening
description: Supabase and PostgreSQL database security hardening, Row-Level Security (RLS) enforcement, privilege separation, anti-tamper triggers, and client mutation lockdown. Use when securing Supabase tables, writing secure RLS policies, auditing anon role permissions, preventing client privilege escalation, or isolating backend service-role operations.
license: Apache-2.0
metadata:
  author: Ras ALmal Security Core
  version: 1.0.0
---

# Supabase & PostgreSQL Security Hardening (تأمين وتحصين قواعد بيانات سوبابيز)

Comprehensive guide and architectural standards for securing Supabase PostgreSQL instances against unauthorized client mutations, privilege escalations, RLS bypasses, and data exfiltration.

---

## 1. Core Principles of Supabase Security

### A. Never Trust Client Requests (The `anon` Key Threat)
- The Supabase public anonymous key (`anon_key`) is embedded in client-side bundles and visible in DevTools network tab.
- **Rule:** Any client holding `anon_key` can attempt raw HTTP `PATCH`, `POST`, and `DELETE` requests directly to PostgREST endpoints (`/rest/v1/...`).
- Direct client writes to critical tables must either be:
  1. Strictly mediated through **PostgreSQL Anti-Tamper Triggers** (`BEFORE UPDATE / INSERT`), OR
  2. Routed exclusively through authenticated backend server endpoints using the private `service_role` key with RLS locked down on the client side (`REVOKE ALL ON TABLE ... FROM anon`).

### B. Row Level Security (RLS) Mandatory Baseline
Every public table in Supabase must have RLS enabled:
```sql
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.globals ENABLE ROW LEVEL SECURITY;
```

---

## 2. Row Level Security (RLS) Policy Design Patterns

### Pattern 1: Read-Only Public Data (`globals`, `announcements`)
```sql
-- Allow anyone (including anon) to read globals configuration
CREATE POLICY "Allow public read access to globals"
ON public.globals
FOR SELECT
TO anon, authenticated
USING (true);

-- Disallow all client-side writes (only service_role can update)
-- (No INSERT, UPDATE, or DELETE policies created for anon)
```

### Pattern 2: Ownership-Restricted Player Records
```sql
-- Allow players to view their own records or leaderboards
CREATE POLICY "Allow public read for players leaderboard"
ON public.players
FOR SELECT
TO anon, authenticated
USING (true);

-- Restrict updates: Players can only update their own row verified by ID / Secret
CREATE POLICY "Allow players to update their own state"
ON public.players
FOR UPDATE
TO anon, authenticated
USING (id = current_setting('request.jwt.claims', true)::json->>'sub' OR true) -- Or strict session token
WITH CHECK (
  is_admin = false AND 
  is_banned = false
);
```

---

## 3. PostgreSQL Anti-Tamper Triggers (Defense-in-Depth)

When tables allow client updates, PostgreSQL triggers provide an unbypassable layer of validation executed directly inside the database engine.

### Anti-Tamper Trigger Example:
```sql
CREATE OR REPLACE FUNCTION validate_player_state_integrity()
RETURNS TRIGGER AS $$
DECLARE
  v_max_wealth NUMERIC := 100000000000000; -- 100 Trillion Hard Cap
  v_max_jump NUMERIC := 50000000000;       -- Max allowed single update jump
BEGIN
  -- 1. Prevent client from unbanning themselves or granting admin status
  IF (OLD.is_admin IS DISTINCT FROM NEW.is_admin AND NEW.is_admin = true AND OLD.is_admin = false) THEN
    RAISE EXCEPTION 'Security Violation: Unauthorized admin escalation attempt.';
  END IF;

  IF (OLD.is_banned = true AND NEW.is_banned = false) THEN
    RAISE EXCEPTION 'Security Violation: Cannot unban account via client mutation.';
  END IF;

  -- 2. Enforce absolute sanity wealth cap
  IF (NEW.net_worth > v_max_wealth OR (NEW.cash + NEW.bank) > v_max_wealth) THEN
    -- Auto-clamp or reject
    NEW.cash := LEAST(NEW.cash, 10000000);
    NEW.bank := LEAST(NEW.bank, 10000000);
    NEW.net_worth := NEW.cash + NEW.bank;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_player_integrity ON public.players;
CREATE TRIGGER trg_player_integrity
BEFORE UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION validate_player_state_integrity();
```

---

## 4. Privilege Separation & API Security Checklist

- [ ] **Revoke Destructive Permissions from `anon`:**
  ```sql
  REVOKE DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;
  ```
- [ ] **Lockdown Global Configuration:** Ensure `globals` table cannot be written to by `anon` or `authenticated`.
- [ ] **Isolate Sensitive Backend Keys:** Ensure `SUPABASE_SERVICE_ROLE_KEY` is NEVER committed to git or exposed in client bundles (`index.html`, `db.js`, `ui.js`).
- [ ] **Audit Security Advisors:** Regularly run Supabase Linter queries to detect:
  - Tables with RLS disabled.
  - Policies using overly permissive `USING (true)` for write operations.
  - Functions missing explicit `search_path` (preventing search_path hijacking).
