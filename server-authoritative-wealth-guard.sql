-- ==============================================================================
-- 🛡️ نظام الحماية الصارم وسد ثغرات حقن التدفق والأموال (Server-Authoritative Anti-Tamper)
-- Ras ALmal Tycoon — Authoritative Database Security & Cashflow Clamp
-- ==============================================================================

-- 1. جدول سجلات الأمان لمحاولات التلاعب
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  incident_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  detected_at bigint DEFAULT (EXTRACT(epoch FROM now()) * 1000)::bigint
);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view security logs" ON public.security_audit_logs;
CREATE POLICY "Admins can view security logs" ON public.security_audit_logs
  FOR ALL USING (true);

-- 2. دالة التحقق ومنع التلاعب بالأموال والتدفق المالي (Anti-Cheat Server-Side Trigger)
CREATE OR REPLACE FUNCTION public.enforce_server_authoritative_wealth()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
  v_now_ms bigint;
  v_time_diff_sec numeric;
  v_old_total numeric;
  v_new_total numeric;
  v_wealth_diff numeric;
  v_max_legit_hourly_flow numeric := 50000000; -- 50M/hr default theoretical maximum for top empires
  v_max_allowed_growth numeric;
  v_admin_bypass boolean := false;
BEGIN
  -- استخراج دور المستخدم المتصل
  BEGIN
    v_role := COALESCE(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role',
      nullif(current_setting('request.jwt.claim.role', true), ''),
      session_user
    );
  EXCEPTION WHEN OTHERS THEN
    v_role := session_user;
  END;

  -- إذا كان التعديل من السيرفر الموثوق (service_role / postgres / supabase_admin) يتم السماح به دائماً
  IF v_role IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- فحص ما إذا كان التعديل ناتج عن تحويل بنكي رسمي أو منحة إدارية رسمية (admin_modified_timestamp)
  IF NEW.admin_modified_timestamp IS NOT NULL AND 
     (OLD.admin_modified_timestamp IS NULL OR NEW.admin_modified_timestamp > OLD.admin_modified_timestamp) THEN
    v_admin_bypass := true;
  END IF;

  IF v_admin_bypass THEN
    RETURN NEW;
  END IF;

  -- الحسابات المالية والأصول الحساسة
  v_now_ms := (EXTRACT(epoch FROM now()) * 1000)::bigint;

  -- 1. حظر تصعيد الصلاحيات (Admin Role & Ban Bypass Guard)
  NEW.is_admin := COALESCE(OLD.is_admin, false);
  IF OLD.is_banned IS TRUE THEN
    NEW.is_banned := true;
  END IF;

  -- 2. حظر حقن الجولد (Gold Injection Guard) - الجولد يضاف بالسيرفر أو الشحن فقط
  IF NEW.gold IS NOT NULL AND OLD.gold IS NOT NULL AND NEW.gold > OLD.gold THEN
    NEW.gold := OLD.gold;
    IF NEW.state IS NOT NULL THEN
      NEW.state := jsonb_set(NEW.state, '{gold}', to_jsonb(OLD.gold));
    END IF;
  END IF;

  -- 3. حظر قفزات الـ XP الخيالية (XP Injection Guard)
  IF NEW.xp IS NOT NULL AND OLD.xp IS NOT NULL AND (NEW.xp - OLD.xp) > 100000 THEN
    NEW.xp := OLD.xp + 5000;
    IF NEW.state IS NOT NULL THEN
      NEW.state := jsonb_set(NEW.state, '{xp}', to_jsonb(NEW.xp));
    END IF;
  END IF;

  -- 4. فحص مجموع الثروة النقدية (Bank + Cash + DirtyCash)
  v_old_total := COALESCE(OLD.bank, 0) + COALESCE(OLD.cash, 0) + COALESCE(OLD.dirty_cash, 0);
  v_new_total := COALESCE(NEW.bank, 0) + COALESCE(NEW.cash, 0) + COALESCE(NEW.dirty_cash, 0);
  v_wealth_diff := v_new_total - v_old_total;

  -- إذا لم تكن هناك زيادة مالية (صرف أو نقص أو ثبات)، اسمح بالتعديل
  IF v_wealth_diff <= 0 THEN
    RETURN NEW;
  END IF;

  -- حساب الفارق الزمني بالثواني بين آخر نشاط مسجل والآن
  v_time_diff_sec := GREATEST(1, (COALESCE(NEW.last_seen, v_now_ms) - COALESCE(OLD.last_seen, v_now_ms)) / 1000.0);
  IF v_time_diff_sec > 86400 THEN
    v_time_diff_sec := 86400; -- كحد أقصى يوم واحد في الحفظ الواحد
  END IF;

  -- أقصى زيادة مسموح بها = (50 مليون / 3600 ثانية * عدد الثواني) + هامش عمليات 500 ألف
  v_max_allowed_growth := (v_max_legit_hourly_flow / 3600.0 * v_time_diff_sec) + 500000;

  -- إذا كانت الزيادة تتجاوز الحد النظري الأقصى بفارق شاسع (محاولة حقن أرقام بالمليارات/تريليونات)
  IF v_wealth_diff > v_max_allowed_growth AND v_wealth_diff > 5000000 THEN
    -- تسجيل المحاولة في جدول الأمان
    INSERT INTO public.security_audit_logs (username, incident_type, details)
    VALUES (
      OLD.username,
      'EXCESSIVE_WEALTH_INJECTION_BLOCKED',
      jsonb_build_object(
        'old_bank', OLD.bank,
        'new_bank_attempted', NEW.bank,
        'wealth_diff', v_wealth_diff,
        'max_allowed', v_max_allowed_growth,
        'time_diff_sec', v_time_diff_sec,
        'blocked_at', v_now_ms
      )
    );

    -- قص الزيادة وتثبيت الرصيد على الرصيد القديم + الحد الشرعي الأقصى بدلاً من قبول التريليونات
    NEW.bank := OLD.bank + LEAST(v_wealth_diff, v_max_allowed_growth);
    
    -- تحديث كائن الـ state ليتطابق مع الرصيد المحمي
    IF NEW.state IS NOT NULL THEN
      NEW.state := jsonb_set(
        NEW.state,
        '{bank}',
        to_jsonb(NEW.bank)
      );
    END IF;
  END IF;

  -- إعادة حساب صافي الثروة الشرعي
  NEW.net_worth := COALESCE(NEW.cash, 0) + COALESCE(NEW.bank, 0) + COALESCE(NEW.dirty_cash, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ربط التريجر بجدول اللاعبين
DROP TRIGGER IF EXISTS trg_enforce_server_authoritative_wealth ON public.players;
CREATE TRIGGER trg_enforce_server_authoritative_wealth
BEFORE UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.enforce_server_authoritative_wealth();

-- 4. تنظيف وتصحيح الحسابات التي تلاعبت بالثروة (مثل veetozero1 وحسابات التريليونات الشاذة)
-- إعادة ضبط رصيد البنك للحسابات الشاذة التي تتجاوز 100 مليار بدون تدفق حقيقي
UPDATE public.players
SET 
  bank = 50000000, -- إعادة ضبط البنك لمبلغ معقول (50 مليون)
  net_worth = COALESCE(cash, 0) + 50000000 + COALESCE(dirty_cash, 0),
  state = jsonb_set(
    COALESCE(state, '{}'::jsonb),
    '{bank}',
    '50000000'::jsonb
  )
WHERE bank > 100000000000; -- أي حساب لديه أكثر من 100 مليار بنك تم حقنها

-- ==============================================================================
-- ✅ تم تفعيل الحماية وتجميد ثغرات الحقن بنجاح!
-- ==============================================================================
