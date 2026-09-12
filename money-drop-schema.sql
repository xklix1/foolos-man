-- ==============================================================================
-- 🧧 RAS AL-MAL (FOOLOS MAN) — IRONCLAD ANTI-INFLATION MONEY DROP SYSTEM
-- ==============================================================================
-- منظومة حماية اقتصاد اللعبة من تضخم النقط ومزارع الحسابات:
-- 1. سقف مالي يومي للراعي: 150,000 ج.م كحد أقصى للرمي كل 24 ساعة (والحد الأقصى للنقطة الواحدة 150,000 ج.م).
-- 2. فترة انتظار إجبارية (Cooldown): 15 دقيقة بين كل نُقطة وأخرى لنفس اللاعب لمنع إغراق الشات.
-- 3. ضريبة حرق فاخرة 20% (Luxury Burn Tax): تُخصم 100% من الراعي وتُحرق 20% نهائياً لصالح خزينة الدولة ويُوزع 80% في الأكياس.
-- 4. سقف التقاط يومي للمستلم: 3 أكياس نقود يومياً أو سقف إجمالي 25,000 ج.م كحد أقصى يومياً.
-- 5. شروط أهلية صارمة ضد الحسابات الوهمية (Anti-Mule): عمر الحساب 24 ساعة على الأقل + 150 XP كحد أدنى + فحص الجهاز.
-- ==============================================================================

-- 1. جدول أكياس النقطة (Money Drops Table)
CREATE TABLE IF NOT EXISTS public.money_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender text NOT NULL,
  sender_title text DEFAULT 'سيد الأعمال',
  message text NOT NULL,
  total_amount numeric NOT NULL,
  total_bags integer NOT NULL,
  claimed_count integer DEFAULT 0,
  remaining_amount numeric NOT NULL,
  claims jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'active',
  created_at bigint DEFAULT (EXTRACT(epoch FROM now()) * 1000)::bigint,
  expires_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_money_drops_status ON public.money_drops(status);
