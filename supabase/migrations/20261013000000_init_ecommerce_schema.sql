-- KoreanSkinCare Production Database Migration for Supabase
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ADMIN & USER ROLES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS admin_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper function to check if current user is an admin
-- Hardened with secure search path and SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, anon;

-- Automatically create a profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    coalesce(NEW.raw_user_meta_data->>'phone', ''),
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 2. CATEGORIES & PRODUCTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  type TEXT NOT NULL,
  size TEXT NOT NULL,
  regular_price NUMERIC(10,2) NOT NULL,
  sale_price NUMERIC(10,2) NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 50,
  sku TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  tag TEXT,
  concern TEXT,
  short_description TEXT,
  full_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_published ON products(is_published);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_order INT DEFAULT 0,
  alt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

CREATE TABLE IF NOT EXISTS product_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_videos_product ON product_videos(product_id);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price NUMERIC(10,2),
  stock_quantity INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_detail_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  section_type TEXT DEFAULT 'custom',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_detail_sections_product ON product_detail_sections(product_id);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  change_amount INT NOT NULL,
  reason TEXT NOT NULL,
  order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. CUSTOMERS & ORDERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  address TEXT NOT NULL,
  postal_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_whatsapp TEXT,
  customer_email TEXT,
  delivery_address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT,
  order_notes TEXT,
  subtotal NUMERIC(10,2) NOT NULL,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 250,
  total_amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'COD',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  order_status TEXT NOT NULL DEFAULT 'pending',
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_brand TEXT NOT NULL,
  product_image TEXT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  changed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_history_order ON order_status_history(order_id);

-- ==============================================================================
-- 4. STORE & SHIPPING SETTINGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS store_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  store_name TEXT NOT NULL DEFAULT 'KoreanSkinCare',
  store_logo TEXT,
  contact_email TEXT DEFAULT 'care@koreanskincare.pk',
  contact_phone TEXT DEFAULT '+92 300 1234567',
  whatsapp_number TEXT DEFAULT '+92 300 1234567',
  store_address TEXT DEFAULT 'Lahore, Pakistan',
  currency TEXT NOT NULL DEFAULT 'PKR',
  announcement_bar TEXT DEFAULT 'SEOUL TO PAKISTAN · A MORE CONSIDERED SKINCARE RITUAL',
  return_policy TEXT,
  privacy_policy TEXT,
  shipping_policy TEXT,
  terms_conditions TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipping_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  flat_delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 250,
  free_delivery_threshold NUMERIC(10,2) NOT NULL DEFAULT 5000,
  free_delivery_enabled BOOLEAN NOT NULL DEFAULT false,
  currency TEXT NOT NULL DEFAULT 'PKR',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS homepage_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  link_url TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 5. ATOMIC ORDER PLACEMENT (CASH ON DELIVERY)
