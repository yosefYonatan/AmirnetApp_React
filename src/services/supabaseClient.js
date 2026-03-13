import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const isSupabaseReady = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseReady
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ==========================================
// SQL SCHEMA — run in Supabase SQL Editor
// ==========================================
//
// -- 1. Profiles (auto-created on signup, XP leaderboard)
// CREATE TABLE IF NOT EXISTS public.profiles (
//   id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
//   email       TEXT,
//   full_name   TEXT,
//   department  TEXT DEFAULT 'other',   -- 'cs' | 'engineering' | 'other'
//   xp_points   INTEGER NOT NULL DEFAULT 0,
//   created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
//
// -- Auto-create profile row on sign-up
// CREATE OR REPLACE FUNCTION public.handle_new_user()
// RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
// BEGIN
//   INSERT INTO public.profiles (id, email)
//   VALUES (NEW.id, NEW.email)
//   ON CONFLICT (id) DO NOTHING;
//   RETURN NEW;
// END;
// $$;
//
// DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
// CREATE TRIGGER on_auth_user_created
//   AFTER INSERT ON auth.users
//   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
//
// -- 2. User vocabulary + SRS data
// CREATE TABLE IF NOT EXISTS public.user_vocabulary (
//   id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
//   word             TEXT NOT NULL,
//   status           TEXT NOT NULL CHECK (status IN ('known','unknown','uncertain')),
//   next_review_date BIGINT NOT NULL DEFAULT 0,   -- Unix ms timestamp
//   interval_days    REAL  NOT NULL DEFAULT 1,
//   repetitions      INT   NOT NULL DEFAULT 0,
//   ease_factor      REAL  NOT NULL DEFAULT 2.5,
//   difficulty_level INT   NOT NULL DEFAULT 1,
//   updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
//   UNIQUE(user_id, word)
// );
//
// -- 3. Row-Level Security
// ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
// ALTER TABLE public.user_vocabulary ENABLE ROW LEVEL SECURITY;
//
// -- Profiles: owner can read/update; everyone can read for leaderboard
// CREATE POLICY "profiles_select_all"  ON public.profiles FOR SELECT USING (true);
// CREATE POLICY "profiles_update_own"  ON public.profiles FOR UPDATE USING (auth.uid() = id);
//
// -- Vocabulary: owner only
// CREATE POLICY "vocab_all_own" ON public.user_vocabulary FOR ALL USING (auth.uid() = user_id);
//
// -- 4. XP increment RPC (runs as definer to avoid policy bypass issues)
// CREATE OR REPLACE FUNCTION public.increment_xp(user_uuid UUID, points INTEGER)
// RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
// BEGIN
//   UPDATE public.profiles
//   SET xp_points = xp_points + points
//   WHERE id = user_uuid;
// END;
// $$;
//
// -- 5. Battle rooms (multiplayer)
// CREATE TABLE IF NOT EXISTS public.battle_rooms (
//   code         TEXT PRIMARY KEY,               -- 6-char room code
//   host_id      TEXT NOT NULL,                  -- display name of host
//   unit_index   INTEGER NOT NULL DEFAULT 0,     -- which vocab unit (0-based)
//   status       TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','playing','done')),
//   question_idx INTEGER NOT NULL DEFAULT 0,     -- current question index
//   started_at   TIMESTAMPTZ,
//   created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
//
// -- 6. Battle players
// CREATE TABLE IF NOT EXISTS public.battle_players (
//   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   room_code   TEXT NOT NULL REFERENCES public.battle_rooms(code) ON DELETE CASCADE,
//   player_name TEXT NOT NULL,
//   score       INTEGER NOT NULL DEFAULT 0,
//   is_bot      BOOLEAN NOT NULL DEFAULT FALSE,
//   joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
//
// -- Indexes for fast room lookups
// CREATE INDEX IF NOT EXISTS battle_players_room_idx ON public.battle_players(room_code);
//
// -- RLS for battle tables (public read/write — rooms are ephemeral)
// ALTER TABLE public.battle_rooms   ENABLE ROW LEVEL SECURITY;
// ALTER TABLE public.battle_players ENABLE ROW LEVEL SECURITY;
//
// CREATE POLICY "battle_rooms_all"   ON public.battle_rooms   FOR ALL USING (true) WITH CHECK (true);
// CREATE POLICY "battle_players_all" ON public.battle_players FOR ALL USING (true) WITH CHECK (true);
//
// -- Enable Realtime for battle tables
// -- (run in Supabase Dashboard → Database → Replication → enable battle_rooms + battle_players)
