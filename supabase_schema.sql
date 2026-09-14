-- ==============================================================================
-- 🏛️ RAS AL-MAL (FOOLOS MAN) — SUPABASE DATABASE SCHEMA
-- ==============================================================================

-- 1. جدول اللاعبين (Players Table)
CREATE TABLE IF NOT EXISTS public.players (
  username text PRIMARY KEY,
  pin text NOT NULL,
  cash numeric DEFAULT 0,
  bank numeric DEFAULT 0,
  dirty_cash numeric DEFAULT 0,
  net_worth numeric DEFAULT 0,
  xp numeric DEFAULT 0,
  title text DEFAULT 'عامل مبتدئ',
  job_id text DEFAULT 'worker',
  is_admin boolean DEFAULT false,
  is_banned boolean DEFAULT false,
  jail_timer numeric DEFAULT 0,
  afk_manager_expires_at numeric DEFAULT 0,
  total_taxes_paid numeric DEFAULT 0,
  state jsonb DEFAULT '{}'::jsonb,
  last_seen bigint DEFAULT 0,
  created_at bigint DEFAULT 0,
  admin_modified_timestamp bigint DEFAULT 0
);

-- 2. جدول الحوالات وسجلات المعاملات (Transfers)
CREATE TABLE IF NOT EXISTS public.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender text NOT NULL,
  recipient text NOT NULL,
  amount numeric NOT NULL,
  created_at bigint DEFAULT 0
);

-- 3. جدول طلبات التحويل المالي (Transfer Requests)
CREATE TABLE IF NOT EXISTS public.transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender text NOT NULL,
  recipient text NOT NULL,
  amount numeric NOT NULL,
  status text DEFAULT 'pending',
  created_at bigint DEFAULT 0
);

-- 4. جدول صندوق البريد والإشعارات (Mailbox)
CREATE TABLE IF NOT EXISTS public.mailbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender text NOT NULL,
  recipient text NOT NULL,
  type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'unread',
  created_at bigint DEFAULT 0
);

-- 5. جدول الإعدادات العامة للعبة (Globals)
CREATE TABLE IF NOT EXISTS public.globals (
  id text PRIMARY KEY,
  data jsonb DEFAULT '{}'::jsonb,
  updated_at bigint DEFAULT 0
);

-- 6. جدول أكواد الهدايا (Gift Codes)
CREATE TABLE IF NOT EXISTS public.gift_codes (
  code text PRIMARY KEY,
  reward_cash numeric DEFAULT 0,
  max_uses integer DEFAULT 100,
  used_by jsonb DEFAULT '[]'::jsonb,
  created_at bigint DEFAULT 0
);

-- 7. جدول الشركات المشتركة (Corporations)
CREATE TABLE IF NOT EXISTS public.corporations (
  id text PRIMARY KEY,
  name text NOT NULL,
  founder text NOT NULL,
  treasury numeric DEFAULT 0,
  members jsonb DEFAULT '[]'::jsonb,
  contributions jsonb DEFAULT '{}'::jsonb,
  projects jsonb DEFAULT '[]'::jsonb,
  is_admin_corp boolean DEFAULT false,
  created_at bigint DEFAULT 0
);

-- 8. جدول المزادات الحية (Live Auctions)
CREATE TABLE IF NOT EXISTS public.live_auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  seller text NOT NULL,
  starting_price numeric NOT NULL,
  current_bid numeric NOT NULL,
  highest_bidder text,
  bid_count integer DEFAULT 0,
  status text DEFAULT 'active',
  ends_at bigint NOT NULL,
  created_at bigint DEFAULT 0
);

-- ==============================================================================
-- 🔒 تفعيل الأمان وسياسات الوصول (Row Level Security & Policies)
-- ==============================================================================
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.globals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_auctions ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول العام عبر Anon Key
CREATE POLICY "Allow public all on players" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on transfers" ON public.transfers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on transfer_requests" ON public.transfer_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on mailbox" ON public.mailbox FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on globals" ON public.globals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on gift_codes" ON public.gift_codes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on corporations" ON public.corporations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on live_auctions" ON public.live_auctions FOR ALL USING (true) WITH CHECK (true);

-- تفعيل التحديثات الحية Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.globals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mailbox;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transfers;

-- ==============================================================================
-- ⚡ إجراء التحويل المالي الذري المصرفي (Bank-Grade Atomic Wire Transfer)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.execute_wire_transfer(
  sender_username text,
  recipient_username text,
  transfer_amount numeric
) RETURNS boolean AS $$
DECLARE
  v_sender_user text;
  v_recipient_user text;
  sender_cash numeric;
  sender_bank numeric;
  sender_net_worth numeric;
  sender_state jsonb;
  recipient_state jsonb;
  recipient_bank numeric;
  recipient_net_worth numeric;
  deduct_from_cash numeric := 0;
  deduct_from_bank numeric := 0;
  new_sender_cash numeric;
  new_sender_bank numeric;
  new_recipient_bank numeric;
  v_now_ms bigint;
