-- ==============================================================================
-- 🚀 RAS AL-MAL (FOOLOS MAN) — FIX PLAYERS REGISTRATION PERMISSION
-- الهدف: حل مشكلة "permission denied for table players" فوراً عند تسجيل حساب جديد
-- ==============================================================================

-- 1. منح إذن القراءة والإضافة لدور anon (المتصفحات) و authenticated
GRANT SELECT, INSERT ON public.players TO anon, authenticated;

-- 2. منع التعديل المباشر أو الحذف من المتصفح للحفاظ على حماية اللعبة من الغش
REVOKE UPDATE, DELETE ON public.players FROM anon;
REVOKE UPDATE, DELETE ON public.players FROM authenticated;

-- 3. تنظيف أي سياسات سابقة للإدراج
DROP POLICY IF EXISTS "Allow anon registration" ON public.players;
DROP POLICY IF EXISTS "Public can insert players" ON public.players;

-- 4. تطبيق سياسة حماية صارمة لمنع إنشاء حسابات بأموال خيالية أو حسابات أدمن
CREATE POLICY "Allow anon registration"
ON public.players FOR INSERT
TO anon, authenticated
WITH CHECK (
  username IS NOT NULL AND
  char_length(trim(username)) >= 3 AND
  char_length(trim(username)) <= 30 AND
  (is_admin IS NOT TRUE) AND
  (is_banned IS NOT TRUE) AND
  (cash <= 5000) AND
  (bank = 0) AND
  (dirty_cash = 0) AND
  (net_worth <= 5000)
);
