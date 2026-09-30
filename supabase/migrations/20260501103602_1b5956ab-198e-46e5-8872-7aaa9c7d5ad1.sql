
-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true) ON CONFLICT DO NOTHING;

-- Storage policies (avatars)
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');

-- Storage policies (products)
CREATE POLICY "products_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "products_auth_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'products');
CREATE POLICY "products_auth_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'products');
CREATE POLICY "products_auth_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'products');

-- Company settings (singleton)
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Mon entreprise',
  address text,
  phone text,
  email text,
  logo_url text,
  currency text NOT NULL DEFAULT 'FCFA',
  delivery_zones text[] NOT NULL DEFAULT ARRAY[]::text[],
  payment_methods text[] NOT NULL DEFAULT ARRAY['cash','om','momo','wave']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_settings_select_auth" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "company_settings_insert_directeur" ON public.company_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'directeur'));
CREATE POLICY "company_settings_update_directeur" ON public.company_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(),'directeur'));
CREATE TRIGGER company_settings_touch BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
INSERT INTO public.company_settings (name) VALUES ('Mon entreprise');

-- Cash movements
CREATE TABLE public.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('encaissement','depense')),
  amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  delivery_id uuid REFERENCES public.deliveries(id) ON DELETE SET NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_select_auth" ON public.cash_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "cash_insert_auth" ON public.cash_movements FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cash_update_directeur" ON public.cash_movements FOR UPDATE TO authenticated USING (has_role(auth.uid(),'directeur'));
CREATE POLICY "cash_delete_directeur" ON public.cash_movements FOR DELETE TO authenticated USING (has_role(auth.uid(),'directeur'));
