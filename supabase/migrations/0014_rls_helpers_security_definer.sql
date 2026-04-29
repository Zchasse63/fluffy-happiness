-- ===========================================================================
-- Mark RLS helper functions as SECURITY DEFINER to break recursion.
--
-- Bug: current_studio_id() falls through to a SELECT on profiles when the
-- JWT claim "request.jwt.claim.studio_id" is not set. That SELECT triggers
-- the profiles_studio_write RLS policy, whose USING expression calls
-- current_studio_id() — infinite recursion → "stack depth limit exceeded".
--
-- Production hid this because the JWT custom claim short-circuits the
-- COALESCE before the profiles SELECT runs. Any code path that lacks the
-- JWT claim (e.g. TEST_AUTH_BYPASS) hits the recursion on the first query
-- against a tenant-scoped table (class_instances, transactions, etc.).
--
-- Fix: run the helpers as the function owner (postgres) so the inner
-- profiles SELECT bypasses RLS. The functions still scope their lookup to
-- auth.uid() and only read studio_id / roles, so this does not widen the
-- effective surface — it just stops the policy evaluator from re-entering
-- itself.
-- ===========================================================================

-- Migration 0006 already pinned search_path on these helpers; reissuing
-- the SET here keeps 0014 self-contained for replay against a database
-- where 0006 hasn't run yet (search_path injection is the standard
-- SECURITY DEFINER footgun).
ALTER FUNCTION public.current_studio_id()  SECURITY DEFINER SET search_path = public, pg_temp;
ALTER FUNCTION public.current_user_roles() SECURITY DEFINER SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin()           SECURITY DEFINER SET search_path = public, pg_temp;
