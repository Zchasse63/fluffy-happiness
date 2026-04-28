-- ===========================================================================
-- Pin search_path on every SQL/PLPGSQL function to defeat schema-shadow
-- attacks (Supabase advisor 0011), and move pgvector out of `public`.
-- ===========================================================================

ALTER FUNCTION public.set_updated_at()           SET search_path = public, pg_temp;
ALTER FUNCTION public.current_studio_id()        SET search_path = public, pg_temp;
ALTER FUNCTION public.current_user_roles()       SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin()                 SET search_path = public, pg_temp;
ALTER FUNCTION public.book_class_atomic(UUID, UUID, UUID, TEXT, TEXT)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.apply_credit_ledger(UUID, TEXT, INTEGER, TEXT, UUID, UUID, UUID)
  SET search_path = public, pg_temp;

CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;
