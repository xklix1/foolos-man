-- ==============================================================================
-- ⚡ تحديث نظام الحوالات المصرفية (Wire Transfers):
-- 1. خفض سقف التحويل اليومي التراكمي إلى 5,000,000 ج.م خلال 24 ساعة
-- 2. تطبيق ضريبة بنكية 5% تُحرق وتُخصم لصالح البنك المركزي
-- 3. إيداع المبلغ الصافي (95%) في الحساب البنكي للمستلم
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.execute_wire_transfer(
  sender_username text,
  recipient_username text,
  transfer_amount numeric,
  sender_pin text
) RETURNS boolean AS $$
DECLARE
  v_sender_user text;
  v_recipient_user text;
  sender_cash numeric;
  sender_bank numeric;
  sender_net_worth numeric;
  sender_banned boolean;
  sender_pin_db text;
  sender_state jsonb;
  recipient_bank numeric;
  recipient_net_worth numeric;
  recipient_banned boolean;
  recipient_created bigint;
  recipient_xp numeric;
  recipient_state jsonb;
  recipient_admin_ts numeric;
  deduct_from_cash numeric := 0;
  deduct_from_bank numeric := 0;
  new_sender_cash numeric;
  new_sender_bank numeric;
  new_recipient_bank numeric;
  v_now_ms bigint;
  v_lock_ts bigint;
  v_recip_lock_ts bigint;
  v_sender_pin_hash text;
  v_tax_rate numeric := 0.05; -- ضريبة البنك المركزي 5%
  v_tax_amount numeric := 0;
  v_net_transfer_amount numeric := 0;
  v_is_exempt boolean := false;
