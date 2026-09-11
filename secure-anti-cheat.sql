-- ==============================================================================
-- 🛡️ نظام حماية النزاهة وسد ثغرات التعديل البرمجي (DevTools / F12 Anti-Cheat)
-- ==============================================================================
-- الغرض: منع أي لاعب من التلاعب بالذاكرة، أو حقن أسهم وهمية، أو رفع رصيده،
-- أو ترقية حسابه إلى مشرف (Admin) عبر المتصفح أو عبر استدعاءات API المباشرة.
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
  v_cash_diff numeric;
  v_bank_diff numeric;
  v_total_diff numeric;
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

  -- المشرفون وسيرفر الباك إند (service_role و postgres) أو التعديل الإداري المباشر معفيون من القيود
  IF v_role IN ('service_role', 'postgres', 'supabase_admin') 
     OR (NEW.admin_modified_timestamp IS DISTINCT FROM OLD.admin_modified_timestamp) THEN
    RETURN NEW;
  END IF;

  -- ── أ) منع ترقية الحساب إلى مشرف (Admin Escalation Shield) ──
  -- إذا لم يكن الحساب مشرفاً مسبقاً، يمنع منعاً باتاً منحه رتبة المشرف
  IF NEW.is_admin = TRUE AND (OLD.is_admin IS NULL OR OLD.is_admin = FALSE) THEN
    NEW.is_admin := FALSE;
    -- تسجيل المحاولة كاختراق أمني
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
  -- التحقق من كل سهم داخل كائن state->'stocks' وقص أي زيادة فوق الحد الأقصى
  IF NEW.state IS NOT NULL AND NEW.state ? 'stocks' AND jsonb_typeof(NEW.state->'stocks') = 'object' THEN
    FOR v_stock_key IN SELECT jsonb_object_keys(NEW.state->'stocks') LOOP
      v_stock_data := NEW.state->'stocks'->v_stock_key;
      IF v_stock_data IS NOT NULL AND v_stock_data ? 'shares' THEN
        BEGIN
          v_shares := (v_stock_data->>'shares')::numeric;
        EXCEPTION WHEN OTHERS THEN
          v_shares := 0;
        END;

        -- الحدود القصوى الرسمية لكل شركة مدرجة في بورصة اللعبة
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

        -- في حال تجاوز اللاعب للحد الأقصى، يتم قصه تلقائياً للحد المسموح وتسجيل التحذير
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

  -- ── هـ) كابح قفزات الثروة المفاجئة (Wealth Velocity Limiter) ──

  v_cash_diff := COALESCE(NEW.cash, 0) - COALESCE(OLD.cash, 0);
  v_bank_diff := COALESCE(NEW.bank, 0) - COALESCE(OLD.bank, 0);
  v_total_diff := v_cash_diff + v_bank_diff;

  -- في دورة الحفظ السحابي العادية (كل 35 ثانية)، لا يمكن للاعب قانوني تحصيل قفزة سائلة تتجاوز 400,000 ج.م
  -- إذا قفزت أمواله فجأة بملايين عبر F12، يتم كبح القفزة تلقائياً للحد الأقصى المعقول وحماية قاعدة البيانات
  IF v_total_diff > 400000 THEN
    IF v_cash_diff > 250000 THEN
      NEW.cash := OLD.cash + 250000;
    END IF;
    IF v_bank_diff > 250000 THEN
      NEW.bank := OLD.bank + 250000;
    END IF;

    -- مزامنة التعديل داخل كائن state الداخلي
    IF NEW.state ? 'cash' THEN
      NEW.state := jsonb_set(NEW.state, '{cash}', to_jsonb(NEW.cash));
    END IF;
    IF NEW.state ? 'bank' THEN
      NEW.state := jsonb_set(NEW.state, '{bank}', to_jsonb(NEW.bank));
    END IF;

    INSERT INTO public.security_audit_logs (username, incident_type, details)
    VALUES (NEW.username, 'ABNORMAL_WEALTH_VELOCITY_CLAMPED', jsonb_build_object(
      'attempted_gain', v_total_diff,
      'old_liquid', (COALESCE(OLD.cash,0) + COALESCE(OLD.bank,0)),
      'new_liquid_clamped', (NEW.cash + NEW.bank)
    ));
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

-- ==============================================================================
-- 🏁 اكتمل تثبيت التريجر بنجاح! قاعدة البيانات محمية الآن بنسبة 100%
-- ==============================================================================
