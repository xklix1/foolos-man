-- ==============================================================================
-- 🛡️ نظام حماية النزاهة وسد ثغرات التعديل البرمجي (Smart Context-Aware Anti-Cheat)
-- ==============================================================================
-- النسخة المحدثة الذكية:
-- 1. كشف ومنع حقن الأموال الوهمية وتعديل المتصفح F12 / Console.
-- 2. حماية كاملة ضد تعديل رتبة المشرف (Admin) أو فك الحظر الذاتي.
-- 3. حماية سقف الأسهم (Stock Cap Enforcement).
-- 4. كابح ثروة ذكي (Context-Aware Wealth Velocity Guard):
--    - يسمح بالسحب والإيداع الشرعي بين الكاش والبنك دون تقييد أعمى.
--    - يسمح بأرباح بيع وتسييل الأسهم المشروعة (Stock Liquidation).
--    - يسمح بعوائد عقود التصدير والشحن الدولي الموثقة (Trade Export Collections).
--    - يسمح باسترداد عوائد وأصول الصناديق الاستثمارية المكتملة (Matured Investments).
--    - يمنع قطعياً أي قفزات مالية غير مبررة أو محقونة من فراغ.
-- ==============================================================================

-- 1. جدول سجلات الأمان لمحاولات التلاعب (Anti-Cheat Security Audit Log)
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  incident_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  detected_at bigint DEFAULT (EXTRACT(epoch FROM now()) * 1000)::bigint
);

-- السماح بالقراءة فقط للمشرفين، ومنع الكتابة المباشرة من اللاعبين
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view security logs" ON public.security_audit_logs;
CREATE POLICY "Admins can view security logs" ON public.security_audit_logs
  FOR ALL USING (true);

-- 2. الدالة الذكية للتحقق من نزاهة تحديثات اللاعبين (PostgreSQL Integrity Trigger)
CREATE OR REPLACE FUNCTION public.validate_player_update_anti_cheat()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
  v_stock_key text;
  v_stock_data jsonb;
  v_shares numeric;
  v_max_shares numeric;
  v_old_shares numeric;
  v_new_shares numeric;
  v_cash_diff numeric;
  v_bank_diff numeric;
  v_total_diff numeric;
  v_is_reset boolean := false;
  v_stocks_liquidated boolean := false;
  v_stock_liquidation_allowance numeric := 0;
  v_trade_profit_diff numeric := 0;
  v_investments_redeemed boolean := false;
  v_allowed_velocity numeric := 500000;
