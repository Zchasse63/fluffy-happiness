-- ===========================================================================
-- Meridian — Pre-seed a co-owner profile for Gabriel Pages.
-- ===========================================================================
-- TSG has two owners: Zach Chasse (zchasse89@gmail.com — see 0009) and
-- Gabriel Pages (gbpages55@gmail.com). Gabriel's profile already exists
-- in the system (synced from Glofox staff), but with an empty roles array
-- so he can't pass requireRole('owner','manager'). This promotes him.
--
-- `auth_user_id` stays NULL until his first sign-in; the callback at
-- app/auth/callback/route.ts performs the link via the link_my_profile
-- RPC (migration 0017), which matches by studio_id + lower(email) where
-- auth_user_id IS NULL — preventing a different Supabase auth user from
-- later hijacking an already-claimed profile.
--
-- Idempotent: runs cleanly on a fresh DB and on the live one. Mirrors
-- the pattern in 0009.
-- ===========================================================================

DO $$
DECLARE
  v_studio UUID := '11111111-1111-1111-1111-111111111111';
  v_email  TEXT := 'gbpages55@gmail.com';
  v_count  INTEGER;
BEGIN
  -- If a profile already exists for this email (Glofox-imported staff
  -- row, or a previous re-run), promote it. Append 'owner' only if not
  -- already present so re-runs are no-ops.
  UPDATE profiles
  SET roles = (
    CASE WHEN 'owner' = ANY(COALESCE(roles, ARRAY[]::TEXT[]))
      THEN roles
      ELSE COALESCE(roles, ARRAY[]::TEXT[]) || ARRAY['owner']::TEXT[]
    END
  )
  WHERE studio_id = v_studio
    AND LOWER(email) = LOWER(v_email);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Otherwise insert a bare-bones owner row. full_name is required so
  -- supply a placeholder; the next Glofox staff sync will overwrite it
  -- with the canonical name from the source-of-truth system.
  IF v_count = 0 THEN
    INSERT INTO profiles (studio_id, full_name, email, roles, auth_user_id)
    VALUES (v_studio, 'Gabriel Pages', v_email, ARRAY['owner']::TEXT[], NULL);
  END IF;
END $$;
