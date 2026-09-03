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
  sender_cash numeric;
  sender_net_worth numeric;
BEGIN
  IF sender_username = recipient_username THEN
    RAISE EXCEPTION 'لا يمكنك التحويل لنفسك!';
  END IF;

  IF transfer_amount <= 0 THEN
    RAISE EXCEPTION 'مبلغ التحويل غير صالح.';
  END IF;

  -- إغلاق صف المرسل للتحقق من الرصيد ومنع التكرار (Row Lock)
  SELECT cash, net_worth INTO sender_cash, sender_net_worth
  FROM public.players WHERE username = sender_username FOR UPDATE;

  IF sender_cash IS NULL OR sender_cash < transfer_amount THEN
    RAISE EXCEPTION 'رصيدك غير كافٍ لإتمام الحوالة.';
  END IF;

  -- التأكد من وجود المستلم
  IF NOT EXISTS (SELECT 1 FROM public.players WHERE username = recipient_username FOR UPDATE) THEN
    RAISE EXCEPTION 'المستلم غير موجود. تأكد من صحة الاسم.';
  END IF;

  -- خصم المبلغ من المرسل
  UPDATE public.players
  SET cash = cash - transfer_amount,
      net_worth = GREATEST(0, net_worth - transfer_amount)
  WHERE username = sender_username;

  -- إضافة المبلغ للمستلم
  UPDATE public.players
  SET cash = cash + transfer_amount,
      net_worth = net_worth + transfer_amount
  WHERE username = recipient_username;

  -- تسجيل إيصال التحويل
  INSERT INTO public.transfers (sender, recipient, amount, created_at)
  VALUES (sender_username, recipient_username, transfer_amount, (extract(epoch from now()) * 1000)::bigint);

  -- إرسال إشعار لصندوق بريد المستلم
  INSERT INTO public.mailbox (sender, recipient, type, payload, status, created_at)
  VALUES (
    sender_username,
    recipient_username,
    'transfer_received',
    jsonb_build_object(
      'title', 'حوالة بنكية واردة 💸',
      'amount', transfer_amount,
      'message', 'تم استلام حوالة مالية بقيمة ' || transfer_amount || ' EGP من اللاعب "' || sender_username || '".'
    ),
    'unread',
    (extract(epoch from now()) * 1000)::bigint
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
