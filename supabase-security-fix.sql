-- ============================================================
-- Amirnet — Security Hardening Script
-- Run this in Supabase Dashboard → SQL Editor → New query
--
-- Fixes:
--   1. Overly-permissive battle table RLS policies
--   2. Missing SET search_path on SECURITY DEFINER functions
--   3. increment_xp must only update the calling user's own XP
-- ============================================================


-- ── 1. ADD OWNERSHIP COLUMNS ──────────────────────────────────────────
-- Needed so RLS can verify who created the room / who owns a player row.
-- IF NOT EXISTS is safe to run multiple times.

ALTER TABLE public.battle_rooms
  ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id);

ALTER TABLE public.battle_players
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);


-- ── 2. QUESTION-TIME COLUMN (if you haven't run this yet) ─────────────
ALTER TABLE public.battle_rooms
  ADD COLUMN IF NOT EXISTS question_time_ms INTEGER NOT NULL DEFAULT 12000;


-- ── 3. REPLACE battle_rooms POLICIES ─────────────────────────────────
-- Drop the old catch-all policy first.
DROP POLICY IF EXISTS "battle_rooms_all"    ON public.battle_rooms;
DROP POLICY IF EXISTS "battle_rooms_select" ON public.battle_rooms;
DROP POLICY IF EXISTS "battle_rooms_insert" ON public.battle_rooms;
DROP POLICY IF EXISTS "battle_rooms_update" ON public.battle_rooms;
DROP POLICY IF EXISTS "battle_rooms_delete" ON public.battle_rooms;

-- Anyone can read a room (needed to join by code).
CREATE POLICY "battle_rooms_select"
  ON public.battle_rooms FOR SELECT
  USING (true);

-- Only authenticated users can create rooms, and they must set themselves
-- as the creator so the UPDATE policy can verify ownership later.
CREATE POLICY "battle_rooms_insert"
  ON public.battle_rooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND creator_id = auth.uid());

-- Only the room creator can change status (start / finish the game).
CREATE POLICY "battle_rooms_update"
  ON public.battle_rooms FOR UPDATE
  USING (creator_id = auth.uid());

-- Rooms are cleaned up server-side only — no client deletes.
-- (Leave this policy absent to block all client DELETEs.)


-- ── 4. REPLACE battle_players POLICIES ───────────────────────────────
DROP POLICY IF EXISTS "battle_players_all"    ON public.battle_players;
DROP POLICY IF EXISTS "battle_players_select" ON public.battle_players;
DROP POLICY IF EXISTS "battle_players_insert" ON public.battle_players;
DROP POLICY IF EXISTS "battle_players_update" ON public.battle_players;
DROP POLICY IF EXISTS "battle_players_delete" ON public.battle_players;

-- Everyone in a room can see all player rows (for the scoreboard).
CREATE POLICY "battle_players_select"
  ON public.battle_players FOR SELECT
  USING (true);

-- Any authenticated user may join a room (insert a player row for themselves).
CREATE POLICY "battle_players_insert"
  ON public.battle_players FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Players can only update their own score row.
CREATE POLICY "battle_players_update"
  ON public.battle_players FOR UPDATE
  USING (user_id = auth.uid());


-- ── 5. FIX handle_new_user — SET search_path ─────────────────────────
-- Prevents a malicious extension from shadowing 'profiles' or 'auth'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth        -- ← hardened
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Re-attach the trigger (idempotent).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 6. FIX increment_xp — search_path + self-only enforcement ─────────
-- Three protections added:
--   a) SET search_path = public  → no search-path hijacking
--   b) auth.uid() check          → caller can only update THEIR OWN XP
--   c) points range check        → prevents awarding absurd amounts
CREATE OR REPLACE FUNCTION public.increment_xp(user_uuid UUID, points INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public             -- ← hardened
AS $$
BEGIN
  -- (a) Must be called by an authenticated session
  IF auth.uid() IS NULL THEN RETURN; END IF;

  -- (b) A user can only increment their own XP, never someone else's
  IF user_uuid <> auth.uid() THEN RETURN; END IF;

  -- (c) Sanity-check the points value (1–500 per call is reasonable)
  IF points <= 0 OR points > 500 THEN RETURN; END IF;

  UPDATE public.profiles
  SET    xp_points = xp_points + points
  WHERE  id = user_uuid;
END;
$$;


-- ── DONE ──────────────────────────────────────────────────────────────
-- After running this script, redeploy your React app so the new
-- creator_id / user_id fields are sent on every Supabase insert.
-- No other React changes are needed — the existing awardXP() call
-- already passes supabaseUser.id as user_uuid, which now matches auth.uid().
