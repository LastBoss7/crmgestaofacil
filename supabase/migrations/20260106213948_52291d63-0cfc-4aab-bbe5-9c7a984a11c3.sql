-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('CEO', 'BACKOFFICE', 'SELLER');

-- Create enum for sale status
CREATE TYPE public.sale_status AS ENUM ('NOVA', 'EM_ANALISE', 'PENDENCIA', 'APROVADA', 'INSTALADA', 'CANCELADA');

-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'SELLER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Create sales table
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    cnpj_cliente VARCHAR(18) NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    contato_responsavel VARCHAR(255),
    telefone_responsavel VARCHAR(20),
    produtos TEXT,
    valor_mensal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status sale_status DEFAULT 'NOVA',
    observacoes_vendedor TEXT,
    motivo_pendencia TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- RLS Policies for profiles
-- Everyone can view profiles (needed for displaying seller names)
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Only CEO can insert profiles (new user creation)
CREATE POLICY "CEO can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'CEO'));

-- Allow profile creation during signup
CREATE POLICY "Users can create their own profile on signup"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Only CEO can delete profiles
CREATE POLICY "CEO can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'CEO'));

-- RLS Policies for user_roles
-- CEO can view all roles
CREATE POLICY "CEO can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'CEO') OR user_id = auth.uid());

-- Only CEO can manage roles
CREATE POLICY "CEO can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'CEO'));

CREATE POLICY "CEO can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'CEO'));

CREATE POLICY "CEO can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'CEO'));

-- RLS Policies for sales
-- CEO and Backoffice can view all sales, Sellers only their own
CREATE POLICY "View sales based on role"
ON public.sales
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'CEO') OR
    public.has_role(auth.uid(), 'BACKOFFICE') OR
    seller_id = auth.uid()
);

-- Any authenticated user can create sales (as seller)
CREATE POLICY "Authenticated users can create sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (seller_id = auth.uid());

-- CEO and Backoffice can update any sale, Seller can only update their own (limited fields handled in app)
CREATE POLICY "Update sales based on role"
ON public.sales
FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'CEO') OR
    public.has_role(auth.uid(), 'BACKOFFICE') OR
    seller_id = auth.uid()
);

-- Only CEO can delete sales
CREATE POLICY "CEO can delete sales"
ON public.sales
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'CEO'));

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, nome, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
        NEW.email
    );
    RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Trigger for sales updated_at
CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();