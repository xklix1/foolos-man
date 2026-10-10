const { Client } = require('pg');

async function deploy() {
  const client = new Client({
    host: '77.37.122.34',
    port: 5432,
    user: 'postgres',
    password: 'SyyT3sjr2QKYk2H4LgS2YlfQK5ivQ6d7T3WjPIRA3s',
    database: 'postgres'
  });

  await client.connect();
  console.log('Connected to PostgreSQL database.');

  const sql = `
    CREATE OR REPLACE FUNCTION public.redeem_gift_code(
      p_code TEXT,
      p_username TEXT
    ) RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_gift RECORD;
      v_player RECORD;
      v_used_by TEXT[];
      v_reward NUMERIC;
      v_new_cash NUMERIC;
      v_new_worth NUMERIC;
      v_state JSONB;
      v_user_lower TEXT := LOWER(TRIM(p_username));
      v_code_norm TEXT := UPPER(TRIM(p_code));
    BEGIN
      -- 1. Lock gift code row exclusively with FOR UPDATE
      SELECT * INTO v_gift
      FROM public.gift_codes
      WHERE UPPER(TRIM(code)) = v_code_norm
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'كود الهدية غير موجود أو غير صالح.';
      END IF;

      v_used_by := COALESCE(v_gift.used_by, ARRAY[]::TEXT[]);

      -- Check if user already used this code
      IF v_user_lower = ANY(v_used_by) THEN
        RAISE EXCEPTION 'لقد قمت باستخدام كود الهدية هذا مسبقاً.';
      END IF;

      -- Check max uses
      IF ARRAY_LENGTH(v_used_by, 1) IS NOT NULL AND ARRAY_LENGTH(v_used_by, 1) >= COALESCE(v_gift.max_uses, 10000) THEN
        RAISE EXCEPTION 'تم بلوغ الحد الأقصى لعدد مرات استخدام هذا الكود.';
      END IF;

      -- 2. Lock player row exclusively with FOR UPDATE
      SELECT * INTO v_player
      FROM public.players
      WHERE LOWER(TRIM(username)) = v_user_lower
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'حساب اللاعب غير موجود.';
      END IF;

      v_reward := COALESCE(v_gift.reward_cash, 100000);
      v_new_cash := COALESCE(v_player.cash, 0) + v_reward;
      v_new_worth := COALESCE(v_player.net_worth, 0) + v_reward;

      v_state := COALESCE(v_player.state, '{}'::jsonb);
      v_state := jsonb_set(v_state, '{cash}', to_jsonb(v_new_cash));
      v_state := jsonb_set(v_state, '{netWorth}', to_jsonb(v_new_worth));
      v_state := jsonb_set(v_state, '{hasRedeemedGiftCode}', 'true'::jsonb);

      -- 3. Atomic update on gift_codes (user added to used_by)
      UPDATE public.gift_codes
      SET used_by = array_append(v_used_by, v_user_lower)
      WHERE UPPER(TRIM(code)) = v_code_norm;

      -- 4. Atomic update on players
      UPDATE public.players
      SET cash = v_new_cash,
          net_worth = v_new_worth,
          state = v_state,
          admin_modified_timestamp = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      WHERE LOWER(TRIM(username)) = v_user_lower;

      RETURN jsonb_build_object(
        'success', true,
        'rewardType', 'cash',
        'reward', v_reward,
        'rewardText', v_reward::TEXT || ' EGP كاش مالي'
      );
    END;
    $$;

    GRANT EXECUTE ON FUNCTION public.redeem_gift_code(TEXT, TEXT) TO anon, authenticated, service_role;
  `;

  await client.query(sql);
  console.log(' Atomic redeem_gift_code function successfully deployed to PostgreSQL!');
  await client.end();
}

deploy().catch(console.error);
