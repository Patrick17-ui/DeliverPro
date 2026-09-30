-- Enum des rôles
CREATE TYPE public.app_role AS ENUM ('directeur', 'livreur');

-- Enum statut livraison
CREATE TYPE public.delivery_status AS ENUM ('en_cours', 'livree', 'annulee', 'retournee');

-- Enum statut paiement
CREATE TYPE public.payment_status AS ENUM ('non_paye', 'paye', 'avance');

-- Enum mode paiement
CREATE TYPE public.payment_method AS ENUM ('om', 'momo', 'especes', 'virement', 'carte_bancaire');

-- Table profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  district TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Table user_roles (séparée pour sécurité)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Fonction security definer pour vérifier rôle
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Trigger auto profile + rôle livreur par défaut
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  -- Premier utilisateur => directeur, sinon livreur
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'directeur');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'livreur');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit TEXT,
  image_url TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  initial_quantity INTEGER NOT NULL DEFAULT 0,
  remaining_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  district TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Deliveries
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL DEFAULT ('LIV-' || to_char(now(),'YYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status delivery_status NOT NULL DEFAULT 'en_cours',
  payment_status payment_status NOT NULL DEFAULT 'non_paye',
  payment_method payment_method,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  zone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER deliveries_updated BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Delivery items
CREATE TABLE public.delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;

-- ============= RLS POLICIES =============

-- profiles
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_directeur" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'directeur'));

-- user_roles
CREATE POLICY "user_roles_select_authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_directeur_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'directeur')) WITH CHECK (public.has_role(auth.uid(),'directeur'));

-- products
CREATE POLICY "products_select_auth" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_directeur_all" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(),'directeur')) WITH CHECK (public.has_role(auth.uid(),'directeur'));

-- clients
CREATE POLICY "clients_select_auth" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_insert_auth" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "clients_update_directeur" ON public.clients FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'directeur'));
CREATE POLICY "clients_delete_directeur" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'directeur'));

-- deliveries
CREATE POLICY "deliveries_select_auth" ON public.deliveries FOR SELECT TO authenticated USING (true);
CREATE POLICY "deliveries_insert_auth" ON public.deliveries FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "deliveries_update_own_or_directeur" ON public.deliveries FOR UPDATE TO authenticated USING (driver_id = auth.uid() OR public.has_role(auth.uid(),'directeur'));
CREATE POLICY "deliveries_delete_directeur" ON public.deliveries FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'directeur'));

-- delivery_items
CREATE POLICY "delivery_items_select_auth" ON public.delivery_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "delivery_items_insert_auth" ON public.delivery_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "delivery_items_update_own_or_directeur" ON public.delivery_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.deliveries d WHERE d.id = delivery_id AND (d.driver_id = auth.uid() OR public.has_role(auth.uid(),'directeur')))
);
CREATE POLICY "delivery_items_delete_own_or_directeur" ON public.delivery_items FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.deliveries d WHERE d.id = delivery_id AND (d.driver_id = auth.uid() OR public.has_role(auth.uid(),'directeur')))
);