BEGIN
  -- ── 1. التحقق الأساسي من القيم والحدود المالية ──
  IF transfer_amount IS NULL OR transfer_amount <= 0 THEN
    RAISE EXCEPTION 'مبلغ التحويل غير صالح. يجب أن يكون أكبر من صفر.';
  END IF;

  IF sender_username IS NULL OR recipient_username IS NULL THEN
    RAISE EXCEPTION 'بيانات التحويل غير مكتملة.';
  END IF;

  IF lower(trim(sender_username)) = lower(trim(recipient_username)) THEN
    RAISE EXCEPTION 'لا يمكنك التحويل لنفسك!';
  END IF;

  IF sender_pin IS NULL OR trim(sender_pin) = '' THEN
    RAISE EXCEPTION '🚫 مطلوب إدخال الرقم السري (PIN) الخاص بك لتأكيد التحويل المصرفي.';
  END IF;

  IF lower(trim(sender_username)) = 'khaled' THEN
    v_is_exempt := true;
  END IF;

  IF NOT v_is_exempt AND transfer_amount > 5000000 THEN
    RAISE EXCEPTION '🚫 الحد الأقصى للتحويل البنكي الواحد هو 5,000,000 ج.م لحماية الاقتصاد ومنع التلاعب.';
  END IF;

  v_now_ms := (extract(epoch from now()) * 1000)::bigint;
  v_lock_ts := v_now_ms + 120000;

  -- ── 2. حماية التكرار السريع (Rate-limiting): مهلة 15 ثانية ──
  IF NOT v_is_exempt AND EXISTS (
    SELECT 1 FROM public.transfers 
    WHERE sender ILIKE sender_username AND created_at > (v_now_ms - 15000)
  ) THEN
    RAISE EXCEPTION 'يرجى الانتظار 15 ثانية بين كل عملية تحويل مصرفي وأخرى لمنع التكرار السريع.';
  END IF;

  -- ── 3. سقف التحويلات اليومية التراكمي (Max 5,000,000 EGP per 24 hours) ──
  IF NOT v_is_exempt THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_daily_sent 
    FROM public.transfers 
    WHERE sender ILIKE sender_username AND created_at > (v_now_ms - 86400000);

    IF (v_daily_sent + transfer_amount) > 5000000 THEN
      RAISE EXCEPTION '🚫 تجاوزت الحد الأقصى اليومي المسموح به للتحويلات المصرفية (5,000,000 ج.م خلال 24 ساعة). المتبقي لك اليوم: % ج.م.', GREATEST(0, 5000000 - v_daily_sent);
    END IF;
  END IF;

  -- ── 4. إغلاق صف المرسل والتحقق من كلمة المرور والرصيد والحظر ──
  SELECT username, cash, bank, net_worth, is_banned, state, pin 
  INTO v_sender_user, sender_cash, sender_bank, sender_net_worth, sender_banned, sender_state, sender_pin_db
  FROM public.players 
  WHERE username ILIKE sender_username 
  FOR UPDATE;

  IF v_sender_user IS NULL THEN
    RAISE EXCEPTION 'تعذر العثور على بيانات حساب المرسل.';
  END IF;

  IF sender_banned = TRUE THEN
    RAISE EXCEPTION '🚫 حسابك محظور من إجراء أي معاملات مصرفية.';
  END IF;

  -- ── 4.1 التحقق الصارم من رمز الأمان (PIN) للمرسل ──
  v_sender_pin_hash := encode(sha256(trim(sender_pin)::bytea), 'hex');
  IF sender_pin_db IS NOT NULL AND trim(sender_pin_db) != '' THEN
    IF trim(sender_pin) != trim(sender_pin_db) 
       AND v_sender_pin_hash != trim(sender_pin_db) 
       AND ('s256_' || v_sender_pin_hash) != trim(sender_pin_db) 
       AND regexp_replace(trim(sender_pin_db), '^s256_', '') != v_sender_pin_hash THEN
      RAISE EXCEPTION '🚫 رمز الأمان (PIN) غير صحيح! فشلت المعاملة المصرفية.';
    END IF;
  END IF;

  sender_cash := COALESCE(sender_cash, 0);
  sender_bank := COALESCE(sender_bank, 0);

  -- التحقق من القروض النشطة
  IF NOT v_is_exempt AND sender_state IS NOT NULL AND (
    (sender_state->'activeLoan') IS NOT NULL 
    AND sender_state->'activeLoan' != 'null'::jsonb
    AND (
      COALESCE((sender_state->'activeLoan'->>'amount')::numeric, 0) > 0 
      OR COALESCE((sender_state->'activeLoan'->>'totalDue')::numeric, 0) > 0
    )
  ) THEN
    RAISE EXCEPTION '🚫 مرفوض مصرفياً: لا يمكنك إجراء أي حوالات مالية أثناء وجود قرض بنكي نشط! يرجى سداد القرض أولاً.';
  END IF;

  -- التحقق من كفاية الرصيد الإجمالي
  IF (sender_cash + sender_bank) < transfer_amount THEN
    RAISE EXCEPTION 'رصيدك الإجمالي (الكاش والبنك) غير كافٍ لإتمام الحوالة.';
  END IF;

  -- ── 5. إغلاق صف المستلم والتحقق من أهليته ──
  SELECT username, bank, net_worth, is_banned, created_at, xp, state, admin_modified_timestamp
  INTO v_recipient_user, recipient_bank, recipient_net_worth, recipient_banned, recipient_created, recipient_xp, recipient_state, recipient_admin_ts
  FROM public.players 
  WHERE username ILIKE recipient_username 
  FOR UPDATE;

  IF v_recipient_user IS NULL THEN
    RAISE EXCEPTION 'المستلم غير موجود. تأكد من صحة الاسم.';
  END IF;

  IF recipient_banned = TRUE THEN
    RAISE EXCEPTION '🚫 لا يمكن التحويل لحساب محظور.';
  END IF;

  -- حماية الحسابات الحديثة (منع تحويل الملايين لحسابات أعمارها أقل من 12 ساعة)
  IF NOT v_is_exempt AND recipient_created > (v_now_ms - 43200000) AND COALESCE(recipient_xp, 0) < 5000 AND transfer_amount > 500000 THEN
    RAISE EXCEPTION '🚫 حماية مصرفية: لا يمكن تحويل مبالغ تتجاوز 500 ألف ج.م إلى حسابات جديدة لم يمضِ على إنشائها 12 ساعة أو لم تبلغ المستوى المطلوب.';
  END IF;

  recipient_bank := COALESCE(recipient_bank, 0);
  recipient_net_worth := COALESCE(recipient_net_worth, 0);
  v_recip_lock_ts := v_now_ms + 120000;

  -- ── 6. حساب الضريبة البنكية (5%) والمبلغ الصافي ──
  v_tax_amount := FLOOR(transfer_amount * v_tax_rate);
  v_net_transfer_amount := transfer_amount - v_tax_amount;

  -- ── 6.1 خصم المبلغ الإجمالي من المرسل (الكاش أولاً ثم البنك) ──
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
      total_taxes_paid = COALESCE(total_taxes_paid, 0) + v_tax_amount,
      net_worth = GREATEST(0, net_worth - transfer_amount),
      admin_modified_timestamp = v_lock_ts,
      state = CASE 
        WHEN state IS NOT NULL THEN 
          jsonb_set(
            jsonb_set(
              jsonb_set(state, '{cash}', to_jsonb(new_sender_cash)),
              '{bank}', to_jsonb(new_sender_bank)
            ),
            '{adminModifiedTimestamp}', to_jsonb(v_lock_ts)
          )
        ELSE state 
      END
  WHERE username = v_sender_user;

  -- ── 7. إضافة المبلغ الصافي (بعد خصم 5%) للمستلم في البنك وتحديث state ──
  new_recipient_bank := recipient_bank + v_net_transfer_amount;

  UPDATE public.players
  SET bank = new_recipient_bank,
      net_worth = recipient_net_worth + v_net_transfer_amount,
      admin_modified_timestamp = v_recip_lock_ts,
      state = CASE 
        WHEN state IS NOT NULL THEN 
          jsonb_set(
            jsonb_set(
              jsonb_set(state, '{bank}', to_jsonb(new_recipient_bank)),
              '{adminModifiedTimestamp}', to_jsonb(v_recip_lock_ts)
            ),
            '{netWorth}', to_jsonb(recipient_net_worth + v_net_transfer_amount)
          )
        ELSE state 
      END
  WHERE username = v_recipient_user;

  -- ── 8. تسجيل إيصال التحويل (تسجيل المبلغ الإجمالي لاحتساب السقف اليومي) ──
  INSERT INTO public.transfers (sender, recipient, amount, created_at)
  VALUES (v_sender_user, v_recipient_user, transfer_amount, v_now_ms);

  -- ── 9. إرسال إشعار تفصيلي لصندوق بريد المستلم يوضح الصافي والضريبة ──
  INSERT INTO public.mailbox (sender, recipient, type, payload, status, created_at)
  VALUES (
    v_sender_user,
    v_recipient_user,
    'transfer_received',
    jsonb_build_object(
      'title', 'حوالة بنكية واردة 💸',
      'amount', v_net_transfer_amount,
      'gross_amount', transfer_amount,
      'tax_amount', v_tax_amount,
      'tax_percent', 5,
      'message', 'تم استلام حوالة مالية بقيمة ' || v_net_transfer_amount || ' EGP (بعد خصم ضريبة التحويل المصرفي 5%: ' || v_tax_amount || ' EGP) من اللاعب "' || v_sender_user || '".'
    ),
    'unread',
    v_now_ms
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