CREATE INDEX IF NOT EXISTS idx_money_drops_created_at ON public.money_drops(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_money_drops_sender ON public.money_drops(sender);

ALTER TABLE public.money_drops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on money_drops" ON public.money_drops;
CREATE POLICY "Allow public all on money_drops" ON public.money_drops FOR ALL USING (true) WITH CHECK (true);

-- 2. إجراء إنشاء النقطة الذري مع ضوابط السقف والضريبة (Bank-Grade Atomic Create Money Drop)
CREATE OR REPLACE FUNCTION public.execute_create_money_drop(
  p_sender text,
  p_sender_title text,
  p_message text,
  p_amount numeric,
  p_bags integer
) RETURNS jsonb AS $$
DECLARE
  v_sender_cash numeric;
  v_sender_bank numeric;
  v_sender_net_worth numeric;
  v_deduct_cash numeric := 0;
  v_deduct_bank numeric := 0;
  v_new_cash numeric;
  v_new_bank numeric;
  v_clean_amount numeric;
  v_clean_bags integer;
  v_clean_msg text;
  v_drop_id uuid;
  v_now bigint;
  v_expires_at bigint;
  v_chat_feed jsonb;
  v_chat_messages jsonb := '[]'::jsonb;
  v_new_msg jsonb;
  v_today_start_ms bigint;
  v_sender_today_dropped numeric := 0;
  v_remaining_drop_cap numeric := 0;
  v_last_drop_at bigint;
  v_cooldown_mins integer;
  v_burn_tax numeric := 0;
  v_distributable_amount numeric := 0;
BEGIN
  v_clean_amount := FLOOR(COALESCE(p_amount, 0));
  v_clean_bags := COALESCE(p_bags, 0);
  v_now := (EXTRACT(epoch FROM now()) * 1000)::bigint;
  v_expires_at := v_now + (30 * 60 * 1000); -- صالحة لمدة 30 دقيقة
  v_today_start_ms := (EXTRACT(epoch FROM date_trunc('day', now() AT TIME ZONE 'Africa/Cairo')) * 1000)::bigint;

  -- أ) الفحوصات الأمنية والمالية الصارمة للمدخلات
  IF v_clean_amount < 10000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأدنى لرمي النقطة هو 10,000 ج.م.');
  END IF;

  IF v_clean_amount > 150000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأقصى للنقطة الواحدة هو 150,000 ج.م لحماية توازن الاقتصاد.');
  END IF;

  IF v_clean_bags < 2 OR v_clean_bags > 25 THEN
    RETURN jsonb_build_object('success', false, 'error', 'عدد الأكياس يجب أن يكون بين 2 و 25 كيساً.');
  END IF;

  IF (v_clean_amount / v_clean_bags) < 500 THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب أن لا يقل متوسط الكيس الواحد عن 500 ج.م.');
  END IF;

  -- ب) فحص وقت الانتظار الإجباري بين النُقط (Cooldown - 15 دقيقة)
  SELECT created_at INTO v_last_drop_at
  FROM public.money_drops
  WHERE LOWER(sender) = LOWER(p_sender)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_drop_at IS NOT NULL AND (v_now - v_last_drop_at) < (15 * 60 * 1000) THEN
    v_cooldown_mins := CEIL(((15 * 60 * 1000) - (v_now - v_last_drop_at)) / 60000.0);
    RETURN jsonb_build_object('success', false, 'error', 'يجب الانتظار ' || v_cooldown_mins || ' دقيقة قبل رمي نُقطة جديدة منعاً لإغراق الشات.');
  END IF;

  -- ج) فحص السقف المالي اليومي للراعي (150,000 ج.م في الـ 24 ساعة)
  SELECT COALESCE(SUM(total_amount), 0) INTO v_sender_today_dropped
  FROM public.money_drops
  WHERE LOWER(sender) = LOWER(p_sender)
    AND created_at >= v_today_start_ms;

  IF (v_sender_today_dropped + v_clean_amount) > 150000 THEN
    v_remaining_drop_cap := GREATEST(0, 150000 - v_sender_today_dropped);
    RETURN jsonb_build_object('success', false, 'error', 'تجاوزت سقف رمي النُقط اليومي (150,000 ج.م في الـ 24 ساعة). المتبقي لك اليوم: ' || v_remaining_drop_cap::text || ' ج.م.');
  END IF;

  -- د) إغلاق صف المرسل للتحقق والخصم الذري
  SELECT cash, bank, net_worth INTO v_sender_cash, v_sender_bank, v_sender_net_worth
  FROM public.players WHERE username = p_sender FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المرسل غير موجود في السيرفر.');
  END IF;

  v_sender_cash := COALESCE(v_sender_cash, 0);
  v_sender_bank := COALESCE(v_sender_bank, 0);

  IF (v_sender_cash + v_sender_bank) < v_clean_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيدك الإجمالي (الكاش والبنك) غير كافٍ لرمي هذه النقطة.');
  END IF;

  -- هـ) احتساب ضريبة الحرق الفاخرة (20% Luxury Burn Tax)
  v_burn_tax := FLOOR(v_clean_amount * 0.20);
  v_distributable_amount := v_clean_amount - v_burn_tax;

  -- رسالة الشات مع بيان الضريبة
  v_clean_msg := COALESCE(NULLIF(TRIM(p_message), ''), 'نُقطة حلاوة لرجالة السيرفر! 💸') ||
                 ' [🔥 حرق 20% ضرائب: ' || v_burn_tax::text || ' EGP | الصافي: ' || v_distributable_amount::text || ' EGP]';

  -- و) الخصم الذكي من الراعي (يُخصم كامل المبلغ v_clean_amount، وتُضاف الضريبة لضرائبه المسددة)
  IF v_sender_cash >= v_clean_amount THEN
    v_deduct_cash := v_clean_amount;
    v_deduct_bank := 0;
  ELSE
    v_deduct_cash := v_sender_cash;
    v_deduct_bank := v_clean_amount - v_sender_cash;
  END IF;

  v_new_cash := v_sender_cash - v_deduct_cash;
  v_new_bank := v_sender_bank - v_deduct_bank;

  UPDATE public.players
  SET cash = v_new_cash,
      bank = v_new_bank,
      net_worth = GREATEST(0, net_worth - v_clean_amount),
      total_taxes_paid = COALESCE(total_taxes_paid, 0) + v_burn_tax,
      state = CASE
        WHEN state IS NOT NULL THEN
          jsonb_set(
            jsonb_set(state, '{cash}', to_jsonb(v_new_cash)),
            '{bank}', to_jsonb(v_new_bank)
          )
        ELSE state
      END
  WHERE username = p_sender;

  -- ز) إنشاء سجل النقطة بالمبلغ الصافي الموزع (v_distributable_amount)
  v_drop_id := gen_random_uuid();
  INSERT INTO public.money_drops (
    id, sender, sender_title, message, total_amount, total_bags,
    claimed_count, remaining_amount, claims, status, created_at, expires_at
  ) VALUES (
    v_drop_id, p_sender, COALESCE(p_sender_title, 'سيد الأعمال'),
    v_clean_msg, v_distributable_amount, v_clean_bags, 0, v_distributable_amount, '[]'::jsonb,
    'active', v_now, v_expires_at
  );

  -- ح) البث المباشر للشات العام عبر chat_feed
  BEGIN
    SELECT data INTO v_chat_feed FROM public.globals WHERE id = 'chat_feed' FOR UPDATE;
    IF v_chat_feed IS NOT NULL AND v_chat_feed ? 'messages' THEN
      v_chat_messages := v_chat_feed->'messages';
    END IF;

    v_new_msg := jsonb_build_object(
      'id', 'drop_' || v_drop_id::text,
      'sender', p_sender,
      'senderTitle', COALESCE(p_sender_title, 'سيد الأعمال'),
      'text', v_clean_msg,
      'type', 'money_drop',
      'dropId', v_drop_id::text,
      'totalAmount', v_distributable_amount,
      'grossAmount', v_clean_amount,
      'burnTax', v_burn_tax,
      'totalBags', v_clean_bags,
      'claimedBags', 0,
      'status', 'active',
      'timestamp', v_now
    );

    v_chat_messages := v_chat_messages || jsonb_build_array(v_new_msg);

    -- الحفاظ على آخر 50 رسالة كحد أقصى في الفيد
    IF jsonb_array_length(v_chat_messages) > 50 THEN
      v_chat_messages := (
        SELECT jsonb_agg(elem)
        FROM (
          SELECT elem FROM jsonb_array_elements(v_chat_messages) elem
          OFFSET (jsonb_array_length(v_chat_messages) - 50)
        ) sub
      );
    END IF;

    INSERT INTO public.globals (id, data, updated_at)
    VALUES ('chat_feed', jsonb_build_object('messages', v_chat_messages), v_now)
    ON CONFLICT (id) DO UPDATE
    SET data = jsonb_build_object('messages', v_chat_messages),
        updated_at = v_now;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'drop_id', v_drop_id,
    'new_cash', v_new_cash,
    'new_bank', v_new_bank,
    'deducted', v_clean_amount,
    'burned_tax', v_burn_tax,
    'distributed_amount', v_distributable_amount,
    'remaining_daily_cap', GREATEST(0, 150000 - (v_sender_today_dropped + v_clean_amount))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. إجراء التقاط النقطة الذري مع ضوابط الأهلية والسقف اليومي (Bank-Grade Atomic Claim Money Drop)
