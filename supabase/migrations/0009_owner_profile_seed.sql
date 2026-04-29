-- ===========================================================================
-- Meridian — Pre-seed an owner profile for the project owner.
-- ===========================================================================
-- The Glofox import populated multiple admin profiles. The actual project
-- owner uses zchasse89@gmail.com — make sure exactly one profile with that
-- email exists and carries the 'owner' role so the magic-link callback
-- can attach auth.uid() on first sign-in.
--
-- `auth_user_id` stays NULL until that first sign-in; the callback at
-- app/auth/callback/route.ts performs the link via:
--   UPDATE profiles SET auth_user_id = $uid
--   WHERE studio_id = $sid AND email = $email AND auth_user_id IS NULL
-- The `auth_user_id IS NULL` filter prevents a different Supabase auth
-- user from later hijacking an already-claimed profile.
--
-- Idempotent: runs cleanly on a fresh DB and on the live one.
-- ===========================================================================

DO $$
DECLARE
  v_studio UUID := '11111111-1111-1111-1111-111111111111';
  v_email  TEXT := 'zchasse89@gmail.com';
  v_count  INTEGER;
BEGIN
  -- If a Glofox-imported profile already carries this email, promote it.
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

  -- Otherwise insert a bare-bones owner row.
  IF v_count = 0 THEN
    INSERT INTO profiles (studio_id, full_name, email, roles, auth_user_id)
    VALUES (v_studio, 'Zach Chasse', v_email, ARRAY['owner']::TEXT[], NULL);
  END IF;
END $$;