BEGIN
  IF sender_username ILIKE recipient_username THEN
    RAISE EXCEPTION 'لا يمكنك التحويل لنفسك!';
  END IF;

  IF transfer_amount <= 0 THEN
    RAISE EXCEPTION 'مبلغ التحويل غير صالح.';
  END IF;

  v_now_ms := (extract(epoch from now()) * 1000)::bigint;

  -- 1. إغلاق صف المرسل للتحقق من الرصيد والديون (Row Lock)
  SELECT username, cash, bank, net_worth, state 
  INTO v_sender_user, sender_cash, sender_bank, sender_net_worth, sender_state
  FROM public.players 
  WHERE username ILIKE sender_username 
  FOR UPDATE;

  IF v_sender_user IS NULL THEN
    RAISE EXCEPTION 'تعذر العثور على بيانات حساب المرسل.';
  END IF;

  sender_cash := COALESCE(sender_cash, 0);
  sender_bank := COALESCE(sender_bank, 0);

  -- 2. التحقق الصارم من عدم وجود قرض بنكي نشط على المرسل
  IF sender_state IS NOT NULL AND (
    (sender_state->'activeLoan') IS NOT NULL 
    AND sender_state->'activeLoan' != 'null'::jsonb
    AND (
      COALESCE((sender_state->'activeLoan'->>'amount')::numeric, 0) > 0 
      OR COALESCE((sender_state->'activeLoan'->>'totalDue')::numeric, 0) > 0
    )
  ) THEN
    RAISE EXCEPTION '🚫 مرفوض مصرفياً: لا يمكنك إجراء أي حوالات مالية أثناء وجود قرض بنكي نشط! يرجى سداد القرض المستحق أولاً لفك تجميد التحويلات.';
  END IF;

  -- 3. التحقق من كفاية الرصيد الإجمالي
  IF (sender_cash + sender_bank) < transfer_amount THEN
    RAISE EXCEPTION 'رصيدك الإجمالي (الكاش والبنك) غير كافٍ لإتمام الحوالة.';
  END IF;

  -- 4. إغلاق صف المستلم للتأكد من وجوده واستلام الرصيد
  SELECT username, bank, net_worth, state
  INTO v_recipient_user, recipient_bank, recipient_net_worth, recipient_state
  FROM public.players 
  WHERE username ILIKE recipient_username 
  FOR UPDATE;

  IF v_recipient_user IS NULL THEN
    RAISE EXCEPTION 'المستلم غير موجود. تأكد من صحة الاسم.';
  END IF;

  recipient_bank := COALESCE(recipient_bank, 0);
  recipient_net_worth := COALESCE(recipient_net_worth, 0);

  -- 5. خصم المبلغ من المرسل (الكاش أولاً ثم البنك)
  IF sender_cash >= transfer_amount THEN
    deduct_from_cash := transfer_amount;
    deduct_from_bank := 0;
  ELSE
    deduct_from_cash := sender_cash;
    deduct_from_bank := transfer_amount - sender_cash;
  END IF;

  new_sender_cash := sender_cash - deduct_from_cash;
  new_sender_bank := sender_bank - deduct_from_bank;

  UPDATE public.players
  SET cash = new_sender_cash,
      bank = new_sender_bank,
      net_worth = GREATEST(0, net_worth - transfer_amount),
      admin_modified_timestamp = v_now_ms,
      state = CASE 
        WHEN state IS NOT NULL THEN 
          jsonb_set(
            jsonb_set(
              jsonb_set(state, '{cash}', to_jsonb(new_sender_cash)),
              '{bank}', to_jsonb(new_sender_bank)
            ),
            '{adminModifiedTimestamp}', to_jsonb(v_now_ms)
          )
        ELSE state 
      END
  WHERE username = v_sender_user;

  -- 6. إضافة المبلغ للمستلم في البنك وتحديث state
  new_recipient_bank := recipient_bank + transfer_amount;

  UPDATE public.players
  SET bank = new_recipient_bank,
      net_worth = recipient_net_worth + transfer_amount,
      admin_modified_timestamp = v_now_ms,
      state = CASE 
        WHEN state IS NOT NULL THEN 
          jsonb_set(
            jsonb_set(state, '{bank}', to_jsonb(new_recipient_bank)),
            '{adminModifiedTimestamp}', to_jsonb(v_now_ms)
          )
        ELSE state 
      END
  WHERE username = v_recipient_user;

  -- 7. تسجيل إيصال التحويل
  INSERT INTO public.transfers (sender, recipient, amount, created_at)
  VALUES (v_sender_user, v_recipient_user, transfer_amount, v_now_ms);

  -- 8. إرسال إشعار لصندوق بريد المستلم
  INSERT INTO public.mailbox (sender, recipient, type, payload, status, created_at)
  VALUES (
    v_sender_user,
    v_recipient_user,
    'transfer_received',
    jsonb_build_object(
      'title', 'حوالة بنكية واردة 💸',
      'amount', transfer_amount,
      'message', 'تم استلام حوالة مالية بقيمة ' || transfer_amount || ' EGP من اللاعب "' || v_sender_user || '".'
    ),
    'unread',
    v_now_ms
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 🚀 فهارس الأداء العالي (High Performance Indexes)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_mailbox_recipient ON public.mailbox (recipient);
CREATE INDEX IF NOT EXISTS idx_mailbox_recipient_created ON public.mailbox (recipient, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mailbox_recipient_status ON public.mailbox (recipient, status);
CREATE INDEX IF NOT EXISTS idx_players_leaderboard ON public.players (is_banned, net_worth DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_recipient ON public.transfers (recipient);
CREATE INDEX IF NOT EXISTS idx_transfers_sender ON public.transfers (sender);