-- Hardened with secure search path, duplicate cart aggregation, and strict stock locking
-- ==============================================================================
CREATE OR REPLACE FUNCTION place_order_cod(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_whatsapp TEXT,
  p_customer_email TEXT,
  p_delivery_address TEXT,
  p_city TEXT,
  p_province TEXT,
  p_postal_code TEXT,
  p_order_notes TEXT,
  p_items JSONB -- array of { product_id: UUID, quantity: INT }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item RECORD;
  v_product RECORD;
  v_subtotal NUMERIC(10,2) := 0;
  v_delivery_fee NUMERIC(10,2) := 250;
  v_free_enabled BOOLEAN := false;
  v_free_thresh NUMERIC(10,2) := 5000;
  v_total NUMERIC(10,2) := 0;
  v_order_id UUID;
  v_order_number TEXT;
  v_rand_part TEXT;
  v_date_prefix TEXT;
  v_customer_id UUID;
BEGIN
  -- Basic customer validation
  IF trim(coalesce(p_customer_name, '')) = '' OR
     trim(coalesce(p_customer_phone, '')) = '' OR
     trim(coalesce(p_delivery_address, '')) = '' OR
     trim(coalesce(p_city, '')) = '' THEN
    RAISE EXCEPTION 'Customer name, phone number, city, and delivery address are required.';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart cannot be empty.';
  END IF;

  -- Read delivery fee settings
  SELECT flat_delivery_fee, free_delivery_enabled, free_delivery_threshold
  INTO v_delivery_fee, v_free_enabled, v_free_thresh
  FROM shipping_settings
  WHERE id = 'default';

  IF v_delivery_fee IS NULL THEN
    v_delivery_fee := 250;
  END IF;

  -- Generate order number: KSC-YYYYMMDD-XXXXX
  v_date_prefix := to_char(now(), 'YYYYMMDD');
  v_rand_part := upper(substr(md5(random()::text), 1, 5));
  v_order_number := 'KSC-' || v_date_prefix || '-' || v_rand_part;

  -- Create customer record
  INSERT INTO customers (full_name, phone, whatsapp, email, city, province, address, postal_code)
  VALUES (
    trim(p_customer_name),
    trim(p_customer_phone),
    nullif(trim(coalesce(p_customer_whatsapp, '')), ''),
    nullif(trim(coalesce(p_customer_email, '')), ''),
    trim(p_city),
    trim(coalesce(p_province, 'Pakistan')),
    trim(p_delivery_address),
    nullif(trim(coalesce(p_postal_code, '')), '')
  )
  RETURNING id INTO v_customer_id;

  -- Validate items, aggregate duplicate entries by product_id, and lock rows in sorted order to prevent deadlocks
  FOR v_item IN
    SELECT product_id, SUM(quantity)::INT AS quantity
    FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT)
    GROUP BY product_id
    ORDER BY product_id ASC
  LOOP
    IF v_item.product_id IS NULL THEN
      RAISE EXCEPTION 'Invalid product ID in order.';
    END IF;

    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be greater than zero.';
    END IF;

    IF v_item.quantity > 50 THEN
      RAISE EXCEPTION 'Maximum purchase limit of 50 units exceeded for item.';
    END IF;

    SELECT id, name, brand, sale_price, stock_quantity, is_published
    INTO v_product
    FROM products
    WHERE id = v_item.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found: %', v_item.product_id;
    END IF;

    IF NOT v_product.is_published THEN
      RAISE EXCEPTION 'Product "%" is currently unavailable.', v_product.name;
    END IF;

    IF v_product.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for "%" (Available: %, Requested: %)',
        v_product.name, v_product.stock_quantity, v_item.quantity;
    END IF;

    v_subtotal := v_subtotal + (v_product.sale_price * v_item.quantity);
  END LOOP;

  -- Calculate delivery fee based on threshold
  IF v_free_enabled AND v_subtotal >= v_free_thresh THEN
    v_delivery_fee := 0;
  END IF;

  v_total := v_subtotal + v_delivery_fee;

  -- Create order
  INSERT INTO orders (
    order_number,
    customer_id,
    customer_name,
    customer_phone,
    customer_whatsapp,
    customer_email,
    delivery_address,
    city,
    province,
    postal_code,
    order_notes,
    subtotal,
    delivery_fee,
    total_amount,
    payment_method,
    payment_status,
    order_status
  )
  VALUES (
    v_order_number,
    v_customer_id,
    trim(p_customer_name),
    trim(p_customer_phone),
    nullif(trim(coalesce(p_customer_whatsapp, '')), ''),
    nullif(trim(coalesce(p_customer_email, '')), ''),
    trim(p_delivery_address),
    trim(p_city),
    trim(coalesce(p_province, 'Pakistan')),
    nullif(trim(coalesce(p_postal_code, '')), ''),
    nullif(trim(coalesce(p_order_notes, '')), ''),
    v_subtotal,
    v_delivery_fee,
    v_total,
    'COD',
    'unpaid',
    'pending'
  )
  RETURNING id INTO v_order_id;

  -- Insert order items and deduct stock using aggregated quantities
  FOR v_item IN
    SELECT product_id, SUM(quantity)::INT AS quantity
    FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT)
    GROUP BY product_id
    ORDER BY product_id ASC
  LOOP
    SELECT id, name, brand, sale_price
    INTO v_product
    FROM products
    WHERE id = v_item.product_id;

    INSERT INTO order_items (
      order_id,
      product_id,
      product_name,
      product_brand,
      product_image,
      quantity,
      unit_price,
      total_price
    )
    VALUES (
      v_order_id,
      v_product.id,
      v_product.name,
      v_product.brand,
      (SELECT image_url FROM product_images WHERE product_id = v_product.id ORDER BY is_primary DESC, display_order ASC LIMIT 1),
      v_item.quantity,
      v_product.sale_price,
      v_product.sale_price * v_item.quantity
    );

    UPDATE products
    SET stock_quantity = stock_quantity - v_item.quantity,
        updated_at = now()
    WHERE id = v_item.product_id;

    INSERT INTO inventory_movements (product_id, change_amount, reason, order_id)
    VALUES (v_item.product_id, -v_item.quantity, 'Order placed ' || v_order_number, v_order_id);
  END LOOP;

  -- Record status history
  INSERT INTO order_status_history (order_id, previous_status, new_status, notes, changed_by)
  VALUES (v_order_id, NULL, 'pending', 'Order placed via Cash on Delivery', 'System');

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'total_amount', v_total,
    'payment_method', 'COD',
    'payment_status', 'unpaid',
    'order_status', 'pending'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION place_order_cod(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION place_order_cod(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;

-- Secure Order Tracking Function (Publicly callable with Order Number + Phone Number)
CREATE OR REPLACE FUNCTION track_order(p_order_number TEXT, p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
  v_history JSONB;
BEGIN
  SELECT id, order_number, customer_name, customer_phone, city, province,
         delivery_fee, subtotal, total_amount, payment_status, order_status, created_at
  INTO v_order
  FROM orders
  WHERE order_number = upper(trim(p_order_number))
    AND replace(replace(customer_phone, '-', ''), ' ', '') = replace(replace(trim(p_phone), '-', ''), ' ', '');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'error', 'No order matched the provided order number and phone number.');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'product_name', product_name,
      'product_brand', product_brand,
      'product_image', product_image,
      'quantity', quantity,
      'unit_price', unit_price,
      'total_price', total_price
    )
  )
  INTO v_items
  FROM order_items
  WHERE order_id = v_order.id;

  SELECT jsonb_agg(
    jsonb_build_object(
      'status', new_status,
      'created_at', created_at,
      'notes', notes
    ) ORDER BY created_at ASC
  )
  INTO v_history
  FROM order_status_history
  WHERE order_id = v_order.id;

  RETURN jsonb_build_object(
    'found', true,
    'order_number', v_order.order_number,
    'customer_name', v_order.customer_name,
    'city', v_order.city,
    'province', v_order.province,
    'subtotal', v_subtotal,
    'delivery_fee', v_order.delivery_fee,
    'total_amount', v_order.total_amount,
    'payment_status', v_order.payment_status,
    'order_status', v_order.order_status,
    'created_at', v_order.created_at,
    'items', coalesce(v_items, '[]'::jsonb),
    'history', coalesce(v_history, '[]'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION track_order(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION track_order(TEXT, TEXT) TO anon, authenticated;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_detail_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_banners ENABLE ROW LEVEL SECURITY;

-- Profiles: Users manage own profile, Admins have full access
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT
  USING ((SELECT auth.uid()) = id OR is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id OR is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING ((SELECT auth.uid()) = id OR is_admin())
  WITH CHECK ((SELECT auth.uid()) = id OR is_admin());

DROP POLICY IF EXISTS "Admins full profiles access" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles" ON profiles
  FOR DELETE
  USING (is_admin());

-- Admin roles: Strictly admin access
DROP POLICY IF EXISTS "Admin roles access" ON admin_roles;
CREATE POLICY "Admin roles access" ON admin_roles FOR ALL USING (is_admin());

-- Categories: Public read, Admin write
DROP POLICY IF EXISTS "Public categories read" ON categories;
CREATE POLICY "Public categories read" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin categories modify" ON categories;
CREATE POLICY "Admin categories modify" ON categories FOR ALL USING (is_admin());

-- Products: Public read published only; Admin all
DROP POLICY IF EXISTS "Public products read" ON products;
CREATE POLICY "Public products read" ON products FOR SELECT USING (is_published = true OR is_admin());

DROP POLICY IF EXISTS "Admin products modify" ON products;
CREATE POLICY "Admin products modify" ON products FOR ALL USING (is_admin());

-- Product Images, Videos, Variants, Detail Sections: Public read; Admin modify
DROP POLICY IF EXISTS "Public product images read" ON product_images;
CREATE POLICY "Public product images read" ON product_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin product images modify" ON product_images;
CREATE POLICY "Admin product images modify" ON product_images FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Public product videos read" ON product_videos;
CREATE POLICY "Public product videos read" ON product_videos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin product videos modify" ON product_videos;
CREATE POLICY "Admin product videos modify" ON product_videos FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Public product variants read" ON product_variants;
CREATE POLICY "Public product variants read" ON product_variants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin product variants modify" ON product_variants;
CREATE POLICY "Admin product variants modify" ON product_variants FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Public product details read" ON product_detail_sections;
CREATE POLICY "Public product details read" ON product_detail_sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin product details modify" ON product_detail_sections;
CREATE POLICY "Admin product details modify" ON product_detail_sections FOR ALL USING (is_admin());

-- Settings & Banners: Public read; Admin modify
DROP POLICY IF EXISTS "Public store settings read" ON store_settings;
CREATE POLICY "Public store settings read" ON store_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin store settings modify" ON store_settings;
CREATE POLICY "Admin store settings modify" ON store_settings FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Public shipping settings read" ON shipping_settings;
CREATE POLICY "Public shipping settings read" ON shipping_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin shipping settings modify" ON shipping_settings;
CREATE POLICY "Admin shipping settings modify" ON shipping_settings FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Public homepage banners read" ON homepage_banners;
CREATE POLICY "Public homepage banners read" ON homepage_banners FOR SELECT USING (is_active = true OR is_admin());

DROP POLICY IF EXISTS "Admin homepage banners modify" ON homepage_banners;
CREATE POLICY "Admin homepage banners modify" ON homepage_banners FOR ALL USING (is_admin());

-- Orders, Items, Customers, Audit trails: Strictly Admin only
-- (Public placement and tracking execute securely via SECURITY DEFINER functions)
DROP POLICY IF EXISTS "Admin orders access" ON orders;
CREATE POLICY "Admin orders access" ON orders FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admin order items access" ON order_items;
CREATE POLICY "Admin order items access" ON order_items FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admin customers access" ON customers;
CREATE POLICY "Admin customers access" ON customers FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admin order history access" ON order_status_history;
CREATE POLICY "Admin order history access" ON order_status_history FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admin inventory movements access" ON inventory_movements;
CREATE POLICY "Admin inventory movements access" ON inventory_movements FOR ALL USING (is_admin());

-- ==============================================================================
-- 6.1 GRANT PERMISSIONS TO POSTGREST ROLES (anon & authenticated)
-- Required by Supabase so PostgREST can access tables; RLS policies enforce security
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- ==============================================================================
-- 7. SUPABASE STORAGE BUCKET & POLICIES
-- Restricted strictly to authenticated admins for write/modify/delete
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-media', 'product-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view product media" ON storage.objects;
CREATE POLICY "Public can view product media"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-media');

DROP POLICY IF EXISTS "Admins can upload product media" ON storage.objects;
CREATE POLICY "Admins can upload product media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-media' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update product media" ON storage.objects;
CREATE POLICY "Admins can update product media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-media' AND public.is_admin())
WITH CHECK (bucket_id = 'product-media' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete product media" ON storage.objects;
CREATE POLICY "Admins can delete product media"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-media' AND public.is_admin());

-- ==============================================================================
-- 8. INITIAL SEED DATA (Idempotent: Safe to execute repeatedly)
-- ==============================================================================
INSERT INTO store_settings (id, store_name, contact_email, contact_phone, whatsapp_number, store_address, currency, announcement_bar)
VALUES (
  'default',
  'KoreanSkinCare',
  'care@koreanskincare.pk',
  '+92 300 1234567',
  '+92 300 1234567',
  'Lahore, Pakistan',
  'PKR',
  'SEOUL TO PAKISTAN · A MORE CONSIDERED SKINCARE RITUAL'
)
ON CONFLICT (id) DO UPDATE SET updated_at = now();

INSERT INTO shipping_settings (id, flat_delivery_fee, free_delivery_threshold, free_delivery_enabled, currency)
VALUES ('default', 250.00, 5000.00, false, 'PKR')
ON CONFLICT (id) DO UPDATE SET updated_at = now();

-- Initial Categories (Compliant standard hexadecimal UUIDs)
INSERT INTO categories (id, name, slug, description, display_order)
VALUES
  ('c1111111-1111-4111-8111-111111111111', 'Face & Eye Creams', 'creams', 'Targeted hydration and radiance formulas', 1),
  ('c2222222-2222-4222-8222-222222222222', 'Overnight Masks', 'masks', 'Intensive overnight skin restoration', 2),
  ('c3333333-3333-4333-8333-333333333333', 'Ampoules & Serums', 'serums', 'Concentrated actives for barrier repair', 3),
  ('c4444444-4444-4444-8444-444444444444', 'Toners & Exfoliants', 'toners', 'Gentle clarifying and texture balancing', 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;

-- Seed Products (Compliant standard hexadecimal UUIDs)
INSERT INTO products (
  id, slug, name, brand, type, size, regular_price, sale_price, stock_quantity, sku, category_id,
  tag, concern, short_description, full_description, is_published, is_featured
)
VALUES
  (
    'a1111111-1111-4111-8111-111111111111',
    'arencia-vitamin-c',
    'Vitamin C Booster Shot',
    'Arencia',
    'Face & eye cream',
    '30 ml',
    2850.00,
    1999.00,
    45,
    'ARC-VITC-01',
    'c1111111-1111-4111-8111-111111111111',
    'The glow essential',
    'Radiance',
    'A face and eye cream moisturizer with Vitamin C Complex (5%) and glutathione. A targeted addition to a radiance-focused skincare ritual.',
    'Formulated in Seoul, this potent antioxidant treatment combines pure Vitamin C with Glutathione to neutralize free radical damage, even tone, and restore luminous bounce to tired skin.',
    true,
    true
  ),
  (
    'a2222222-2222-4222-8222-222222222222',
    'medicube-collagen-mask',
    'Collagen Night Wrapping Mask',
    'medicube',
    'Overnight mask',
    '75 ml',
    3300.00,
    2299.00,
    30,
    'MDC-COL-02',
    'c2222222-2222-4222-8222-222222222222',
    'The overnight ritual',
    'Firmness',
    'An overnight wrapping mask with collagen extract, niacinamide and Ceramide NP. Designed to help skin feel moisturized, smooth and firm overnight.',
    'A transformative peel-off gel membrane that locks in hydration and active collagen while you sleep, preventing overnight moisture evaporation and promoting cellular elasticity.',
    true,
    true
  ),
  (
    'a3333333-3333-4333-8333-333333333333',
    'skin1004-centella',
    'Madagascar Centella Ampoule',
    'SKIN1004',
    'Soothing ampoule',
    '100 ml',
    3150.00,
    2199.00,
    60,
    'SKIN-CNT-03',
    'c3333333-3333-4333-8333-333333333333',
    'The barrier favourite',
    'Soothing',
    'An ampoule made with pure Centella from Madagascar. A simple, soothing step for a gentle daily skincare routine.',
    'Contains 100% untouched Centella Asiatica extract sustainably harvested from Madagascar to rapidly calm erythema, replenish fragile moisture barriers, and soothe irritation.',
    true,
    true
  ),
  (
    'a4444444-4444-4444-8444-444444444444',
    'simplist-glycolic-toner',
    'Glycolic Acid 07% Toner',
    'Simplist',
    'Exfoliating toner',
    '100 ml',
    3000.00,
    2099.00,
    25,
    'SMP-GLY-04',
    'c4444444-4444-4444-8444-444444444444',
    'The texture reset',
    'Texture',
    'A fragrance-free exfoliating toner with 7% glycolic acid, hyaluronic acid and ginseng extract. Formulated to exfoliate and improve the appearance of skin texture.',
    'Clinically balanced for gentle yet efficient chemical exfoliation. Melts dead pore-clogging keratin while delivering deep multi-depth hydration.',
    true,
    true
  ),
  (
    'a5555555-5555-4555-8555-555555555555',
    'laneige-water-mask',
    'Water Sleeping Mask EX',
    'LANEIGE',
    'Hydrating sleeping mask',
    '70 ml',
    3550.00,
    2499.00,
    40,
    'LNG-WTR-05',
    'c2222222-2222-4222-8222-222222222222',
    'The hydration edit',
    'Hydration',
    'An overnight hydration mask featuring Sleeping Microbiome™. A replenishing final step for skin that feels soft, hydrated and refreshed.',
    'Powered by enhanced Probiotics Complex and Squalane, this iconic overnight mask strengthens the skin defense barrier and provides 8-hour continuous moisture retention.',
    true,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  regular_price = EXCLUDED.regular_price,
  sale_price = EXCLUDED.sale_price,
  short_description = EXCLUDED.short_description,
  full_description = EXCLUDED.full_description,
  updated_at = now();

-- Seed Primary Product Images
INSERT INTO product_images (id, product_id, image_url, is_primary, display_order, alt_text)
VALUES
  ('b1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-111111111111', '/__l5e/assets-v1/7897f8ac-7d23-4d8a-ba7f-8f9fb0d755d4/file_00000000248081f587d6be32d55e0799.png', true, 1, 'Arencia Vitamin C Booster Shot'),
  ('b2222222-2222-4222-8222-000000000001', 'a2222222-2222-4222-8222-222222222222', '/__l5e/assets-v1/e9c8f8f3-1c28-472f-a930-330186c501a2/file_000000007264820b9b64fdd46a71042a.png', true, 1, 'medicube Collagen Night Wrapping Mask'),
  ('b3333333-3333-4333-8333-000000000001', 'a3333333-3333-4333-8333-333333333333', '/__l5e/assets-v1/9c9ad1e2-1a8c-4618-a824-53edaea4aa19/file_00000000e3c88211b9b5fb8fd8bb0dda.png', true, 1, 'SKIN1004 Madagascar Centella Ampoule'),
  ('b4444444-4444-4444-8444-000000000001', 'a4444444-4444-4444-8444-444444444444', '/__l5e/assets-v1/c9acc0db-ab87-41a9-ac06-1efbcf9f3a64/file_00000000632c8211b4b9c13f61025c2f.png', true, 1, 'Simplist Glycolic Acid 07% Toner'),
  ('b5555555-5555-4555-8555-000000000001', 'a5555555-5555-4555-8555-555555555555', '/__l5e/assets-v1/300c96ca-6b5f-4fa6-b16c-c28f2f7024e5/file_00000000ec708211b7b6f919836a134c.png', true, 1, 'LANEIGE Water Sleeping Mask EX')
ON CONFLICT (id) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  is_primary = EXCLUDED.is_primary,
  alt_text = EXCLUDED.alt_text;

-- Detail Sections for Seed Products (Deterministic UUIDs for idempotency)
INSERT INTO product_detail_sections (id, product_id, title, content, section_type, display_order)
VALUES
  ('d1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-111111111111', 'Highlighted ingredients', 'Vitamin C Complex (5%) · Glutathione · Niacinamide', 'ingredients', 1),
  ('d1111111-1111-4111-8111-000000000002', 'a1111111-1111-4111-8111-111111111111', 'How to use', 'Apply a small amount to clean skin, following the directions on your product packaging. Use sunscreen during the day.', 'usage', 2),
  ('d1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-111111111111', 'Before you begin', 'Patch test before first use. Stop use if irritation occurs. Consult packaging for complete ingredients.', 'precautions', 3),

  ('d2222222-2222-4222-8222-000000000001', 'a2222222-2222-4222-8222-222222222222', 'Highlighted ingredients', 'Collagen extract · Niacinamide · Ceramide NP', 'ingredients', 1),
  ('d2222222-2222-4222-8222-000000000002', 'a2222222-2222-4222-8222-222222222222', 'How to use', 'Use as the final step of your evening routine. Follow packaging instructions for application and peel off in the morning.', 'usage', 2),
  ('d2222222-2222-4222-8222-000000000003', 'a2222222-2222-4222-8222-222222222222', 'Before you begin', 'Patch test before first use. Stop use if irritation occurs.', 'precautions', 3),

  ('d3333333-3333-4333-8333-000000000001', 'a3333333-3333-4333-8333-333333333333', 'Highlighted ingredients', '100% Centella Asiatica Extract', 'ingredients', 1),
  ('d3333333-3333-4333-8333-000000000002', 'a3333333-3333-4333-8333-333333333333', 'How to use', 'Apply a few drops to cleansed skin and gently pat in. Follow with moisturizer and daytime sunscreen.', 'usage', 2),
  ('d3333333-3333-4333-8333-000000000003', 'a3333333-3333-4333-8333-333333333333', 'Before you begin', 'Patch test before first use. Keep in a cool, dry place away from direct sunlight.', 'precautions', 3),

  ('d4444444-4444-4444-8444-000000000001', 'a4444444-4444-4444-8444-444444444444', 'Highlighted ingredients', 'Glycolic acid (7%) · Hyaluronic acid · Panax Ginseng extract', 'ingredients', 1),
  ('d4444444-4444-4444-8444-000000000002', 'a4444444-4444-4444-8444-444444444444', 'How to use', 'Introduce gradually (2-3 times weekly in the evening). Avoid eye contour. Wear broad spectrum SPF 50 daily.', 'usage', 2),
  ('d4444444-4444-4444-8444-000000000003', 'a4444444-4444-4444-8444-444444444444', 'Before you begin', 'Do not combine with retinol or harsh physical scrubs in the same routine.', 'precautions', 3),

  ('d5555555-5555-4555-8555-000000000001', 'a5555555-5555-4555-8555-555555555555', 'Highlighted ingredients', 'Sleeping Microbiome™ · Probiotics Complex · Squalane', 'ingredients', 1),
  ('d5555555-5555-4555-8555-000000000002', 'a5555555-5555-4555-8555-555555555555', 'How to use', 'Smooth evenly across face before sleep as the final routine step. Rinse with lukewarm water in the morning.', 'usage', 2),
  ('d5555555-5555-4555-8555-000000000003', 'a5555555-5555-4555-8555-555555555555', 'Before you begin', 'Suitable for all skin types, including sensitive and dehydrated skin.', 'precautions', 3)
ON CONFLICT (id) DO NOTHING;