CREATE OR REPLACE FUNCTION public.execute_claim_money_drop(
  p_drop_id uuid,
  p_claimer text
) RETURNS jsonb AS $$
DECLARE
  v_drop public.money_drops%ROWTYPE;
  v_claimer_cash numeric;
  v_claimer_bank numeric;
  v_claimer_xp numeric;
  v_claimer_state jsonb;
  v_claimer_created bigint;
  v_sender_device text;
  v_claimer_device text;
  v_now bigint;
  v_today_start_ms bigint;
  v_remaining_bags integer;
  v_reward numeric;
  v_avg numeric;
  v_min numeric;
  v_max numeric;
  v_new_claims jsonb;
  v_new_status text;
  v_chat_feed jsonb;
  v_chat_messages jsonb;
  v_elem jsonb;
  v_claimer_today_count integer := 0;
  v_claimer_today_earned numeric := 0;
BEGIN
  v_now := (EXTRACT(epoch FROM now()) * 1000)::bigint;
  v_today_start_ms := (EXTRACT(epoch FROM date_trunc('day', now() AT TIME ZONE 'Africa/Cairo')) * 1000)::bigint;

  -- أ) إغلاق صف النقطة لمنع أي تضارب متزامن (FOR UPDATE Lock)
  SELECT * INTO v_drop FROM public.money_drops WHERE id = p_drop_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'النقطة غير موجودة أو تم حذفها.');
  END IF;

  IF v_drop.status != 'active' OR v_drop.claimed_count >= v_drop.total_bags OR v_drop.remaining_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'للأسف، اكتملت النقطة ونفدت جميع الأكياس!');
  END IF;

  IF v_now > v_drop.expires_at THEN
    UPDATE public.money_drops SET status = 'expired' WHERE id = p_drop_id;
    RETURN jsonb_build_object('success', false, 'error', 'انتهت صلاحية هذه النقطة.');
  END IF;

  -- ب) منع صاحب النقطة من التقاط أكياسه
  IF LOWER(v_drop.sender) = LOWER(p_claimer) THEN
    RETURN jsonb_build_object('success', false, 'error', 'أنت صاحب النقطة يا معلم، سبت الفلوس لرجالة السيرفر! 😉');
  END IF;

  -- ج) منع الاستلام المزدوج من نفس النقطة
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_drop.claims) c
    WHERE LOWER(c->>'username') = LOWER(p_claimer)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'لقد التقطت نصيبك بالفعل من هذه النقطة.');
  END IF;

  -- د) جلب بيانات المستلم للتحقق من الأهلية ومكافحة الحسابات الوهمية (Anti-Mule)
  SELECT cash, bank, xp, state, created_at
  INTO v_claimer_cash, v_claimer_bank, v_claimer_xp, v_claimer_state, v_claimer_created
  FROM public.players WHERE username = p_claimer FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'اللاعب غير موجود.');
  END IF;

  -- 1. فحص عمر الحساب (24 ساعة على الأقل)
  IF v_claimer_created IS NOT NULL AND (v_now - v_claimer_created) < (24 * 60 * 60 * 1000) THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب أن يمر 24 ساعة على الأقل على إنشاء الحساب لتتمكن من التقاط النُقط.');
  END IF;

  -- 2. فحص الخبرة الدنيا (150 XP على الأقل)
  IF COALESCE(v_claimer_xp, 0) < 150 THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب أن تصل خبرتك إلى 150 XP على الأقل (عبر العمل وإنجاز المهام) لتتمكن من التقاط النُقط.');
  END IF;

  -- 3. فحص الجهاز لمنع الحسابات المتعددة على نفس الهاتف
  v_sender_device := (SELECT state->>'initial_device' FROM public.players WHERE username = v_drop.sender);
  v_claimer_device := v_claimer_state->>'initial_device';
  IF v_sender_device IS NOT NULL AND v_claimer_device IS NOT NULL AND v_sender_device = v_claimer_device THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن الاستلام من حساب على نفس جهاز الراعي.');
  END IF;

  -- 4. فحص سقف الالتقاط اليومي للمستلم (حد أقصى 3 أكياس / 25,000 ج.م في الـ 24 ساعة)
  SELECT COUNT(*), COALESCE(SUM((c->>'amount')::numeric), 0)
  INTO v_claimer_today_count, v_claimer_today_earned
  FROM public.money_drops d,
       jsonb_array_elements(d.claims) c
  WHERE LOWER(c->>'username') = LOWER(p_claimer)
    AND COALESCE((c->>'claimed_at')::bigint, d.created_at) >= v_today_start_ms;

  IF v_claimer_today_count >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'وصلت للحد الأقصى اليومي لالتقاط النُقط (3 أكياس في اليوم). اترك الفرصة لغيرك!');
  END IF;

  IF v_claimer_today_earned >= 25000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'وصلت للحد الأقصى للأرباح اليومية من النُقط (25,000 ج.م اليوم).');
  END IF;

  -- هـ) حساب النصيب المحظوظ (Lucky Split Algorithm)
  v_remaining_bags := v_drop.total_bags - v_drop.claimed_count;

  IF v_remaining_bags <= 1 THEN
    v_reward := v_drop.remaining_amount;
  ELSE
    v_avg := v_drop.remaining_amount / v_remaining_bags;
    v_min := GREATEST(100, FLOOR(v_avg * 0.35));
    v_max := LEAST(v_drop.remaining_amount - ((v_remaining_bags - 1) * 100), FLOOR(v_avg * 1.65));
    IF v_max < v_min THEN v_max := v_min; END IF;
    
    v_reward := v_min + FLOOR(random() * (v_max - v_min + 1));
    IF v_reward > v_drop.remaining_amount THEN
      v_reward := v_drop.remaining_amount;
    END IF;
  END IF;

  -- تقييد المكافأة بما لا يتجاوز سقف الـ 25,000 اليومي للمستلم
  v_reward := LEAST(v_reward, 25000 - v_claimer_today_earned);
  v_reward := FLOOR(v_reward);
  IF v_reward <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'وصلت للحد الأقصى للأرباح اليومية من النُقط (25,000 ج.م اليوم).');
  END IF;

  -- و) تسجيل الاستلام في جدول النقطة
  v_new_claims := v_drop.claims || jsonb_build_array(jsonb_build_object(
    'username', p_claimer,
    'amount', v_reward,
    'claimed_at', v_now
  ));

  v_new_status := CASE WHEN (v_drop.claimed_count + 1) >= v_drop.total_bags OR (v_drop.remaining_amount - v_reward) <= 0 THEN 'completed' ELSE 'active' END;

  UPDATE public.money_drops
  SET claimed_count = claimed_count + 1,
      remaining_amount = GREATEST(0, remaining_amount - v_reward),
      claims = v_new_claims,
      status = v_new_status
  WHERE id = p_drop_id;

  -- ز) إيداع المبلغ فورياً في بنك المستلم وتحديث حالته
  v_claimer_bank := COALESCE(v_claimer_bank, 0) + v_reward;

  UPDATE public.players
  SET bank = v_claimer_bank,
      net_worth = net_worth + v_reward,
      state = CASE
        WHEN state IS NOT NULL THEN
          jsonb_set(state, '{bank}', to_jsonb(v_claimer_bank))
        ELSE state
      END
  WHERE username = p_claimer;

  -- ح) إرسال إشعار لصندوق بريد المستلم كإيصال فوري
  INSERT INTO public.mailbox (sender, recipient, type, payload, status, created_at)
  VALUES (
    v_drop.sender,
    p_claimer,
    'money_drop_received',
    jsonb_build_object(
      'title', 'مبروك! كسبت نُقطة 🧧💸',
      'amount', v_reward,
      'dropId', p_drop_id::text,
      'message', 'التقطت كيس نقود بقيمة ' || v_reward || ' EGP من نُقطة المعلم "' || v_drop.sender || '". (الأكياس المتبقية لك اليوم: ' || (2 - v_claimer_today_count)::text || ')'
    ),
    'unread',
    v_now
  );

  -- ط) تحديث عداد الأكياس في تغذية الشات العام
  BEGIN
    SELECT data INTO v_chat_feed FROM public.globals WHERE id = 'chat_feed' FOR UPDATE;
    IF v_chat_feed IS NOT NULL AND v_chat_feed ? 'messages' THEN
      v_chat_messages := '[]'::jsonb;
      FOR v_elem IN SELECT * FROM jsonb_array_elements(v_chat_feed->'messages') LOOP
        IF v_elem->>'dropId' = p_drop_id::text THEN
          v_elem := jsonb_set(v_elem, '{claimedBags}', to_jsonb(v_drop.claimed_count + 1));
          v_elem := jsonb_set(v_elem, '{status}', to_jsonb(v_new_status));
        END IF;
        v_chat_messages := v_chat_messages || jsonb_build_array(v_elem);
      END LOOP;

      UPDATE public.globals
      SET data = jsonb_build_object('messages', v_chat_messages),
          updated_at = v_now
      WHERE id = 'chat_feed';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'reward', v_reward,
    'claimed_bags', v_drop.claimed_count + 1,
    'total_bags', v_drop.total_bags,
    'status', v_new_status,
    'sender', v_drop.sender,
    'remaining_today_claims', GREATEST(0, 2 - v_claimer_today_count),
    'remaining_today_earnings', GREATEST(0, 25000 - (v_claimer_today_earned + v_reward))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