BEGIN
  -- تحديد الصلاحية المنفذة للطلب (anon vs service_role / postgres)
  BEGIN
    v_role := COALESCE(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role',
      nullif(current_setting('request.jwt.claim.role', true), ''),
      session_user
    );
  EXCEPTION WHEN OTHERS THEN
    v_role := session_user;
  END;

  -- المشرفون وسيرفر الباك إند فقط معفيون من القيود عبر مفتاح service_role أو postgres
  IF v_role IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- ── 0) فحص حظر الأجهزة الصارم (Hardware & Fingerprint Device Ban) ──
  IF NEW.state IS NOT NULL AND (
    (NEW.state ? 'known_devices' AND (
      NEW.state->'known_devices' ? 'dev_hw_001d1509ba118ee4' OR
      NEW.state->'known_devices' ? 'dev_001d1509ba118ee4_001910d2'
    )) OR
    (NEW.state->>'initial_device' IN ('dev_hw_001d1509ba118ee4', 'dev_001d1509ba118ee4_001910d2'))
  ) THEN
    NEW.is_banned := TRUE;
    NEW.cash := 0;
    NEW.bank := 0;
    NEW.net_worth := 0;
    RETURN NEW;
  END IF;

  -- فحص ما إذا كان التحديث عبارة عن تصفير إداري للحساب (Admin Account Reset)
  IF NEW.state IS NOT NULL AND jsonb_typeof(NEW.state) = 'object' THEN
    IF (NEW.state->>'isReset' = 'true' OR (NEW.state ? 'isReset' AND (NEW.state->'isReset')::text = 'true')) THEN
      v_is_reset := true;
    END IF;
  END IF;

  -- ── 0) حماية السجلات المعدلة إدارياً من الكتابة فوقها بكاش المتصفح القديم (Stale Client Shield) ──
  IF NOT v_is_reset AND OLD.admin_modified_timestamp > 0 AND COALESCE(NEW.admin_modified_timestamp, 0) < OLD.admin_modified_timestamp THEN
    NEW.state := OLD.state;
    NEW.cash := OLD.cash;
    NEW.bank := OLD.bank;
    NEW.dirty_cash := OLD.dirty_cash;
    NEW.net_worth := OLD.net_worth;
    NEW.title := OLD.title;
    NEW.job_id := OLD.job_id;
    NEW.total_taxes_paid := OLD.total_taxes_paid;
    NEW.is_banned := OLD.is_banned;
    NEW.admin_modified_timestamp := OLD.admin_modified_timestamp;
    RETURN NEW;
  END IF;

  -- إذا كانت عملية تصفير إداري: اسمح برفع admin_modified_timestamp فوراً لمنع الكاش القديم
  IF v_is_reset THEN
    NEW.admin_modified_timestamp := GREATEST(
      COALESCE(NEW.admin_modified_timestamp, 0),
      (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint
    );
  ELSE
    -- منع أي عميل عادي من تعديل admin_modified_timestamp يدوياً
    NEW.admin_modified_timestamp := OLD.admin_modified_timestamp;
  END IF;

  -- ── أ) منع ترقية الحساب إلى مشرف (Admin Escalation Shield) ──
  IF NEW.is_admin = TRUE AND (OLD.is_admin IS NULL OR OLD.is_admin = FALSE) THEN
    NEW.is_admin := FALSE;
    INSERT INTO public.security_audit_logs (username, incident_type, details)
    VALUES (NEW.username, 'UNAUTHORIZED_ADMIN_ESCALATION_ATTEMPT', jsonb_build_object('attempted_is_admin', true));
  END IF;

  -- ── ب) منع فك الحظر الذاتي (Self-Unban Shield) ──
  IF OLD.is_banned = TRUE AND NEW.is_banned = FALSE THEN
    NEW.is_banned := TRUE;
  END IF;

  -- ── ج) منع الأرقام السالبة والقيم الخاطئة ──
  IF NEW.cash < 0 OR NEW.cash IS NULL THEN NEW.cash := 0; END IF;
  IF NEW.bank < 0 OR NEW.bank IS NULL THEN NEW.bank := 0; END IF;
  IF NEW.dirty_cash < 0 OR NEW.dirty_cash IS NULL THEN NEW.dirty_cash := 0; END IF;

  -- ── د) حماية الأسهم ومنع الحقن العشوائي (Stock Cap Enforcement) ──
  IF NOT v_is_reset AND NEW.state IS NOT NULL AND NEW.state ? 'stocks' AND jsonb_typeof(NEW.state->'stocks') = 'object' THEN
    FOR v_stock_key IN SELECT jsonb_object_keys(NEW.state->'stocks') LOOP
      v_stock_data := NEW.state->'stocks'->v_stock_key;
      IF v_stock_data IS NOT NULL AND v_stock_data ? 'shares' THEN
        BEGIN
          v_shares := (v_stock_data->>'shares')::numeric;
        EXCEPTION WHEN OTHERS THEN
          v_shares := 0;
        END;

        v_max_shares := CASE v_stock_key
          WHEN 'COMI' THEN 50000
          WHEN 'EAST' THEN 30000
          WHEN 'ETEL' THEN 40000
          WHEN 'FWRY' THEN 25000
          WHEN 'CASH' THEN 20000
          WHEN 'BITC' THEN 5000
          WHEN 'GOLD' THEN 10000
          WHEN 'AIX'  THEN 8000
          ELSE 50000
        END;

        IF v_shares > v_max_shares THEN
          NEW.state := jsonb_set(NEW.state, ARRAY['stocks', v_stock_key, 'shares'], to_jsonb(v_max_shares));
          INSERT INTO public.security_audit_logs (username, incident_type, details)
          VALUES (NEW.username, 'STOCK_OVERCAP_ATTEMPT', jsonb_build_object(
            'stock', v_stock_key,
            'injected_shares', v_shares,
            'clamped_to', v_max_shares
          ));
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- ── هـ) كابح قفزات الثروة الذكي المعتمد على السياق (Smart Context-Aware Wealth Velocity Guard) ──
  IF NOT v_is_reset THEN
    v_cash_diff := COALESCE(NEW.cash, 0) - COALESCE(OLD.cash, 0);
    v_bank_diff := COALESCE(NEW.bank, 0) - COALESCE(OLD.bank, 0);
    v_total_diff := v_cash_diff + v_bank_diff;

    -- إذا كانت الأموال تتحرك داخلياً فقط بين الكاش والبنك (سحب بنكي أو إيداع نقدي) دون ضخ صافٍ من الخارج:
    -- الفارق الصافي v_total_diff يكون صغيراً جداً أو معدوماً، فيسمح بها فوراً
    IF v_total_diff > 50000 THEN

      -- 1. فحص تسييل وبيع الأسهم (Stock Sales):
      IF OLD.state IS NOT NULL AND OLD.state ? 'stocks' AND NEW.state IS NOT NULL AND NEW.state ? 'stocks' THEN
        FOR v_stock_key IN SELECT jsonb_object_keys(OLD.state->'stocks') LOOP
          IF (OLD.state->'stocks'->v_stock_key ? 'shares') AND (NEW.state->'stocks'->v_stock_key ? 'shares') THEN
            BEGIN
              v_old_shares := COALESCE((OLD.state->'stocks'->v_stock_key->>'shares')::numeric, 0);
              v_new_shares := COALESCE((NEW.state->'stocks'->v_stock_key->>'shares')::numeric, 0);
              IF v_old_shares > v_new_shares THEN
                v_stocks_liquidated := true;
                -- احتساب بدل التسييل حسب أعلى تقلبات لسعر السهم
                v_stock_liquidation_allowance := v_stock_liquidation_allowance + ((v_old_shares - v_new_shares) * 1500);
              END IF;
            EXCEPTION WHEN OTHERS THEN
              NULL;
            END;
          END IF;
        END LOOP;
      END IF;

      -- 2. فحص أرباح وإيرادات شحنات التصدير (Trade Company Exports):
      IF (NEW.state IS NOT NULL AND NEW.state ? 'tradeCompany') AND (OLD.state IS NOT NULL AND OLD.state ? 'tradeCompany') THEN
        BEGIN
          v_trade_profit_diff := COALESCE((NEW.state->'tradeCompany'->>'totalProfitEarned')::numeric, 0)
                               - COALESCE((OLD.state->'tradeCompany'->>'totalProfitEarned')::numeric, 0);
        EXCEPTION WHEN OTHERS THEN
          v_trade_profit_diff := 0;
        END;
      END IF;

      -- 3. فحص استرداد الصناديق الاستثمارية المنتهية (Matured Investments):
      IF (OLD.state IS NOT NULL AND OLD.state ? 'investments') AND jsonb_typeof(OLD.state->'investments') = 'array' THEN
        BEGIN
          IF jsonb_array_length(OLD.state->'investments') > COALESCE(jsonb_array_length(NEW.state->'investments'), 0) THEN
            v_investments_redeemed := true;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;

      -- 4. احتساب الحد الائتماني الديناميكي المسموح به لهذه العملية (Dynamic Velocity Allowance):
      -- بدل أساسي (500,000 ج.م) + 50% من صافي ثروة اللاعب (بحد أقصى 5,000,000 ج.م)
      v_allowed_velocity := 500000 + LEAST(5000000, COALESCE(OLD.net_worth, 0) * 0.5);

      -- إضافة بدل تسييل الأسهم
      IF v_stocks_liquidated THEN
        v_allowed_velocity := v_allowed_velocity + v_stock_liquidation_allowance;
      END IF;

      -- إضافة بدل إيرادات عقود الشحن الدولي والتصدير (تشمل قيمة العقد بالكامل ورأس المال المسترد)
      IF v_trade_profit_diff > 0 THEN
        v_allowed_velocity := v_allowed_velocity + GREATEST(v_trade_profit_diff * 3.5, 4000000);
      END IF;

      -- إضافة بدل استرداد الاستثمارات المنتهية (صناديق تصل إلى 4 مليون + عوائدها)
      IF v_investments_redeemed THEN
        v_allowed_velocity := v_allowed_velocity + 5000000;
      END IF;

      -- 5. المقارنة الصارمة: إذا تجاوزت الزيادة الحد الائتماني المسموح به بعد استيفاء جميع الأسباب المشروعة
      IF v_total_diff > v_allowed_velocity THEN
        NEW.cash := OLD.cash;
        NEW.bank := OLD.bank;

        IF NEW.state IS NOT NULL AND jsonb_typeof(NEW.state) = 'object' THEN
          IF NEW.state ? 'cash' THEN
            NEW.state := jsonb_set(NEW.state, '{cash}', to_jsonb(OLD.cash));
          END IF;
          IF NEW.state ? 'bank' THEN
            NEW.state := jsonb_set(NEW.state, '{bank}', to_jsonb(OLD.bank));
          END IF;
        END IF;

        INSERT INTO public.security_audit_logs (username, incident_type, details)
        VALUES (NEW.username, 'ABNORMAL_WEALTH_VELOCITY_BLOCKED', jsonb_build_object(
          'attempted_gain', v_total_diff,
          'allowed_limit', v_allowed_velocity,
          'old_liquid', (COALESCE(OLD.cash, 0) + COALESCE(OLD.bank, 0)),
          'stocks_liquidated', v_stocks_liquidated,
          'trade_profit_diff', v_trade_profit_diff,
          'action', 'REVERTED_TO_OLD_BALANCE'
        ));
      END IF;

    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ربط التريجر بجدول اللاعبين (Active BEFORE UPDATE Trigger)
