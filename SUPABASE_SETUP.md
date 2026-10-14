# KoreanSkinCare — Supabase Live Integration & Setup Guide

This guide documents the live Supabase setup for the KoreanSkinCare e-commerce storefront and admin console.

---

## 1. Credentials Configured

The application is connected via environment variables:

- **Project URL**: `https://whyzbmsyihcbitpfkces.supabase.co`
- **Publishable Key**: `sb_publishable_MePqYuXWZj0I3aQbguRkqQ_04bNIes7` (configured in `.env`)

---

## 2. Essential PostgREST Table Grants (Run in Supabase SQL Editor)

If your queries return PostgreSQL error `42501` (`permission denied for table products`), run this standard privilege grant script once in your Supabase **SQL Editor**:

```sql
-- Grant schema and table access to PostgREST web roles
-- Row Level Security (RLS) policies govern which actual rows each role can see/modify.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;
```

---

## 3. Admin Authentication & Role Assignment

1. Create your admin user in Supabase dashboard under **Authentication > Users**.
2. Copy the user's UUID.
3. In **SQL Editor**, register that user in `admin_roles`:
   ```sql
   INSERT INTO admin_roles (user_id, role)
   VALUES ('<YOUR-USER-UUID>', 'admin')
   ON CONFLICT (user_id) DO NOTHING;
   ```
4. Log into `/admin` using your email and password.

---

## 4. Cash on Delivery Checkout & Inventory Management

- **Function**: `place_order_cod` (PostgreSQL `SECURITY DEFINER`)
- **Default Delivery Charge**: Rs. 250 (PKR)
- **Features**:
  - Atomically locks product inventory to prevent overselling.
  - Generates unique order number format: `KSC-YYYYMMDD-XXXXX`.
  - Records line items and initial order status history.
  - Decrements live inventory in the `products` table.

---

## 5. Order Tracking

- **Function**: `track_order(p_order_number, p_phone)`
- Publicly accessible without authentication, but securely scoped only to the matching order number and customer phone number.

---

## 6. Media Storage

- **Bucket**: `product-media` (Public read, Admin-only write/update/delete)
- Product image uploads and product demonstration videos are stored here.
