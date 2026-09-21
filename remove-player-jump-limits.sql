-- ==============================================================================
-- 🚀 إزالة كوابح وحماية قفزات اللاعبين والحظر التلقائي بالكامل
-- Remove All Player Jump Limits, Velocity Guards, and Auto Device Bans
-- ==============================================================================

-- 1. حذف تريجر كابح قفزات الثروة وفحص الأجهزة من جدول اللاعبين
DROP TRIGGER IF EXISTS trg_validate_player_update_anti_cheat ON public.players;
DROP FUNCTION IF EXISTS public.validate_player_update_anti_cheat();

-- 2. حذف تريجر حظر الأجهزة عند التسجيل
DROP TRIGGER IF EXISTS trg_block_banned_devices_insert ON public.players;
DROP FUNCTION IF EXISTS public.block_banned_devices_and_names();

-- 3. تنظيف أي حظر سابق لجميع اللاعبين والأجهزة
UPDATE public.players 
SET is_banned = false,
    state = jsonb_set(
      COALESCE(state, '{}'::jsonb),
      '{isBanned}',
      'false'::jsonb
    )
WHERE is_banned = true;

TRUNCATE TABLE public.banned_devices;

-- ==============================================================================
-- ✅ تم حذف كابح قفزات اللاعبين وفك الحظر عن كافة الحسابات والأجهزة بنجاح!
-- ==============================================================================
