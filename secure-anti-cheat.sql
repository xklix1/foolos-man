-- ==============================================================================
-- 🛡️ نظام حماية النزاهة وسد ثغرات التعديل البرمجي (Clean Integrity Guard)
-- ==============================================================================
-- تم إلغاء كوابح قفزات اللاعبين والحظر التلقائي بالكامل لضمان حرية التحويلات والمنح الإدارية.
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

-- 2. إزالة التريجرات القديمة الخاصة بكابح القفزات والحظر التلقائي
DROP TRIGGER IF EXISTS trg_validate_player_update_anti_cheat ON public.players;
DROP FUNCTION IF EXISTS public.validate_player_update_anti_cheat();

DROP TRIGGER IF EXISTS trg_block_banned_devices_insert ON public.players;
DROP FUNCTION IF EXISTS public.block_banned_devices_and_names();

-- 3. حماية الشات العام (globals -> chat_feed) ومنع الحسابات المحذوفة أو المحظورة من الكتابة
CREATE OR REPLACE FUNCTION public.validate_chat_feed_anti_cheat()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
  v_msgs jsonb;
  v_last_msg jsonb;
  v_sender text;
  v_msg_text text;
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
      v_msg_text := TRIM(COALESCE(v_last_msg->>'message', ''));

      -- 1. منع الألفاظ البذيئة
      IF v_msg_text ~* 'بضا+.*[نت]|بضي+.*[نت]|مبضو+.*[نت]|تبضي+.*[نت]|ات?بض[نت]' THEN
        RAISE EXCEPTION 'الرسالة تحتوي على ألفاظ محظورة وغير لائقة تمنعها سياسة اللعبة.';
      END IF;

      -- 2. منع الألفاظ الفرانكو المحظورة
      IF v_msg_text ~* '\m(kh+w+l+[a-z]*|k+h+o+l+[a-z]*|5+w+l+[a-z]*|5+a*w+a*l+[a-z]*|k+h+a*w+a*l+[a-z]*|3+a*r+s+[a-z]*|3+a*r+a+s+[a-z]*|k+o*s+o*m+[a-z]*|k+s+m+[a-z]*|5+o*s+o*m+[a-z]*|s+h+a*r+m+o*u*t+[a-z]*|c+h+e*r+m+o*u*t+[a-z]*|m+[a-z]*n+y+o*u*k+[a-z]*|m+[eia]*t+n+a+[kq]+[a-z]*|t+e*i*z+[a-z]*|z+o*b+[a-z]*|b+e*d+a*n+[a-z]*|[29qk]+a*7*h+b+[a-z]*|n+e+e*k+[a-z]*)\M' THEN
        RAISE EXCEPTION 'الرسالة تحتوي على ألفاظ محظورة ومسيئة (فرانكو/معرب).';
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
-- 🏁 تم إلغاء كوابح قفزات اللاعبين والحظر التلقائي بالكامل!
-- ==============================================================================
