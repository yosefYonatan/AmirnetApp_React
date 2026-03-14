-- ============================================================
-- Amirnet App — Full Supabase Schema
-- Copy-paste this entire file into:
--   Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================


-- ── 1. PROFILES ──────────────────────────────────────────────────────
-- Stores display name (username), department, and XP points.
-- One row per Supabase Auth user, auto-created on signup via trigger.

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,                                   -- internal fake email (never shown)
  full_name   TEXT,                                   -- this is the USERNAME shown publicly
  department  TEXT        NOT NULL DEFAULT 'other',   -- 'cs' | 'engineering' | 'other'
  xp_points   INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-create profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',   -- username passed during signUp()
      split_part(NEW.email, '@', 1)           -- fallback: strip @amirnet.app
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 2. USER VOCABULARY + SRS ──────────────────────────────────────────
-- One row per (user, word). Stores status and SM-2 spaced-repetition data.

CREATE TABLE IF NOT EXISTS public.user_vocabulary (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word             TEXT        NOT NULL,
  status           TEXT        NOT NULL CHECK (status IN ('known','unknown','uncertain')),
  next_review_date BIGINT      NOT NULL DEFAULT 0,   -- Unix ms timestamp
  interval_days    REAL        NOT NULL DEFAULT 1,
  repetitions      INT         NOT NULL DEFAULT 0,
  ease_factor      REAL        NOT NULL DEFAULT 2.5,
  difficulty_level INT         NOT NULL DEFAULT 1,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, word)
);


-- ── 3. BATTLE ROOMS ──────────────────────────────────────────────────
-- Ephemeral multiplayer rooms. 6-char code is the primary key.

CREATE TABLE IF NOT EXISTS public.battle_rooms (
  code         TEXT        PRIMARY KEY,               -- 6-char room code shown to players
  host_id      TEXT        NOT NULL,                  -- display name of room creator
  unit_index   INTEGER     NOT NULL DEFAULT 0,        -- which vocab unit (0-based)
  status       TEXT        NOT NULL DEFAULT 'waiting'
                           CHECK (status IN ('waiting','playing','done')),
  question_idx INTEGER     NOT NULL DEFAULT 0,        -- current question being shown
  started_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── 4. BATTLE PLAYERS ─────────────────────────────────────────────────
-- One row per player in a room (including bots).

CREATE TABLE IF NOT EXISTS public.battle_players (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code   TEXT        NOT NULL REFERENCES public.battle_rooms(code) ON DELETE CASCADE,
  player_name TEXT        NOT NULL,
  score       INTEGER     NOT NULL DEFAULT 0,
  is_bot      BOOLEAN     NOT NULL DEFAULT FALSE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS battle_players_room_idx
  ON public.battle_players(room_code);


-- ── 5. ROW LEVEL SECURITY ────────────────────────────────────────────

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_rooms   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_players ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read (leaderboard), only owner can update
-- Note: DROP POLICY IF EXISTS + CREATE POLICY works on PG14/15/16 (Supabase default).
--       CREATE POLICY IF NOT EXISTS requires PG17 and is NOT used here.
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Vocabulary: owner only
DROP POLICY IF EXISTS "vocab_all_own" ON public.user_vocabulary;
CREATE POLICY "vocab_all_own"
  ON public.user_vocabulary FOR ALL USING (auth.uid() = user_id);

-- Battle tables: fully public (rooms are ephemeral / short-lived)
DROP POLICY IF EXISTS "battle_rooms_all" ON public.battle_rooms;
CREATE POLICY "battle_rooms_all"
  ON public.battle_rooms   FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "battle_players_all" ON public.battle_players;
CREATE POLICY "battle_players_all"
  ON public.battle_players FOR ALL USING (true) WITH CHECK (true);


-- ── 6. XP INCREMENT RPC ───────────────────────────────────────────────
-- Runs as SECURITY DEFINER so it can bypass RLS to update XP.

CREATE OR REPLACE FUNCTION public.increment_xp(user_uuid UUID, points INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET xp_points = xp_points + points
  WHERE id = user_uuid;
END;
$$;


-- ── 7. REALTIME ───────────────────────────────────────────────────────
-- Enable Realtime so BattlePage can subscribe to live room/player changes.
-- Run these lines AFTER creating the tables above.

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;       -- live leaderboard XP updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_players;

-- ── DONE ──────────────────────────────────────────────────────────────
-- After running this script:
-- 1. Copy your Project URL + anon key from:
--    Supabase Dashboard → Project Settings → API
-- 2. Add them to .env.local:
--    VITE_SUPABASE_URL=https://xxxx.supabase.co
--    VITE_SUPABASE_ANON_KEY=eyJ...
-- 3. Add ANTHROPIC_API_KEY to Vercel environment variables (Settings → Environment Variables)
