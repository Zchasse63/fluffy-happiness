-- ===========================================================================
-- First-sign-in profile-link RPC.
--
-- Bug it solves: the auth/callback handler ran the link UPDATE under the
-- newly-authenticated user's own context. RLS on profiles requires
-- studio_id = current_studio_id(), which falls back to a profiles
-- lookup keyed on auth.uid() — but the user has no linked profile yet,
-- so current_studio_id() returns NULL, the policy fails, the UPDATE
-- matches 0 rows, and the callback bounces to /login?error=not_authorized.
--
-- Fix: a SECURITY DEFINER RPC that does the link with elevated privileges
-- but tightly scoped — it only touches the row whose lower(email) matches
-- the email on the calling user's JWT. There's no input parameter; the
-- function reads auth.email() server-side, so a caller can't link a
-- different profile than their own verified email.
--
-- Returns:
--   linked_profile_id  the profile that was linked (NULL if none matched)
--   already_linked     true if the caller's auth.uid() was already on a
--                      profile (re-login path — proceed)
-- ===========================================================================

CREATE OR REPLACE FUNCTION link_my_profile()
RETURNS TABLE(linked_profile_id UUID, already_linked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_email TEXT := lower(auth.email());
  v_id    UUID;
BEGIN
  IF v_uid IS NULL OR v_email IS NULL OR v_email = '' THEN
    -- No JWT or no email — refuse.
    RETURN QUERY SELECT NULL::UUID, FALSE;
    RETURN;
  END IF;

  -- Already-linked check first: idempotent for re-logins, and lets the
  -- handler distinguish "already in" from "not on the allowlist".
  SELECT p.id INTO v_id
  FROM profiles p
  WHERE p.auth_user_id = v_uid
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT v_id, TRUE;
    RETURN;
  END IF;

  -- Atomic link: only links a row if its email matches AND it has no
  -- auth_user_id yet. The .is_null check stops a hostile second user
  -- from stealing a previously-linked profile.
  UPDATE profiles p
  SET    auth_user_id = v_uid,
         updated_at   = NOW()
  WHERE  lower(p.email) = v_email
    AND  p.auth_user_id IS NULL
  RETURNING p.id INTO v_id;

  RETURN QUERY SELECT v_id, FALSE;
END;
$$;

REVOKE ALL ON FUNCTION link_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION link_my_profile() TO authenticated, service_role;
