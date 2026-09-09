-- ==============================================================================
-- 🚀 استعادة صلاحيات قاعدة بيانات رأس المال (Ras ALmal Tycoon)
-- قم بنسخ هذا الكود بالكامل ولصقه في:
-- Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. جدول اللاعبين (players): حل مشكلة تسجيل الحسابات وحفظ تقدم اللعبة
GRANT ALL ON TABLE public.players TO anon, authenticated, service_role;
ALTER TABLE public.players DISABLE ROW LEVEL SECURITY;

-- 2. جدول المتغيرات العامة (globals): حل مشكلة إرسال رسائل الشات والتحديثات
GRANT ALL ON TABLE public.globals TO anon, authenticated, service_role;
ALTER TABLE public.globals DISABLE ROW LEVEL SECURITY;

-- 3. جدول صندوق البريد (mailbox)
GRANT ALL ON TABLE public.mailbox TO anon, authenticated, service_role;
ALTER TABLE public.mailbox DISABLE ROW LEVEL SECURITY;

-- 4. جداول المزادات العلنية (live_auctions & auction_bids)
GRANT ALL ON TABLE public.live_auctions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.auction_bids TO anon, authenticated, service_role;
ALTER TABLE public.live_auctions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids DISABLE ROW LEVEL SECURITY;

-- 5. جدول الشركات والتحالفات (corporations)
GRANT ALL ON TABLE public.corporations TO anon, authenticated, service_role;
ALTER TABLE public.corporations DISABLE ROW LEVEL SECURITY;

-- 6. جداول الحوالات وطلبات التحويل (transfers & transfer_requests)
GRANT ALL ON TABLE public.transfers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.transfer_requests TO anon, authenticated, service_role;
ALTER TABLE public.transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_requests DISABLE ROW LEVEL SECURITY;

-- 7. جداول الاستحواذ وأكواد الهدايا (distressed_acquisitions & gift_codes)
GRANT ALL ON TABLE public.distressed_acquisitions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.gift_codes TO anon, authenticated, service_role;
ALTER TABLE public.distressed_acquisitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_codes DISABLE ROW LEVEL SECURITY;

-- 8. منح الصلاحيات العامة على المخطط العام public والتسلسلات
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- إشعار نجاح
SELECT '✅ تم استعادة كافة الصلاحيات بنجاح لجميع الجداول والشات والتسجيل!' AS status;
