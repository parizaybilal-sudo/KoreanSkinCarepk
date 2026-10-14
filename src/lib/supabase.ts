import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Environment variable resolution for browser and SSR/Node runtimes
const env =
  typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env as Record<string, string | undefined>)
    : typeof process !== "undefined" && process.env
      ? (process.env as Record<string, string | undefined>)
      : {};

const supabaseUrl = env["VITE_SUPABASE_URL"] || env["VITE_PUBLIC_SUPABASE_URL"] || "";

const supabaseAnonKey =
  env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  env["VITE_SUPABASE_ANON_KEY"] ||
  env["VITE_PUBLIC_SUPABASE_ANON_KEY"] ||
  "";

export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === "string" &&
    supabaseUrl.trim().length > 0 &&
    !supabaseUrl.includes("your-project-id") &&
    typeof supabaseAnonKey === "string" &&
    supabaseAnonKey.trim().length > 0 &&
    !supabaseAnonKey.includes("your-supabase")
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: typeof window !== "undefined",
        autoRefreshToken: typeof window !== "undefined",
      },
    })
  : null;

export interface DBProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  type: string;
  size: string;
  regular_price: number;
  sale_price: number;
  stock_quantity: number;
  sku: string | null;
  category_id: string | null;
  tag: string | null;
  concern: string | null;
  short_description: string | null;
  full_description: string | null;
  is_published: boolean;
  is_featured: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  created_at?: string;
  updated_at?: string;
  is_user_modified?: boolean;
  images?: DBProductImage[];
  videos?: DBProductVideo[];
  sections?: DBProductSection[];
  category?: DBCategory | null;
}

export interface DBProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  alt_text?: string | null;
}

export interface DBProductVideo {
  id: string;
  product_id: string;
  video_url: string;
  thumbnail_url?: string | null;
  title: string;
  display_order: number;
}

export interface DBProductSection {
  id: string;
  product_id: string;
  title: string;
  content: string;
  section_type: string;
  display_order: number;
}

export interface DBCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  display_order: number;
}

export interface DBOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_whatsapp?: string | null;
  customer_email?: string | null;
  delivery_address: string;
  city: string;
  province: string;
  postal_code?: string | null;
  order_notes?: string | null;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  payment_method: string;
  payment_status: "unpaid" | "paid";
  order_status:
    | "pending"
    | "confirmed"
    | "processing"
    | "packed"
    | "shipped"
    | "out_for_delivery"
    | "delivered"
    | "cancelled"
    | "returned";
  internal_notes?: string | null;
  created_at: string;
  updated_at?: string;
  items?: DBOrderItem[];
  history?: DBOrderStatusHistory[];
}

export interface DBOrderItem {
  id: string;
  order_id: string;
  product_id?: string | null;
  product_name: string;
  product_brand: string;
  product_image?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface DBOrderStatusHistory {
  id: string;
  order_id: string;
  previous_status?: string | null;
  new_status: string;
  notes?: string | null;
  changed_by?: string | null;
  created_at: string;
}

export interface DBShippingSettings {
  id: string;
  flat_delivery_fee: number;
  free_delivery_threshold: number;
  free_delivery_enabled: boolean;
  currency: string;
}

export interface DBStoreSettings {
  id: string;
  store_name: string;
  store_logo?: string | null;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  store_address: string;
  currency: string;
  announcement_bar: string;
  return_policy?: string | null;
  privacy_policy?: string | null;
  shipping_policy?: string | null;
  terms_conditions?: string | null;
}