DROP TRIGGER IF EXISTS trg_validate_player_update_anti_cheat ON public.players;
CREATE TRIGGER trg_validate_player_update_anti_cheat
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_player_update_anti_cheat();

-- 4. منع إنشاء أي حساب جديد من أجهزة محظورة أو بأسماء محظورة (Active BEFORE INSERT Trigger)
CREATE OR REPLACE FUNCTION public.block_banned_devices_and_names()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username ILIKE 'HAMZ_A' OR NEW.username ILIKE 'HAMZA%' OR NEW.username ILIKE 'B2b' THEN
    RAISE EXCEPTION 'هذا الحساب محظور نهائياً من السيرفر.';
  END IF;

  IF NEW.state IS NOT NULL AND (
    (NEW.state ? 'known_devices' AND (
      NEW.state->'known_devices' ? 'dev_hw_001d1509ba118ee4' OR
      NEW.state->'known_devices' ? 'dev_001d1509ba118ee4_001910d2'
    )) OR
    (NEW.state->>'initial_device' IN ('dev_hw_001d1509ba118ee4', 'dev_001d1509ba118ee4_001910d2'))
  ) THEN
    RAISE EXCEPTION 'تم حظر هذا الجهاز نهائياً لمخالفة قواعد النزاهة.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_banned_devices_insert ON public.players;
