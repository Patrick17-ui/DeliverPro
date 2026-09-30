
-- Drop broad SELECT policies that allow listing all bucket contents.
-- Public buckets still serve individual files via direct URLs (storage layer).
DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
DROP POLICY IF EXISTS products_public_read ON storage.objects;

-- Revoke EXECUTE on has_role from clients; RLS policies still call it via SECURITY DEFINER context
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
