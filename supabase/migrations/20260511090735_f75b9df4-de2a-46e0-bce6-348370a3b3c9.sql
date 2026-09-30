
-- 1) user_roles: restrict SELECT (drop overly broad policy, allow self-read + directeur read all)
DROP POLICY IF EXISTS user_roles_select_authenticated ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'directeur'));

-- 2) Storage avatars: restrict writes to authenticated + own file (folder = uid OR uploaded by them via owner)
DROP POLICY IF EXISTS avatars_auth_insert ON storage.objects;
DROP POLICY IF EXISTS avatars_auth_update ON storage.objects;
DROP POLICY IF EXISTS avatars_auth_delete ON storage.objects;

CREATE POLICY avatars_insert_auth ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());
CREATE POLICY avatars_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());
CREATE POLICY avatars_delete_own_or_directeur ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'directeur')));

-- 3) Storage products: only directeur can write
DROP POLICY IF EXISTS products_auth_insert ON storage.objects;
DROP POLICY IF EXISTS products_auth_update ON storage.objects;
DROP POLICY IF EXISTS products_auth_delete ON storage.objects;

CREATE POLICY products_insert_directeur ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'products' AND public.has_role(auth.uid(), 'directeur'));
CREATE POLICY products_update_directeur ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'products' AND public.has_role(auth.uid(), 'directeur'));
CREATE POLICY products_delete_directeur ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'products' AND public.has_role(auth.uid(), 'directeur'));

-- 4) Restrict EXECUTE on SECURITY DEFINER trigger functions (keep has_role public for RLS)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.adjust_stock_on_item_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.adjust_stock_on_status_change() FROM PUBLIC, anon, authenticated;

-- 5) Tighten profiles: prevent any user from updating profile fields they shouldn't
-- (already restricted to own or directeur via existing policies; ensure INSERT remains blocked)

-- 6) Make sure listing of avatars/products buckets via getPublicUrl still works
-- (public_read SELECT remains, that's required for displaying images via public URL)