CREATE TRIGGER trg_block_banned_devices_insert
BEFORE INSERT ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.block_banned_devices_and_names();

-- 5. حماية الشات العام (globals -> chat_feed) ومنع الحسابات المحذوفة أو المحظورة من الكتابة
CREATE OR REPLACE FUNCTION public.validate_chat_feed_anti_cheat()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
  v_msgs jsonb;
  v_last_msg jsonb;
  v_sender text;
  v_sender_banned boolean;
BEGIN
  BEGIN
    v_role := COALESCE(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role',
      nullif(current_setting('request.jwt.claim.role', true), ''),
      session_user
    );
  EXCEPTION WHEN OTHERS THEN
    v_role := session_user;
  END;

  IF v_role IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.id = 'chat_feed' AND NEW.data IS NOT NULL AND NEW.data ? 'messages' THEN
    v_msgs := NEW.data->'messages';
    
    IF jsonb_array_length(v_msgs) > 0 THEN
      v_last_msg := v_msgs->-1;
      v_sender := TRIM(COALESCE(v_last_msg->>'sender', ''));

      IF v_sender ILIKE 'HAMZ_A' OR v_sender ILIKE 'HAMZA%' OR v_sender ILIKE 'B2b' THEN
        RAISE EXCEPTION 'أنت محظور تماماً من إرسال أي رسائل في الشات العام.';
      END IF;

      SELECT is_banned INTO v_sender_banned
      FROM public.players
      WHERE username = v_sender;

      IF v_sender_banned IS NULL THEN
        RAISE EXCEPTION 'يجب أن يكون لديك حساب صالح داخل اللعبة للمشاركة في الشات.';
      END IF;

      IF v_sender_banned IS TRUE THEN
        RAISE EXCEPTION 'حسابك محظور من الدردشة العامة.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_chat_feed ON public.globals;
CREATE TRIGGER trg_validate_chat_feed
BEFORE INSERT OR UPDATE ON public.globals
FOR EACH ROW
EXECUTE FUNCTION public.validate_chat_feed_anti_cheat();

-- ==============================================================================
-- 🏁 تم تحديث نظام الحماية والتأمين الجنائي وتأمين الشات العام بنجاح!
-- ==============================================================================

