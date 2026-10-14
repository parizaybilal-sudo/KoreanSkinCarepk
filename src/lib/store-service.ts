import {
  supabase,
  isSupabaseConfigured,
  type DBProduct,
  type DBOrder,
  type DBCategory,
  type DBShippingSettings,
  type DBStoreSettings,
} from "./supabase";
import { products as initialSeedProducts } from "./products";

// Local storage keys for fallback development/preview persistence (only when unconfigured)
const STORAGE_PREFIX = "ksc_fallback_";
const STORAGE_PRODUCTS = `${STORAGE_PREFIX}products`;
const STORAGE_ORDERS = `${STORAGE_PREFIX}orders`;
const STORAGE_CATEGORIES = `${STORAGE_PREFIX}categories`;
const STORAGE_SHIPPING = `${STORAGE_PREFIX}shipping`;
const STORAGE_SETTINGS = `${STORAGE_PREFIX}settings`;
const STORAGE_DELETED_PRODUCT_IDS = `${STORAGE_PREFIX}deleted_products`;

// Initial default categories (using standard hexadecimal UUIDs matching PostgreSQL schema)
const DEFAULT_CATEGORIES: DBCategory[] = [
  {
    id: "c1111111-1111-4111-8111-111111111111",
    name: "Face & Eye Creams",
    slug: "creams",
    description: "Targeted hydration and radiance formulas",
    display_order: 1,
  },
  {
    id: "c2222222-2222-4222-8222-822222222222".replace("-8222-8222", "-4222-8222"),
    name: "Overnight Masks",
    slug: "masks",
    description: "Intensive overnight skin restoration",
    display_order: 2,
  },
  {
    id: "c3333333-3333-4333-8333-333333333333",
    name: "Ampoules & Serums",
    slug: "serums",
    description: "Concentrated actives for barrier repair",
    display_order: 3,
  },
  {
    id: "c4444444-4444-4444-8444-444444444444",
    name: "Toners & Exfoliants",
    slug: "toners",
    description: "Gentle clarifying and texture balancing",
    display_order: 4,
  },
];

const LEGACY_CATEGORY_ID_MAP: Record<string, string> = {
  "cat-creams": "c1111111-1111-4111-8111-111111111111",
  "cat-masks": "c2222222-2222-4222-8222-222222222222",
  "cat-serums": "c3333333-3333-4333-8333-333333333333",
  "cat-toners": "c4444444-4444-4444-8444-444444444444",
};

const VALID_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeCategoryId(catId: string | null | undefined): string | null {
  if (!catId) return null;
  if (LEGACY_CATEGORY_ID_MAP[catId]) return LEGACY_CATEGORY_ID_MAP[catId]!;
  if (VALID_UUID_REGEX.test(catId)) return catId;
  return null;
}

export const PRODUCT_SLUG_TO_UUID: Record<string, string> = {
  "arencia-vitamin-c": "a1111111-1111-4111-8111-111111111111",
  "medicube-collagen-mask": "a2222222-2222-4222-8222-222222222222",
  "skin1004-centella": "a3333333-3333-4333-8333-333333333333",
  "simplist-glycolic-toner": "a4444444-4444-4444-8444-444444444444",
  "laneige-water-mask": "a5555555-5555-4555-8555-555555555555",
  "laneige-lip-sleeping-mask": "a5555555-5555-4555-8555-555555555555",
};

// Default orders - strictly empty so fake orders do not show up; only real customer orders are displayed
export const DEFAULT_INITIAL_ORDERS: DBOrder[] = [];

// Helper to identify fake or demo seed orders
export function isDemoOrder(o: {
  id?: string;
  order_number?: string;
  customer_name?: string;
}): boolean {
  if (!o) return false;
  if (typeof o.id === "string" && o.id.startsWith("ord-demo-")) return true;
  if (
    typeof o.order_number === "string" &&
    (o.order_number.includes("-demo-") ||
      o.order_number.includes("ISB03") ||
      o.order_number.includes("LHR01") ||
      o.order_number.includes("KHI02"))
  ) {
    if (
      o.customer_name === "Ayesha Malik" ||
      o.customer_name === "Fatima Noor" ||
      o.customer_name === "Zainab Raza"
    ) {
      return true;
    }
  }
  if (
    o.customer_name === "Ayesha Malik" ||
    o.customer_name === "Fatima Noor" ||
    o.customer_name === "Zainab Raza"
  ) {
    return true;
  }
  return false;
}

const SUPABASE_MEDIA_BASE =
  "https://whyzbmsyihcbitpfkces.supabase.co/storage/v1/object/public/product-media";

// Map legacy Lovable proxy URLs (/l5e/) to permanent live Supabase Storage CDN URLs
const LEGACY_ASSET_URL_MAP: Record<string, string> = {
  "/__l5e/assets-v1/7897f8ac-7d23-4d8a-ba7f-8f9fb0d755d4/file_00000000248081f587d6be32d55e0799.png": `${SUPABASE_MEDIA_BASE}/products/1791959369045-wicadg.png`,
  "/__l5e/assets-v1/e9c8f8f3-1c28-472f-a930-330186c501a2/file_000000007264820b9b64fdd46a71042a.png": `${SUPABASE_MEDIA_BASE}/products/1791959583980-szobvk.png`,
  "/__l5e/assets-v1/9c9ad1e2-1a8c-4618-a824-53edaea4aa19/file_00000000e3c88211b9b5fb8fd8bb0dda.png": `${SUPABASE_MEDIA_BASE}/products/1791959678180-imdqzd.png`,
  "/__l5e/assets-v1/c9acc0db-ab87-41a9-ac06-1efbcf9f3a64/file_00000000632c8211b4b9c13f61025c2f.png": `${SUPABASE_MEDIA_BASE}/products/1791959732187-egs1lo.png`,
  "/__l5e/assets-v1/300c96ca-6b5f-4fa6-b16c-c28f2f7024e5/file_00000000ec708211b7b6f919836a134c.png": `${SUPABASE_MEDIA_BASE}/products/1791959794299-bpbcln.png`,
};

export const SLUG_TO_UPLOADED_GALLERY: Record<string, string[]> = {
  "arencia-vitamin-c": [
    `${SUPABASE_MEDIA_BASE}/products/1791959369045-wicadg.png`,
    `${SUPABASE_MEDIA_BASE}/products/1791959538273-1huwbc.png`,
    `${SUPABASE_MEDIA_BASE}/products/1791959549187-an7n5x.png`,
  ],
  "medicube-collagen-mask": [
    `${SUPABASE_MEDIA_BASE}/products/1791959583980-szobvk.png`,
    `${SUPABASE_MEDIA_BASE}/products/1791959609151-apm968.png`,
    `${SUPABASE_MEDIA_BASE}/products/1791959634675-ny0962.png`,
  ],
  "skin1004-centella": [
    `${SUPABASE_MEDIA_BASE}/products/1791959678180-imdqzd.png`,
    `${SUPABASE_MEDIA_BASE}/products/1791959698785-3zrwe4.png`,
    `${SUPABASE_MEDIA_BASE}/products/1791959708562-ticzo2.png`,
  ],
  "simplist-glycolic-toner": [
    `${SUPABASE_MEDIA_BASE}/products/1791959732187-egs1lo.png`,
    `${SUPABASE_MEDIA_BASE}/products/1791959743671-eh2o6j.png`,
    `${SUPABASE_MEDIA_BASE}/products/1791959759713-60bi9s.png`,
  ],
  "laneige-water-mask": [
    `${SUPABASE_MEDIA_BASE}/products/1791959794299-bpbcln.png`,
    `${SUPABASE_MEDIA_BASE}/products/1791959805115-ilfhvu.png`,
    `${SUPABASE_MEDIA_BASE}/products/1791959811976-7dxysc.png`,
  ],
};

const SLUG_TO_UPLOADED_VIDEOS: Record<string, Array<{ video_url: string; title: string }>> = {
  "arencia-vitamin-c": [
    {
      video_url: `${SUPABASE_MEDIA_BASE}/videos/1791961732354-4f676x.mp4`,
      title: "Vitamin C Booster Shot — Application & Texture Guide",
    },
    {
      video_url: `${SUPABASE_MEDIA_BASE}/videos/1791961738326-pojuvb.mp4`,
      title: "Vitamin C Booster Shot — Daily Glow Ritual",
    },
  ],
};

export function resolveProductImageUrl(url: string | undefined | null, slug?: string): string {
  if (!url || !url.trim()) {
    return (slug && SLUG_TO_UPLOADED_GALLERY[slug]?.[0]) || "";
  }
  if (LEGACY_ASSET_URL_MAP[url]) {
    return LEGACY_ASSET_URL_MAP[url]!;
  }
  if (url.startsWith("/__l5e/")) {
    return (slug && SLUG_TO_UPLOADED_GALLERY[slug]?.[0]) || url;
  }
  return url;
}

// Seed fallback products using the existing products.ts catalog with valid UUIDs
export function getInitialProducts(): DBProduct[] {
  return initialSeedProducts.map((p, idx) => {
    const prodId = PRODUCT_SLUG_TO_UUID[p.slug] || `00000000-0000-0000-0000-00000000000${idx + 1}`;
    const galleryUrls = SLUG_TO_UPLOADED_GALLERY[p.slug] || [
      resolveProductImageUrl(p.image, p.slug),
    ];
    const uploadedVids = SLUG_TO_UPLOADED_VIDEOS[p.slug] || [];
    return {
      id: prodId,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      type: p.type,
      size: p.size,
      regular_price: p.wasPrice,
      sale_price: p.price,
      stock_quantity: 45 - idx * 5,
      sku: `KSC-${p.brand.substring(0, 3).toUpperCase()}-0${idx + 1}`,
      category_id:
        idx === 1 || idx === 4
          ? "c2222222-2222-4222-8222-222222222222"
          : idx === 2
            ? "c3333333-3333-4333-8333-333333333333"
            : idx === 3
              ? "c4444444-4444-4444-8444-444444444444"
              : "c1111111-1111-4111-8111-111111111111",
      tag: p.tag,
      concern: p.concern,
      short_description: p.description,
      full_description: `${p.description} Curated directly from Seoul to Pakistan to deliver glass-skin clarity and barrier strength.`,
      is_published: true,
      is_featured: true,
      seo_title: `${p.name} | KoreanSkinCare`,
      seo_description: p.description,
      images: galleryUrls.map((imgUrl, i) => ({
        id: `img-${p.slug}-${i + 1}`,
        product_id: prodId,
        image_url: imgUrl,
        is_primary: i === 0,
        display_order: i,
        alt_text: `${p.brand} ${p.name}`,
      })),
      videos: uploadedVids.map((v, i) => ({
        id: `vid-${p.slug}-${i + 1}`,
        product_id: prodId,
        video_url: v.video_url,
        thumbnail_url: null,
        title: v.title,
        display_order: i,
      })),
      sections: [
        {
          id: `sec-${p.slug}-1`,
          product_id: prodId,
          title: "Highlighted ingredients",
          content: p.ingredients.join(" · "),
          section_type: "ingredients",
          display_order: 1,
        },
        {
          id: `sec-${p.slug}-2`,
          product_id: prodId,
          title: "How to use",
          content: p.use,
          section_type: "usage",
          display_order: 2,
        },
        {
          id: `sec-${p.slug}-3`,
          product_id: prodId,
          title: "Before you begin",
          content:
            "Patch test before first use. Stop use if irritation occurs. Consult product packaging for directions. This is a cosmetic ritual, not medical advice.",
          section_type: "precautions",
          display_order: 3,
        },
      ],
    };
  });
}

// -----------------------------------------------------------------------------
// High-Capacity Browser Persistence (IndexedDB + localStorage)
// Prevents 5MB localStorage QuotaExceededError from ever dropping product pictures
// -----------------------------------------------------------------------------
const IDB_NAME = "ksc_store_idb";
const IDB_STORE = "kv";

function openStoreIdb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openStoreIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openStoreIdb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function getStoredFallback<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStoredFallback<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  // Always persist full unstripped payload to IndexedDB (500MB+ quota)
  void idbSet(key, value);

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // If localStorage hits 5MB quota due to a large base64 data:video URL, strip oversized data:video blobs so product pictures always persist in localStorage too
    try {
      if (Array.isArray(value)) {
        const compact = value.map((item) => {
          if (item && typeof item === "object" && "videos" in item && Array.isArray(item.videos)) {
            return {
              ...item,
              videos: item.videos.filter(
                (v: { video_url?: string }) =>
                  typeof v.video_url === "string" &&
                  (!v.video_url.startsWith("data:") || v.video_url.length < 300000),
              ),
            };
          }
          return item;
        });
        localStorage.setItem(key, JSON.stringify(compact));
      }
    } catch {
      // IndexedDB still holds the full data
    }
  }
}

const CLOUD_CATALOG_STATE_PATH = "store-state/catalog-v1.json";
const CLOUD_CATALOG_SETTINGS_ID = "catalog_state_v1";

interface CloudCatalogState {
  updatedAt: string;
  products: DBProduct[];
  deletedIds: string[];
}

let cachedCloudState: CloudCatalogState | null = null;
let lastCloudFetchAt = 0;

async function fetchCloudCatalogState(force = false): Promise<CloudCatalogState | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  if (!force && cachedCloudState && Date.now() - lastCloudFetchAt < 2500) {
    return cachedCloudState;
  }

  // 1. Primary Cloud State: Query store_settings row 'catalog_state_v1' (Uncached real-time PostgreSQL query)
  try {
    const { data: row, error: rowErr } = await supabase
      .from("store_settings")
      .select("terms_conditions, updated_at")
      .eq("id", CLOUD_CATALOG_SETTINGS_ID)
      .maybeSingle();

    if (!rowErr && row?.terms_conditions) {
      const parsed = JSON.parse(row.terms_conditions) as CloudCatalogState;
      if (parsed && Array.isArray(parsed.products)) {
        cachedCloudState = parsed;
        lastCloudFetchAt = Date.now();
        return parsed;
      }
    }
  } catch {
    // Ignore and check storage fallback
  }

  // 2. Secondary Cloud State: Supabase Storage 'product-media' bucket
  try {
    const { data: pubData } = supabase.storage
      .from("product-media")
      .getPublicUrl(CLOUD_CATALOG_STATE_PATH);
    if (!pubData?.publicUrl) return null;
    const res = await fetch(`${pubData.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const parsed = (await res.json()) as CloudCatalogState;
    if (parsed && Array.isArray(parsed.products)) {
      cachedCloudState = parsed;
      lastCloudFetchAt = Date.now();
      return parsed;
    }
  } catch {
    // Cloud state file may not exist yet
  }
  return null;
}

async function saveCloudCatalogState(products: DBProduct[], deletedIds: string[]): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    // Only store modified products or clean product records without >1.5MB data:video blobs
    const cleanProducts = products.map((p) => {
      const canonicalId =
        (p.slug && PRODUCT_SLUG_TO_UUID[p.slug]) ||
        (p.id && VALID_UUID_REGEX.test(p.id) ? p.id : p.id);
      return {
        ...p,
        id: canonicalId,
        category_id: normalizeCategoryId(p.category_id),
        images: (p.images || []).map((img, idx) => ({
          ...img,
          product_id: canonicalId,
          image_url: resolveProductImageUrl(img.image_url, p.slug),
          is_primary: idx === 0,
          display_order: idx,
        })),
        videos: (p.videos || []).filter(
          (v) => !v.video_url.startsWith("data:") || v.video_url.length < 1500000,
        ),
      };
    });

    const payload: CloudCatalogState = {
      updatedAt: new Date().toISOString(),
      products: cleanProducts,
      deletedIds,
    };
    cachedCloudState = payload;
    lastCloudFetchAt = Date.now();
    const serialized = JSON.stringify(payload);

    // 1. Save to PostgreSQL store_settings (instant, zero CDN caching)
    try {
      await supabase.from("store_settings").upsert({
        id: CLOUD_CATALOG_SETTINGS_ID,
        store_name: "KoreanSkinCare Catalog State",
        currency: "PKR",
        terms_conditions: serialized,
        updated_at: payload.updatedAt,
      });
    } catch (dbErr) {
      console.warn("Cloud catalog DB state sync notice:", dbErr);
    }

    // 2. Also upload to Supabase Storage product-media bucket
    try {
      const blob = new Blob([serialized], { type: "application/json" });
      await supabase.storage.from("product-media").upload(CLOUD_CATALOG_STATE_PATH, blob, {
        cacheControl: "0",
        contentType: "application/json",
        upsert: true,
      });
    } catch (stErr) {
      console.warn("Cloud catalog storage sync notice:", stErr);
    }
  } catch (err) {
    console.warn("Cloud catalog state sync notice:", err);
  }
}

// -----------------------------------------------------------------------------
// Supabase Availability & Error Diagnostics
// -----------------------------------------------------------------------------
let supabaseTablesAvailable: boolean | null = null;
let checkingPromise: Promise<boolean> | null = null;
let lastSupabaseError: { code: string; message: string; hint: string | null } | null = null;

export function getLastSupabaseError(): {
  code: string;
  message: string;
  hint: string | null;
} | null {
  return lastSupabaseError;
}

export async function checkSupabaseAvailable(forceCheck = false): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    supabaseTablesAvailable = false;
    return false;
  }

  if (!forceCheck && supabaseTablesAvailable !== null) {
    return supabaseTablesAvailable;
  }

  if (checkingPromise && !forceCheck) {
    return checkingPromise;
  }

  checkingPromise = (async () => {
    try {
      const { error } = await supabase.from("products").select("id").limit(1);
      if (error) {
        lastSupabaseError = {
          code: error.code,
          message: error.message,
          hint: error.hint || null,
        };
        console.warn("Supabase query check returned notice/error:", error.code, error.message);
        supabaseTablesAvailable = false;
        return false;
      }
      lastSupabaseError = null;
      supabaseTablesAvailable = true;
      return true;
    } catch (err: unknown) {
      lastSupabaseError = {
        code: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : "Supabase connection failed.",
        hint: null,
      };
      supabaseTablesAvailable = false;
      return false;
    } finally {
      checkingPromise = null;
    }
  })();

  return checkingPromise;
}

export function isSupabaseTablesReady(): boolean {
  return supabaseTablesAvailable === true;
}

// Helper to determine if a cached product record was modified by the admin
function isCachedProductModified(p: DBProduct | undefined | null): boolean {
  if (!p || !p.slug) return false;
  if (p.is_user_modified === true) return true;
  if (p.updated_at) return true;
  if (
    Array.isArray(p.images) &&
    p.images.some((img) => img.image_url && !img.image_url.startsWith("/__l5e/"))
  ) {
    return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// Products Service
// -----------------------------------------------------------------------------
export async function getProducts(onlyPublished = false): Promise<DBProduct[]> {
  const [isAvailable, cloudState, idbProducts, idbDeletedIds] = await Promise.all([
    checkSupabaseAvailable(),
    fetchCloudCatalogState(),
    idbGet<DBProduct[]>(STORAGE_PRODUCTS),
    idbGet<string[]>(STORAGE_DELETED_PRODUCT_IDS),
  ]);

  const lsProducts = getStoredFallback<DBProduct[]>(STORAGE_PRODUCTS, []);
  const lsDeletedIds = getStoredFallback<string[]>(STORAGE_DELETED_PRODUCT_IDS, []);

  // Combine IndexedDB and localStorage products, preferring whichever copy is newer
  const localBrowserList: DBProduct[] = [...(idbProducts || []), ...lsProducts];

  // Merge cloud catalog state with browser storage (preferring whichever copy of a product was updated more recently)
  const mergedModifiedMap = new Map<string, DBProduct>();
  for (const cp of cloudState?.products || []) {
    if (cp && cp.slug && isCachedProductModified(cp)) {
      const canonicalId = PRODUCT_SLUG_TO_UUID[cp.slug] || cp.id;
      mergedModifiedMap.set(cp.slug, {
        ...cp,
        id: canonicalId,
        category_id: normalizeCategoryId(cp.category_id),
        is_user_modified: true,
      });
    }
  }

  for (const lp of localBrowserList) {
    if (lp && lp.slug && isCachedProductModified(lp)) {
      const canonicalId = PRODUCT_SLUG_TO_UUID[lp.slug] || lp.id;
      const normalizedLp: DBProduct = {
        ...lp,
        id: canonicalId,
        category_id: normalizeCategoryId(lp.category_id),
        is_user_modified: true,
      };
      const existing = mergedModifiedMap.get(lp.slug);
      if (
        !existing ||
        !existing.updated_at ||
        (normalizedLp.updated_at && normalizedLp.updated_at >= existing.updated_at)
      ) {
        mergedModifiedMap.set(lp.slug, normalizedLp);
      }
    }
  }

  const storedProducts = Array.from(mergedModifiedMap.values());
  if (storedProducts.length > 0 && lsProducts.length === 0) {
    setStoredFallback(STORAGE_PRODUCTS, storedProducts);
  }

  const deletedIds = Array.from(
    new Set([...lsDeletedIds, ...(idbDeletedIds || []), ...(cloudState?.deletedIds || [])]),
  );
  const initialSeeds = getInitialProducts();

  // Normalize any product's images so legacy /__l5e/ URLs are upgraded to live Supabase Storage URLs
  // while NEVER overwriting custom pictures set by the admin (even if the admin set just 1 picture!)
  const normalizeProductMedia = (prod: DBProduct): DBProduct => {
    const seed = initialSeeds.find((s) => s.slug === prod.slug);
    const rawImages = Array.isArray(prod.images) ? [...prod.images] : [];

    // Sort by is_primary first, then display_order ascending
    rawImages.sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    });

    // Check if the database row only has the single untouched legacy /__l5e/ seed image
    const hasOnlyUntouchedLegacySeedImage =
      rawImages.length === 1 &&
      typeof rawImages[0]?.image_url === "string" &&
      rawImages[0].image_url.startsWith("/__l5e/") &&
      !prod.is_user_modified;

    let imgs = rawImages
      .map((img, idx) => ({
        ...img,
        image_url: resolveProductImageUrl(img.image_url, prod.slug),
        is_primary: idx === 0,
        display_order: idx,
      }))
      .filter((img) => Boolean(img.image_url));

    if ((imgs.length === 0 || hasOnlyUntouchedLegacySeedImage) && seed?.images) {
      imgs = seed.images.map((img, idx) => ({
        ...img,
        is_primary: idx === 0,
        display_order: idx,
      }));
    }

    let vids = Array.isArray(prod.videos)
      ? prod.videos.map((v) => ({ ...v, thumbnail_url: null }))
      : [];
    vids.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    if (vids.length === 0 && !prod.is_user_modified && seed?.videos && seed.videos.length > 0) {
      vids = seed.videos;
    }

    let secs = Array.isArray(prod.sections) ? [...prod.sections] : [];
    secs.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    if (secs.length === 0 && seed?.sections && seed.sections.length > 0) {
      secs = seed.sections;
    }

    return {
      ...prod,
      id: (prod.slug && PRODUCT_SLUG_TO_UUID[prod.slug]) || prod.id,
      category_id: normalizeCategoryId(prod.category_id) || seed?.category_id || null,
      images: imgs,
      videos: vids,
      sections: secs,
    };
  };

  // Helper to merge admin modifications onto any base product record
  const applyAdminModifications = (base: DBProduct): DBProduct => {
    const normalizedBase = normalizeProductMedia(base);
    const cached = storedProducts.find(
      (s) =>
        s.slug === normalizedBase.slug ||
        s.id === normalizedBase.id ||
        (normalizedBase.sku && s.sku === normalizedBase.sku),
    );
    if (!cached || !isCachedProductModified(cached)) {
      return normalizedBase;
    }

    const normalizedCached = normalizeProductMedia(cached);

    // Check if the database record itself already has newer custom images from a more recent admin save
    const baseHasCustomDbImages =
      Array.isArray(base.images) &&
      base.images.length > 0 &&
      base.images.some((i) => i.image_url && !i.image_url.startsWith("/__l5e/"));

    const baseIsNewerThanCached =
      baseHasCustomDbImages &&
      normalizedBase.updated_at &&
      normalizedCached.updated_at &&
      new Date(normalizedBase.updated_at).getTime() >
        new Date(normalizedCached.updated_at).getTime() + 2000;

    if (baseIsNewerThanCached) {
      return {
        ...normalizedCached,
        ...normalizedBase,
        images: normalizedBase.images,
        videos:
          normalizedBase.videos && normalizedBase.videos.length > 0
            ? normalizedBase.videos
            : normalizedCached.videos,
        sections:
          normalizedBase.sections && normalizedBase.sections.length > 0
            ? normalizedBase.sections
            : normalizedCached.sections,
        is_user_modified: true,
      };
    }

    return {
      ...normalizedBase,
      name: normalizedCached.name || normalizedBase.name,
      brand: normalizedCached.brand || normalizedBase.brand,
      type: normalizedCached.type || normalizedBase.type,
      size: normalizedCached.size || normalizedBase.size,
      regular_price: normalizedCached.regular_price ?? normalizedBase.regular_price,
      sale_price: normalizedCached.sale_price ?? normalizedBase.sale_price,
      stock_quantity: normalizedCached.stock_quantity ?? normalizedBase.stock_quantity,
      tag: normalizedCached.tag ?? normalizedBase.tag,
      concern: normalizedCached.concern ?? normalizedBase.concern,
      short_description: normalizedCached.short_description ?? normalizedBase.short_description,
      full_description: normalizedCached.full_description ?? normalizedBase.full_description,
      is_published: normalizedCached.is_published ?? normalizedBase.is_published,
      is_featured: normalizedCached.is_featured ?? normalizedBase.is_featured,
      sku: normalizedCached.sku ?? normalizedBase.sku,
      category_id:
        normalizeCategoryId(normalizedCached.category_id) ??
        normalizeCategoryId(normalizedBase.category_id),
      images:
        normalizedCached.images && normalizedCached.images.length > 0
          ? normalizedCached.images
          : normalizedBase.images,
      videos:
        normalizedCached.videos !== undefined ? normalizedCached.videos : normalizedBase.videos,
      sections:
        normalizedCached.sections && normalizedCached.sections.length > 0
          ? normalizedCached.sections
          : normalizedBase.sections,
      is_user_modified: true,
      updated_at: normalizedCached.updated_at || normalizedBase.updated_at,
    };
  };

  let rawList: DBProduct[] = [];

  if (isAvailable && supabase) {
    try {
      let query = supabase
        .from("products")
        .select(
          `
          *,
          images:product_images(*),
          videos:product_videos(*),
          sections:product_detail_sections(*),
          category:categories(*)
        `,
        )
        .order("created_at", { ascending: true });

      if (onlyPublished) {
        query = query.eq("is_published", true);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        rawList = data as DBProduct[];
      } else if (error) {
        // Relational join blocked by child permissions, query base table directly
        let baseQuery = supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: true });
        if (onlyPublished) {
          baseQuery = baseQuery.eq("is_published", true);
        }
        const { data: baseData, error: baseErr } = await baseQuery;
        if (!baseErr && baseData && baseData.length > 0) {
          rawList = baseData as DBProduct[];
        }
      }
    } catch (err: unknown) {
      console.warn("Supabase products fetch notice:", err);
    }
  }

  // Fallback to initial seed products if remote table has no rows or is unavailable
  if (rawList.length === 0) {
    rawList = initialSeeds;
  }

  // Filter out any products deleted by the admin
  rawList = rawList.filter((p) => !deletedIds.includes(p.id) && !deletedIds.includes(p.slug));

  // Apply user edits over the base products
  let merged = rawList.map((p) => applyAdminModifications(p));

  // Include any new products created by the admin that aren't yet in the remote database
  for (const cp of storedProducts) {
    if (
      isCachedProductModified(cp) &&
      !deletedIds.includes(cp.id) &&
      !deletedIds.includes(cp.slug) &&
      !merged.some((m) => m.id === cp.id || m.slug === cp.slug)
    ) {
      merged.unshift(normalizeProductMedia(cp));
    }
  }

  if (onlyPublished) {
    merged = merged.filter((p) => p.is_published);
  }

  return merged;
}

export async function getProductBySlug(slug: string): Promise<DBProduct | null> {
  const products = await getProducts(false);
  const found = products.find((p) => p.slug === slug);
  return found || null;
}

export async function saveProduct(
  productData: Partial<DBProduct> & { name: string; brand: string },
  imagesData: Array<{
    image_url: string;
    is_primary?: boolean;
    alt_text?: string | null | undefined;
  }>,
  videosData: Array<{
    video_url: string;
    title: string;
    thumbnail_url?: string | null | undefined;
  }>,
  sectionsData: Array<{ title: string; content: string; section_type?: string | null | undefined }>,
): Promise<DBProduct> {
  const slug =
    productData.slug ||
    productData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

  // Always prioritize the canonical UUID for our 5 curated products so Supabase foreign keys & unique constraints always match
  const productId =
    (slug && PRODUCT_SLUG_TO_UUID[slug]) ||
    (productData.id && VALID_UUID_REGEX.test(productData.id)
      ? productData.id
      : crypto.randomUUID());

  const cleanCategoryId = normalizeCategoryId(productData.category_id);

  // Ensure primary image is always at index 0 and has display_order: 0
  const cleanedInputImages = imagesData
    .map((img) => ({
      ...img,
      image_url: resolveProductImageUrl(img.image_url, slug),
    }))
    .filter((img) => Boolean(img.image_url));

  const primaryIndex = cleanedInputImages.findIndex((img) => img.is_primary);
  const sortedImagesData = [...cleanedInputImages];
  if (primaryIndex > 0) {
    const [prim] = sortedImagesData.splice(primaryIndex, 1);
    if (prim) sortedImagesData.unshift(prim);
  }

  const formattedImages = sortedImagesData.map((img, i) => ({
    id: `img-${productId}-${i}`,
    product_id: productId,
    image_url: img.image_url,
    is_primary: i === 0,
    display_order: i,
    alt_text: img.alt_text ?? `${productData.brand} ${productData.name}`,
  }));

  const nowIso = new Date().toISOString();

  const fullProduct: DBProduct = {
    id: productId,
    slug,
    name: productData.name.trim(),
    brand: productData.brand.trim(),
    type: productData.type || "Skincare",
    size: productData.size || "Standard",
    regular_price: Number(productData.regular_price) || 2500,
    sale_price: Number(productData.sale_price) || 2000,
    stock_quantity:
      productData.stock_quantity !== undefined && productData.stock_quantity !== null
        ? Number(productData.stock_quantity)
        : 50,
    sku: productData.sku || `KSC-${slug.toUpperCase().slice(0, 8)}`,
    category_id: cleanCategoryId,
    tag: productData.tag || "Seoul Essential",
    concern: productData.concern || "Hydration",
    short_description: productData.short_description || "",
    full_description: productData.full_description || "",
    is_published: productData.is_published ?? true,
    is_featured: productData.is_featured ?? false,
    seo_title: productData.seo_title || `${productData.name} | KoreanSkinCare`,
    seo_description: productData.seo_description || productData.short_description || "",
    images: formattedImages,
    videos: videosData.map((vid, i) => ({
      id: `vid-${productId}-${i}`,
      product_id: productId,
      video_url: vid.video_url,
      thumbnail_url: null,
      title: vid.title,
      display_order: i,
    })),
    sections: sectionsData.map((sec, i) => ({
      id: `sec-${productId}-${i}`,
      product_id: productId,
      title: sec.title,
      content: sec.content,
      section_type: sec.section_type || "custom",
      display_order: i,
    })),
    is_user_modified: true,
    updated_at: nowIso,
  };

  // 1. Always update persistent browser storage (IndexedDB + localStorage) first
  const idbExisting = await idbGet<DBProduct[]>(STORAGE_PRODUCTS);
  const baseStored =
    idbExisting && idbExisting.length > 0
      ? idbExisting
      : getStoredFallback<DBProduct[]>(STORAGE_PRODUCTS, getInitialProducts());

  const stored = baseStored.map((p) => ({
    ...p,
    id: (p.slug && PRODUCT_SLUG_TO_UUID[p.slug]) || p.id,
    category_id: normalizeCategoryId(p.category_id),
  }));

  const existingIndex = stored.findIndex(
    (p) =>
      p.slug === slug ||
      p.id === productId ||
      (productData.id && p.id === productData.id) ||
      (productData.sku && p.sku === productData.sku),
  );
  if (existingIndex > -1) {
    stored[existingIndex] = fullProduct;
  } else {
    stored.unshift(fullProduct);
  }
  setStoredFallback(STORAGE_PRODUCTS, stored);

  // Also ensure deletedIds doesn't block a re-saved product
  const deletedIds = getStoredFallback<string[]>(STORAGE_DELETED_PRODUCT_IDS, []).filter(
    (delId) => delId !== productId && delId !== slug,
  );
  setStoredFallback(STORAGE_DELETED_PRODUCT_IDS, deletedIds);

  // 2. Sync to Supabase Database tables (products, product_images, product_videos, product_detail_sections)
  if (isSupabaseConfigured() && supabase) {
    let targetDbProductId = productId;

    // Check if a product with this slug already exists in Supabase so we always use its exact UUID
    try {
      const { data: existingRow } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (existingRow?.id) {
        targetDbProductId = existingRow.id;
      }
    } catch {
      // ignore
    }

    const productPayload = {
      id: targetDbProductId,
      slug,
      name: fullProduct.name,
      brand: fullProduct.brand,
      type: fullProduct.type,
      size: fullProduct.size,
      regular_price: fullProduct.regular_price,
      sale_price: fullProduct.sale_price,
      stock_quantity: fullProduct.stock_quantity,
      sku: fullProduct.sku,
      category_id: cleanCategoryId,
      tag: fullProduct.tag,
      concern: fullProduct.concern,
      short_description: fullProduct.short_description,
      full_description: fullProduct.full_description,
      is_published: fullProduct.is_published,
      is_featured: fullProduct.is_featured,
      seo_title: fullProduct.seo_title,
      seo_description: fullProduct.seo_description,
      updated_at: nowIso,
    };

    try {
      const { error: pErr } = await supabase.from("products").upsert(productPayload);
      if (pErr) {
        console.warn(
          `Supabase products upsert notice (${pErr.message}), attempting update by slug.`,
        );
        await supabase.from("products").update(productPayload).eq("slug", slug);
      }
    } catch (saveErr: unknown) {
      console.warn("Supabase save product exception:", saveErr);
    }

    // Always sync product_images in Supabase using sortedImagesData (even if products upsert had a notice)
    try {
      await supabase.from("product_images").delete().eq("product_id", targetDbProductId);
      if (sortedImagesData.length > 0) {
        const imageRows = sortedImagesData.map((img, i) => ({
          product_id: targetDbProductId,
          image_url: img.image_url,
          is_primary: i === 0,
          display_order: i,
          alt_text: img.alt_text || `${fullProduct.brand} ${fullProduct.name}`,
        }));
        const { error: imgInsErr } = await supabase.from("product_images").insert(imageRows);
        if (imgInsErr) {
          console.warn("Supabase product_images insert notice:", imgInsErr.message);
        }
      }
    } catch (imgErr) {
      console.warn("Product images update warning in Supabase:", imgErr);
    }

    // Always sync product_videos in Supabase
    try {
      await supabase.from("product_videos").delete().eq("product_id", targetDbProductId);
      if (videosData.length > 0) {
        const videoRows = videosData.map((vid, i) => ({
          product_id: targetDbProductId,
          video_url: vid.video_url,
          thumbnail_url: null,
          title: vid.title,
          display_order: i,
        }));
        const { error: vidInsErr } = await supabase.from("product_videos").insert(videoRows);
        if (vidInsErr) {
          console.warn("Supabase product_videos insert notice:", vidInsErr.message);
        }
      }
    } catch (vidErr) {
      console.warn("Product videos update warning in Supabase:", vidErr);
    }

    // Always sync product_detail_sections in Supabase
    try {
      await supabase.from("product_detail_sections").delete().eq("product_id", targetDbProductId);
      if (sectionsData.length > 0) {
        const sectionRows = sectionsData.map((sec, i) => ({
          product_id: targetDbProductId,
          title: sec.title,
          content: sec.content,
          section_type: sec.section_type || "custom",
          display_order: i,
        }));
        await supabase.from("product_detail_sections").insert(sectionRows);
      }
    } catch (secErr) {
      console.warn("Product sections update warning in Supabase:", secErr);
    }
  }

  // 3. Sync updated catalog state to Supabase store_settings & Storage so changes persist across all browsers/SSR
  await saveCloudCatalogState(stored, deletedIds);

  return fullProduct;
}

// Automatically heals and syncs current catalog images/videos to Supabase when admin opens console
export async function syncCatalogToSupabase(productsList: DBProduct[]): Promise<void> {
  if (!isSupabaseConfigured() || !supabase || productsList.length === 0) return;
  try {
    const deletedIds = getStoredFallback<string[]>(STORAGE_DELETED_PRODUCT_IDS, []);
    await saveCloudCatalogState(productsList, deletedIds);

    for (const prod of productsList) {
      const targetId = (prod.slug && PRODUCT_SLUG_TO_UUID[prod.slug]) || prod.id;
      if (!VALID_UUID_REGEX.test(targetId)) continue;

      if (prod.images && prod.images.length > 0) {
        const { data: existingImgs } = await supabase
          .from("product_images")
          .select("id, image_url, is_primary")
          .eq("product_id", targetId);

        const needsSync =
          !existingImgs ||
          existingImgs.length !== prod.images.length ||
          existingImgs.some((e) => e.image_url.startsWith("/__l5e/")) ||
          existingImgs.find((e) => e.is_primary)?.image_url !== prod.images[0]?.image_url;

        if (needsSync) {
          await supabase.from("product_images").delete().eq("product_id", targetId);
          await supabase.from("product_images").insert(
            prod.images.map((img, i) => ({
              product_id: targetId,
              image_url: resolveProductImageUrl(img.image_url, prod.slug),
              is_primary: i === 0,
              display_order: i,
              alt_text: img.alt_text || `${prod.brand} ${prod.name}`,
            })),
          );
        }
      }

      if (prod.videos && prod.videos.length > 0) {
        const { data: existingVids } = await supabase
          .from("product_videos")
          .select("id, video_url, title")
          .eq("product_id", targetId);

        const needsVidSync =
          !existingVids ||
          existingVids.length !== prod.videos.length ||
          existingVids.some((v, idx) => v.title !== prod.videos?.[idx]?.title);

        if (needsVidSync) {
          await supabase.from("product_videos").delete().eq("product_id", targetId);
          await supabase.from("product_videos").insert(
            prod.videos.map((vid, i) => ({
              product_id: targetId,
              video_url: vid.video_url,
              thumbnail_url: null,
              title: vid.title,
              display_order: i,
            })),
          );
        }
      }
    }
  } catch (err) {
    console.warn("Background catalog sync notice:", err);
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const stored = getStoredFallback<DBProduct[]>(STORAGE_PRODUCTS, getInitialProducts());
  const target = stored.find((p) => p.id === id);
  const updatedStored = stored.filter(
    (p) => p.id !== id && (!target?.slug || p.slug !== target.slug),
  );
  setStoredFallback(STORAGE_PRODUCTS, updatedStored);

  const deletedIds = getStoredFallback<string[]>(STORAGE_DELETED_PRODUCT_IDS, []);
  if (!deletedIds.includes(id)) {
    deletedIds.push(id);
  }
  if (target?.slug && !deletedIds.includes(target.slug)) {
    deletedIds.push(target.slug);
  }
  setStoredFallback(STORAGE_DELETED_PRODUCT_IDS, deletedIds);

  await saveCloudCatalogState(updatedStored, deletedIds);

  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) {
        console.warn(
          `Supabase delete product error (${error.message}), deleted in cloud storage & local cache.`,
        );
      }
    } catch (err: unknown) {
      console.warn("Supabase delete product exception:", err);
    }
  }
}

// -----------------------------------------------------------------------------
// Categories Service
// -----------------------------------------------------------------------------
export async function getCategories(): Promise<DBCategory[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) {
        console.warn("Categories query notice (using defaults):", error.message);
      } else if (data && data.length > 0) {
        return data as DBCategory[];
      }
    } catch (err: unknown) {
      console.warn("Categories fetch exception:", err);
    }
  }
  return getStoredFallback<DBCategory[]>(STORAGE_CATEGORIES, DEFAULT_CATEGORIES);
}

export async function saveCategory(
  category: Partial<DBCategory> & { name: string },
): Promise<DBCategory> {
  const slug =
    category.slug ||
    category.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

  const id = category.id || crypto.randomUUID();
  const fullCat: DBCategory = {
    id,
    name: category.name,
    slug,
    description: category.description || "",
    display_order: category.display_order ?? 0,
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from("categories").upsert(fullCat).select().single();
      if (error) {
        console.warn(`Supabase save category error (${error.message}), saving locally.`);
      } else if (data) {
        return data as DBCategory;
      }
    } catch (err: unknown) {
      console.warn("Supabase save category exception, saving locally:", err);
    }
  }

  const stored = getStoredFallback<DBCategory[]>(STORAGE_CATEGORIES, DEFAULT_CATEGORIES);
  const idx = stored.findIndex((c) => c.id === id || c.slug === slug);
  if (idx > -1) {
    stored[idx] = fullCat;
  } else {
    stored.push(fullCat);
  }
  setStoredFallback(STORAGE_CATEGORIES, stored);
  return fullCat;
}

export async function deleteCategory(id: string): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) {
        console.warn(`Supabase delete category error (${error.message}), removing locally.`);
      } else {
        return;
      }
    } catch (err: unknown) {
      console.warn("Supabase delete category exception, removing locally:", err);
    }
  }
  const stored = getStoredFallback<DBCategory[]>(STORAGE_CATEGORIES, DEFAULT_CATEGORIES);
  setStoredFallback(
    STORAGE_CATEGORIES,
    stored.filter((c) => c.id !== id),
  );
}

// -----------------------------------------------------------------------------
// Shipping & Store Settings
// -----------------------------------------------------------------------------
const DEFAULT_SHIPPING: DBShippingSettings = {
  id: "default",
  flat_delivery_fee: 250,
  free_delivery_threshold: 5000,
  free_delivery_enabled: false,
  currency: "PKR",
};

export async function getShippingSettings(): Promise<DBShippingSettings> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from("shipping_settings")
      .select("*")
      .eq("id", "default")
      .single();
    if (error) {
      console.warn("Shipping settings query:", error.message);
      return DEFAULT_SHIPPING;
    }
    return (data || DEFAULT_SHIPPING) as DBShippingSettings;
  }
  return getStoredFallback<DBShippingSettings>(STORAGE_SHIPPING, DEFAULT_SHIPPING);
}

export async function updateShippingSettings(
  settings: Partial<DBShippingSettings>,
): Promise<DBShippingSettings> {
  const merged = { ...DEFAULT_SHIPPING, ...settings, id: "default" };
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("shipping_settings")
        .upsert(merged)
        .select()
        .single();
      if (error) {
        console.warn(
          `Supabase update shipping settings error (${error.message}), saving to persistent local storage.`,
        );
      } else if (data) {
        setStoredFallback(STORAGE_SHIPPING, data as DBShippingSettings);
        return data as DBShippingSettings;
      }
    } catch (err: unknown) {
      console.warn("Supabase update shipping settings exception, saving to local storage:", err);
    }
  }
  setStoredFallback(STORAGE_SHIPPING, merged);
  return merged;
}

const DEFAULT_STORE_SETTINGS: DBStoreSettings = {
  id: "default",
  store_name: "KoreanSkinCare",
  contact_email: "",
  contact_phone: "03144706515",
  whatsapp_number: "03144706515",
  store_address: "Lahore, Pakistan",
  currency: "PKR",
  announcement_bar: "SEOUL TO PAKISTAN · A MORE CONSIDERED SKINCARE RITUAL",
  return_policy:
    "We offer a 7-day return policy for sealed, undamaged products in original packaging.",
  privacy_policy:
    "Your personal and delivery information is encrypted and used strictly for order fulfillment.",
  shipping_policy:
    "Deliveries take 2-4 business days across Pakistan via express courier with Cash on Delivery.",
  terms_conditions:
    "All sales are subject to authenticity assurance and standard consumer protection laws.",
};

export async function getStoreSettings(): Promise<DBStoreSettings> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .eq("id", "default")
        .single();
      if (error) {
        console.warn("Store settings query:", error.message);
        return getStoredFallback<DBStoreSettings>(STORAGE_SETTINGS, DEFAULT_STORE_SETTINGS);
      }
      return (data || DEFAULT_STORE_SETTINGS) as DBStoreSettings;
    } catch {
      return getStoredFallback<DBStoreSettings>(STORAGE_SETTINGS, DEFAULT_STORE_SETTINGS);
    }
  }
  return getStoredFallback<DBStoreSettings>(STORAGE_SETTINGS, DEFAULT_STORE_SETTINGS);
}

export async function updateStoreSettings(
  settings: Partial<DBStoreSettings>,
): Promise<DBStoreSettings> {
  const merged = { ...DEFAULT_STORE_SETTINGS, ...settings, id: "default" };
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .upsert(merged)
        .select()
        .single();
      if (error) {
        console.warn(
          `Supabase update store settings error (${error.message}), saving to persistent local storage.`,
        );
      } else if (data) {
        setStoredFallback(STORAGE_SETTINGS, data as DBStoreSettings);
        return data as DBStoreSettings;
      }
    } catch (err: unknown) {
      console.warn("Supabase update store settings exception, saving to local storage:", err);
    }
  }
  setStoredFallback(STORAGE_SETTINGS, merged);
  return merged;
}

// -----------------------------------------------------------------------------
// Orders & Cash On Delivery Checkout
// -----------------------------------------------------------------------------
export interface CheckoutPayload {
  customer_name: string;
  customer_phone: string;
  customer_whatsapp?: string | null | undefined;
  customer_email?: string | null | undefined;
  delivery_address: string;
  city: string;
  province: string;
  postal_code?: string | null | undefined;
  order_notes?: string | null | undefined;
  items: Array<{
    product_id: string;
    slug?: string | undefined;
    quantity: number;
    name?: string | undefined;
    brand?: string | undefined;
    price?: number | undefined;
    image?: string | undefined;
  }>;
}

export async function placeOrderCOD(payload: CheckoutPayload): Promise<{
  order_id: string;
  order_number: string;
  total_amount: number;
  delivery_fee: number;
  subtotal: number;
}> {
  const currentProducts = await getProducts(false);
  for (const item of payload.items) {
    const matched = currentProducts.find((p) => p.id === item.product_id || p.slug === item.slug);
    if (matched && ((matched.stock_quantity ?? 0) <= 0 || matched.stock_quantity < item.quantity)) {
      throw new Error(`Unstock: ${matched.name} is out of stock and cannot be ordered.`);
    }
  }

  if (isSupabaseConfigured() && supabase) {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const itemsForRPC = payload.items.map((i) => {
      let resolvedId = i.product_id;
      const mappedId = i.slug ? PRODUCT_SLUG_TO_UUID[i.slug] : undefined;
      if (!UUID_REGEX.test(resolvedId) && mappedId) {
        resolvedId = mappedId;
      }
      return {
        product_id: resolvedId,
        quantity: i.quantity,
      };
    });

    const { data, error } = await supabase.rpc("place_order_cod", {
      p_customer_name: payload.customer_name,
      p_customer_phone: payload.customer_phone,
      p_customer_whatsapp: payload.customer_whatsapp || null,
      p_customer_email: payload.customer_email || null,
      p_delivery_address: payload.delivery_address,
      p_city: payload.city,
      p_province: payload.province,
      p_postal_code: payload.postal_code || null,
      p_order_notes: payload.order_notes || null,
      p_items: itemsForRPC,
    });

    if (error) {
      throw new Error(error.message || "Failed to place order in Supabase.");
    }

    if (data && data.order_number) {
      return {
        order_id: data.order_id,
        order_number: data.order_number,
        total_amount: Number(data.total_amount),
        delivery_fee: Number(data.delivery_fee),
        subtotal: Number(data.subtotal),
      };
    }

    throw new Error("Invalid response received from Supabase checkout RPC.");
  }

  // Fallback only when Supabase is completely unconfigured
  const shippingSettings = await getShippingSettings();
  const products = await getProducts();

  let subtotal = 0;
  const orderItems = [];

  for (const item of payload.items) {
    const product = products.find((p) => p.id === item.product_id || p.slug === item.slug);
    if (!product) {
      throw new Error(`Product not found: ${item.name || item.product_id}`);
    }
    if (product.stock_quantity < item.quantity) {
      throw new Error(
        `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}`,
      );
    }
    const unitPrice = product.sale_price;
    const itemTotal = unitPrice * item.quantity;
    subtotal += itemTotal;

    orderItems.push({
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      order_id: "",
      product_id: product.id,
      product_name: product.name,
      product_brand: product.brand,
      product_image: product.images?.[0]?.image_url || null,
      quantity: item.quantity,
      unit_price: unitPrice,
      total_price: itemTotal,
    });

    // Deduct stock in fallback
    product.stock_quantity -= item.quantity;
  }

  let deliveryFee = shippingSettings.flat_delivery_fee;
  if (
    shippingSettings.free_delivery_enabled &&
    subtotal >= shippingSettings.free_delivery_threshold
  ) {
    deliveryFee = 0;
  }
  const totalAmount = subtotal + deliveryFee;

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  const orderNumber = `KSC-${dateStr}-${randCode}`;
  const orderId = `ord-${Date.now()}`;

  orderItems.forEach((i) => (i.order_id = orderId));

  const newOrder: DBOrder = {
    id: orderId,
    order_number: orderNumber,
    customer_name: payload.customer_name,
    customer_phone: payload.customer_phone,
    customer_whatsapp: payload.customer_whatsapp ?? null,
    customer_email: payload.customer_email ?? null,
    delivery_address: payload.delivery_address,
    city: payload.city,
    province: payload.province,
    postal_code: payload.postal_code ?? null,
    order_notes: payload.order_notes ?? null,
    subtotal,
    delivery_fee: deliveryFee,
    total_amount: totalAmount,
    payment_method: "COD",
    payment_status: "unpaid",
    order_status: "pending",
    created_at: new Date().toISOString(),
    items: orderItems,
    history: [
      {
        id: `hist-${Date.now()}`,
        order_id: orderId,
        new_status: "pending",
        notes: "Order placed via Cash on Delivery",
        changed_by: "System",
        created_at: new Date().toISOString(),
      },
    ],
  };

  const storedOrders = getStoredFallback<DBOrder[]>(STORAGE_ORDERS, []);
  storedOrders.unshift(newOrder);
  setStoredFallback(STORAGE_ORDERS, storedOrders);

  return {
    order_id: orderId,
    order_number: orderNumber,
    total_amount: totalAmount,
    delivery_fee: deliveryFee,
    subtotal,
  };
}

export async function getOrders(statusFilter?: string, searchQuery?: string): Promise<DBOrder[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase
        .from("orders")
        .select(
          `
          *,
          items:order_items(*),
          history:order_status_history(*)
        `,
        )
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("order_status", statusFilter);
      }

      if (searchQuery && searchQuery.trim().length > 0) {
        const q = searchQuery.trim();
        query = query.or(
          `order_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%,city.ilike.%${q}%`,
        );
      }

      const { data, error } = await query;
      if (error) {
        console.warn("Supabase orders query notice (using local store fallback):", error.message);

        // Try querying base table if the error was due to child relation join
        let baseQuery = supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });

        if (statusFilter && statusFilter !== "all") {
          baseQuery = baseQuery.eq("order_status", statusFilter);
        }

        if (searchQuery && searchQuery.trim().length > 0) {
          const q = searchQuery.trim();
          baseQuery = baseQuery.or(
            `order_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%,city.ilike.%${q}%`,
          );
        }

        const { data: baseData, error: baseErr } = await baseQuery;
        if (!baseErr && baseData && baseData.length > 0) {
          return (baseData as DBOrder[]).filter((o) => !isDemoOrder(o));
        }
      } else if (data) {
        return (data as DBOrder[]).filter((o) => !isDemoOrder(o));
      }
    } catch (err: unknown) {
      console.warn("Supabase getOrders exception:", err);
    }
  }

  const rawOrders = getStoredFallback<DBOrder[]>(STORAGE_ORDERS, []);
  // Strip out any fake demo orders permanently
  const cleaned = (rawOrders || []).filter((o) => !isDemoOrder(o));
  if (cleaned.length !== rawOrders.length) {
    setStoredFallback(STORAGE_ORDERS, cleaned);
  }

  let orders = cleaned;
  if (statusFilter && statusFilter !== "all") {
    orders = orders.filter((o) => o.order_status === statusFilter);
  }
  if (searchQuery && searchQuery.trim().length > 0) {
    const q = searchQuery.toLowerCase().trim();
    orders = orders.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q),
    );
  }
  return orders;
}

export async function deleteOrder(orderId: string): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from("order_items").delete().eq("order_id", orderId);
      await supabase.from("order_status_history").delete().eq("order_id", orderId);
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) {
        console.warn("Supabase delete order warning:", error.message);
      }
    } catch (err) {
      console.warn("Supabase delete order exception:", err);
    }
  }

  const stored = getStoredFallback<DBOrder[]>(STORAGE_ORDERS, []);
  const updated = stored.filter((o) => o.id !== orderId);
  setStoredFallback(STORAGE_ORDERS, updated);
  return true;
}

export async function clearAllDemoOrders(): Promise<number> {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from("orders").delete().ilike("id", "ord-demo-%");
      await supabase
        .from("orders")
        .delete()
        .in("customer_name", ["Ayesha Malik", "Fatima Noor", "Zainab Raza"]);
    } catch (e) {
      console.warn("Supabase clear demo orders warning:", e);
    }
  }

  const stored = getStoredFallback<DBOrder[]>(STORAGE_ORDERS, []);
  const realOrders = stored.filter((o) => !isDemoOrder(o));
  const removedCount = stored.length - realOrders.length;
  setStoredFallback(STORAGE_ORDERS, realOrders);
  return removedCount;
}

export async function getOrderByNumber(orderNumber: string): Promise<DBOrder | null> {
  const orders = await getOrders();
  const match = orders.find(
    (o) => o.order_number.toUpperCase() === orderNumber.toUpperCase().trim(),
  );
  return match || null;
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: DBOrder["order_status"],
  notes?: string,
  changedBy = "Admin",
): Promise<DBOrder> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: currentOrder } = await supabase
        .from("orders")
        .select("order_status")
        .eq("id", orderId)
        .single();

      const prevStatus = currentOrder?.order_status || null;

      const { data, error } = await supabase
        .from("orders")
        .update({
          order_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select(
          `
          *,
          items:order_items(*),
          history:order_status_history(*)
        `,
        )
        .single();

      if (error) {
        console.warn(
          `Supabase update order status error (${error.message}), falling back to local storage.`,
        );
      } else {
        try {
          await supabase.from("order_status_history").insert({
            order_id: orderId,
            previous_status: prevStatus,
            new_status: newStatus,
            notes: notes || `Status updated to ${newStatus}`,
            changed_by: changedBy,
          });
        } catch {
          // non-critical audit log
        }
        if (data) {
          return data as DBOrder;
        }
      }
    } catch (err: unknown) {
      console.warn("Supabase updateOrderStatus exception, falling back to local storage:", err);
    }
  }

  const storedOrders = getStoredFallback<DBOrder[]>(STORAGE_ORDERS, []);
  const idx = storedOrders.findIndex((o) => o.id === orderId);
  if (idx === -1) throw new Error("Order not found");

  const order = storedOrders[idx]!;
  const prev = order.order_status;
  order.order_status = newStatus;
  order.updated_at = new Date().toISOString();

  if (!order.history) order.history = [];
  order.history.unshift({
    id: `hist-${Date.now()}`,
    order_id: orderId,
    previous_status: prev,
    new_status: newStatus,
    notes: notes || `Status changed from ${prev} to ${newStatus}`,
    changed_by: changedBy,
    created_at: new Date().toISOString(),
  });

  storedOrders[idx] = order;
  setStoredFallback(STORAGE_ORDERS, storedOrders);
  return order;
}

export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: "paid" | "unpaid",
): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      if (error) {
        console.warn(
          `Supabase update payment status error (${error.message}), falling back to local storage.`,
        );
      } else {
        return;
      }
    } catch (err: unknown) {
      console.warn("Supabase update payment status exception:", err);
    }
  }

  const storedOrders = getStoredFallback<DBOrder[]>(STORAGE_ORDERS, []);
  const order = storedOrders.find((o) => o.id === orderId);
  if (order) {
    order.payment_status = paymentStatus;
    order.updated_at = new Date().toISOString();
    setStoredFallback(STORAGE_ORDERS, storedOrders);
  }
}

export async function updateOrderInternalNotes(orderId: string, notes: string): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          internal_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      if (error) {
        console.warn(
          `Supabase update internal notes error (${error.message}), falling back to local storage.`,
        );
      } else {
        return;
      }
    } catch (err: unknown) {
      console.warn("Supabase update internal notes exception:", err);
    }
  }

  const storedOrders = getStoredFallback<DBOrder[]>(STORAGE_ORDERS, []);
  const order = storedOrders.find((o) => o.id === orderId);
  if (order) {
    order.internal_notes = notes;
    order.updated_at = new Date().toISOString();
    setStoredFallback(STORAGE_ORDERS, storedOrders);
  }
}

// -----------------------------------------------------------------------------
// Customer Order Tracking (Connected to track_order RPC)
// -----------------------------------------------------------------------------
export async function trackOrder(
  orderNumber: string,
  phoneNumber: string,
): Promise<{
  found: boolean;
  error?: string;
  order?: {
    order_number: string;
    customer_name: string;
    city: string;
    province: string;
    subtotal: number;
    delivery_fee: number;
    total_amount: number;
    payment_status: string;
    order_status: string;
    created_at: string;
    items: Array<{
      product_name: string;
      product_brand: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      product_image?: string | null | undefined;
    }>;
    history: Array<{
      status: string;
      created_at: string;
      notes?: string | null | undefined;
    }>;
  };
}> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.rpc("track_order", {
        p_order_number: orderNumber.trim(),
        p_phone: phoneNumber.trim(),
      });
      if (error) {
        throw new Error(error.message);
      }
      if (data) {
        if (data.found === false) {
          return { found: false, error: data.error || "Order not found." };
        }
        return {
          found: true,
          order: {
            order_number: data.order_number,
            customer_name: data.customer_name,
            city: data.city,
            province: data.province,
            subtotal: Number(data.subtotal),
            delivery_fee: Number(data.delivery_fee),
            total_amount: Number(data.total_amount),
            payment_status: data.payment_status,
            order_status: data.order_status,
            created_at: data.created_at,
            items: data.items || [],
            history: (data.history || []).map(
              (h: {
                status?: string;
                new_status?: string;
                created_at: string;
                notes?: string;
              }) => ({
                status: h.status || h.new_status || "update",
                created_at: h.created_at,
                notes: h.notes,
              }),
            ),
          },
        };
      }
    } catch (err: unknown) {
      console.error("Order tracking error in Supabase:", err);
      return {
        found: false,
        error:
          err instanceof Error ? err.message : "Failed to retrieve tracking info from Supabase.",
      };
    }
  }

  // Fallback only if Supabase unconfigured
  const storedOrders = getStoredFallback<DBOrder[]>(STORAGE_ORDERS, []);
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  const match = storedOrders.find((o) => {
    const oPhone = o.customer_phone.replace(/\D/g, "");
    return (
      o.order_number.toUpperCase() === orderNumber.toUpperCase().trim() &&
      (oPhone === cleanPhone ||
        oPhone.endsWith(cleanPhone) ||
        cleanPhone.endsWith(oPhone) ||
        cleanPhone.slice(-7) === oPhone.slice(-7))
    );
  });

  if (!match) {
    return {
      found: false,
      error: "No order matched the provided order number and phone number.",
    };
  }

  return {
    found: true,
    order: {
      order_number: match.order_number,
      customer_name: match.customer_name,
      city: match.city,
      province: match.province,
      subtotal: match.subtotal,
      delivery_fee: match.delivery_fee,
      total_amount: match.total_amount,
      payment_status: match.payment_status,
      order_status: match.order_status,
      created_at: match.created_at,
      items: (match.items || []).map((i) => ({
        product_name: i.product_name,
        product_brand: i.product_brand,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
        product_image: i.product_image,
      })),
      history: (match.history || []).map((h) => ({
        status: h.new_status,
        created_at: h.created_at,
        notes: h.notes || undefined,
      })),
    },
  };
}

// -----------------------------------------------------------------------------
// Media Upload (Supabase Storage 'product-media' Bucket)
// -----------------------------------------------------------------------------
export async function uploadMediaFile(
  file: File,
  folder = "products",
): Promise<{ url: string; error?: string }> {
  // 1. Attempt upload to Supabase Storage if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

      const { data, error } = await supabase.storage.from("product-media").upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

      if (!error && data) {
        const { data: pubData } = supabase.storage.from("product-media").getPublicUrl(data.path);
        if (pubData?.publicUrl) {
          return { url: pubData.publicUrl };
        }
      }

      if (error) {
        console.warn(
          "Supabase storage upload notice (using optimized image data URL fallback):",
          error.message,
        );
      }
    } catch (err: unknown) {
      console.warn("Supabase storage exception (falling back to image data URL):", err);
    }
  }

  // 2. Resilient fallback: Convert to optimized Base64 data URL
  return new Promise((resolve) => {
    // If it's not an image (e.g. video), read standard data URL
    if (!file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ url: (reader.result as string) || "" });
      };
      reader.onerror = () => {
        resolve({ url: "", error: "Failed to read file" });
      };
      reader.readAsDataURL(file);
      return;
    }

    if (typeof window === "undefined") {
      resolve({ url: "" });
      return;
    }

    // Optimize & compress image using canvas to ensure high quality and low memory footprint (~80-120KB)
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
          resolve({ url: dataUrl });
          return;
        }
      } catch (e) {
        console.warn("Canvas compression failed, falling back to direct reader:", e);
      }

      const reader = new FileReader();
      reader.onloadend = () => resolve({ url: (reader.result as string) || "" });
      reader.onerror = () => resolve({ url: "", error: "Failed to read file locally" });
      reader.readAsDataURL(file);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onloadend = () => resolve({ url: (reader.result as string) || "" });
      reader.onerror = () => resolve({ url: "", error: "Failed to load image file" });
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

// -----------------------------------------------------------------------------
// Customer Reviews Service (Live Server + Supabase + Browser Persistence)
// -----------------------------------------------------------------------------
export interface CustomerReview {
  id: string;
  productSlug: string;
  productName: string;
  customerName: string;
  city: string;
  rating: number;
  comment: string;
  imageUrl?: string | null;
  createdAt: string;
}

const STORAGE_REVIEWS = "ksc_customer_reviews_v1";
const CLOUD_REVIEWS_SETTINGS_ID = "customer_reviews_v1";

const SEED_CUSTOMER_REVIEWS: CustomerReview[] = [
  {
    id: "seed-rev-1",
    productSlug: "arencia-vitamin-c",
    productName: "Vitamin C Booster Shot",
    customerName: "Ayesha Malik",
    city: "Lahore",
    rating: 5,
    comment:
      "Original Korean product mila hai! 1 week use karne ke baad skin par bohot acha glow aaya hai aur dark spots bhi light ho rahe hain. Highly recommended!",
    imageUrl: null,
    createdAt: "2026-10-13T18:30:00.000Z",
  },
  {
    id: "seed-rev-2",
    productSlug: "medicube-collagen-mask",
    productName: "Collagen Night Wrapping Mask",
    customerName: "Zainab Tariq",
    city: "Karachi",
    rating: 5,
    comment:
      "Night wrapping mask bilkul glass skin effect deta hai subha uth kar. Packaging sealed thi aur delivery 2 din me mil gayi.",
    imageUrl: null,
    createdAt: "2026-10-13T14:15:00.000Z",
  },
  {
    id: "seed-rev-3",
    productSlug: "skin1004-centella",
    productName: "Madagascar Centella Ampoule",
    customerName: "Hira Siddiqui",
    city: "Islamabad",
    rating: 5,
    comment:
      "Meri sensitive aur acne-prone skin ke liye best ampoule hai. Redness bilkul khatam ho gayi aur 100% authentic SKIN1004 bottle hai.",
    imageUrl: null,
    createdAt: "2026-10-13T11:20:00.000Z",
  },
  {
    id: "seed-rev-4",
    productSlug: "laneige-water-mask",
    productName: "Water Sleeping Mask EX",
    customerName: "Fatima Noor",
    city: "Rawalpindi",
    rating: 5,
    comment:
      "Dry skin ke liye magic hai! Raat ko laga kar soti hoon aur subha skin super soft aur hydrated hoti hai.",
    imageUrl: null,
    createdAt: "2026-10-12T19:45:00.000Z",
  },
  {
    id: "seed-rev-5",
    productSlug: "simplist-glycolic-acid",
    productName: "Glycolic Acid 7% Toning Solution",
    customerName: "Maham Khan",
    city: "Faisalabad",
    rating: 5,
    comment:
      "Texture aur bumpy skin ke liye bohot zabardast toner hai. Haftay me 3 dafa use karti hoon aur pores visibly clean ho gaye hain.",
    imageUrl: null,
    createdAt: "2026-10-12T15:10:00.000Z",
  },
  {
    id: "seed-rev-6",
    productSlug: "arencia-vitamin-c",
    productName: "Vitamin C Booster Shot",
    customerName: "Sana Javed",
    city: "Multan",
    rating: 5,
    comment:
      "Bilkul non-sticky formula hai aur jaldi absorb ho jata hai. Acne marks kafi had tak fade ho gaye hain 10 din me.",
    imageUrl: null,
    createdAt: "2026-10-11T20:05:00.000Z",
  },
  {
    id: "seed-rev-7",
    productSlug: "medicube-collagen-mask",
    productName: "Collagen Night Wrapping Mask",
    customerName: "Areeba Sheikh",
    city: "Lahore",
    rating: 5,
    comment:
      "Pehle mujhe laga hype hai lekin pehli dafa peel off karne ke baad hi skin itni plump aur shiny lag rahi thi! Worth every rupee.",
    imageUrl: null,
    createdAt: "2026-10-11T16:40:00.000Z",
  },
  {
    id: "seed-rev-8",
    productSlug: "skin1004-centella",
    productName: "Madagascar Centella Ampoule",
    customerName: "Nimra Hussain",
    city: "Peshawar",
    rating: 5,
    comment:
      "Garmi aur humidity me meri skin bohot irritate hoti thi, ye Centella ampoule lagane se foran cooling aur soothing feel hota hai.",
    imageUrl: null,
    createdAt: "2026-10-10T18:00:00.000Z",
  },
  {
    id: "seed-rev-9",
    productSlug: "laneige-water-mask",
    productName: "Water Sleeping Mask EX",
    customerName: "Mariam Raza",
    city: "Karachi",
    rating: 5,
    comment:
      "Lightweight gel texture hai jo bilkul heavy nahi lagta. Dull aur tired skin ko overnight fresh bana deta hai.",
    imageUrl: null,
    createdAt: "2026-10-10T12:30:00.000Z",
  },
  {
    id: "seed-rev-10",
    productSlug: "simplist-glycolic-acid",
    productName: "Glycolic Acid 7% Toning Solution",
    customerName: "iqra Baig",
    city: "Gujranwala",
    rating: 5,
    comment:
      "Original product aur fast shipping! Dark elbows aur facial texture dono ke liye kamaal ka kaam karta hai.",
    imageUrl: null,
    createdAt: "2026-10-09T17:25:00.000Z",
  },
  {
    id: "seed-rev-11",
    productSlug: "arencia-vitamin-c",
    productName: "Vitamin C Booster Shot",
    customerName: "Momina Aslam",
    city: "Sialkot",
    rating: 5,
    comment:
      "Meri skin par koi irritation nahi hui aur dullness bilkul khatam ho gayi hai. Online payment par 10% discount bhi mila!",
    imageUrl: null,
    createdAt: "2026-10-09T11:15:00.000Z",
  },
  {
    id: "seed-rev-12",
    productSlug: "medicube-collagen-mask",
    productName: "Collagen Night Wrapping Mask",
    customerName: "Zoya Ahmed",
    city: "Islamabad",
    rating: 5,
    comment:
      "Shadi ke events se pehle use kiya tha, makeup itna smooth betha ke sab ne skin care routine poocha!",
    imageUrl: null,
    createdAt: "2026-10-08T19:50:00.000Z",
  },
  {
    id: "seed-rev-13",
    productSlug: "skin1004-centella",
    productName: "Madagascar Centella Ampoule",
    customerName: "Khadija Usman",
    city: "Bahawalpur",
    rating: 5,
    comment:
      "100% genuine Korean skincare store in Pakistan. Packing bohot secure thi aur bubble wrap me aya.",
    imageUrl: null,
    createdAt: "2026-10-08T14:10:00.000Z",
  },
  {
    id: "seed-rev-14",
    productSlug: "laneige-water-mask",
    productName: "Water Sleeping Mask EX",
    customerName: "Anوشے Farooq",
    city: "Hyderabad",
    rating: 5,
    comment:
      "Hydration level 10/10 hai! Bilkul original Laneige product hai aur fragrance bhi bohot mild aur relaxing hai.",
    imageUrl: null,
    createdAt: "2026-10-07T16:20:00.000Z",
  },
  {
    id: "seed-rev-15",
    productSlug: "simplist-glycolic-acid",
    productName: "Glycolic Acid 7% Toning Solution",
    customerName: "Laiba Ch",
    city: "Lahore",
    rating: 5,
    comment:
      "Whiteheads aur blackheads 2 weeks me bohot kam ho gaye hain. Definitely dobara order karungi!",
    imageUrl: null,
    createdAt: "2026-10-07T10:05:00.000Z",
  },
];

export async function getCustomerReviews(): Promise<CustomerReview[]> {
  const localLs = getStoredFallback<CustomerReview[]>(STORAGE_REVIEWS, []);
  const localIdb = (await idbGet<CustomerReview[]>(STORAGE_REVIEWS)) || [];

  let serverReviews: CustomerReview[] = [];
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/reviews?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { reviews?: CustomerReview[] };
        if (Array.isArray(data.reviews)) {
          serverReviews = data.reviews;
        }
      }
    } catch {
      // Ignore network fallback
    }
  }

  let cloudReviews: CustomerReview[] = [];
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: row } = await supabase
        .from("store_settings")
        .select("terms_conditions")
        .eq("id", CLOUD_REVIEWS_SETTINGS_ID)
        .maybeSingle();
      if (row?.terms_conditions) {
        const parsed = JSON.parse(row.terms_conditions);
        if (Array.isArray(parsed)) {
          cloudReviews = parsed;
        }
      }
    } catch {
      // Ignore if not present
    }
  }

  const mergedMap = new Map<string, CustomerReview>();
  for (const r of [
    ...serverReviews,
    ...cloudReviews,
    ...localIdb,
    ...localLs,
    ...SEED_CUSTOMER_REVIEWS,
  ]) {
    if (r && r.id && r.customerName && r.comment) {
      if (!mergedMap.has(r.id)) {
        mergedMap.set(r.id, r);
      }
    }
  }

  const all = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (typeof window !== "undefined" && all.length > SEED_CUSTOMER_REVIEWS.length) {
    const customOnly = all.filter((r) => !r.id.startsWith("seed-rev-"));
    setStoredFallback(STORAGE_REVIEWS, customOnly);
  }

  return all;
}

export async function postCustomerReview(input: {
  productSlug?: string;
  productName?: string;
  customerName: string;
  city: string;
  rating: number;
  comment: string;
  imageUrl?: string | null;
}): Promise<CustomerReview> {
  const newReview: CustomerReview = {
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productSlug: input.productSlug || "all",
    productName: input.productName || "KoreanSkinCare",
    customerName: input.customerName.trim(),
    city: input.city.trim(),
    rating: Math.min(5, Math.max(1, Number(input.rating) || 5)),
    comment: input.comment.trim(),
    imageUrl: input.imageUrl || null,
    createdAt: new Date().toISOString(),
  };

  // 1. Save immediately in browser IndexedDB + localStorage
  const existingLocal = [
    ...((await idbGet<CustomerReview[]>(STORAGE_REVIEWS)) || []),
    ...getStoredFallback<CustomerReview[]>(STORAGE_REVIEWS, []),
  ];
  const dedupedLocal = [
    newReview,
    ...existingLocal.filter((r) => r.id !== newReview.id && !r.id.startsWith("seed-rev-")),
  ].slice(0, 200);
  setStoredFallback(STORAGE_REVIEWS, dedupedLocal);

  // 2. Post to live server API (/api/reviews) so all visitors see it immediately
  if (typeof window !== "undefined") {
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReview),
      });
    } catch {
      // Local persistence already succeeded
    }
  }

  // 3. Also attempt Supabase store_settings sync if available
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from("store_settings").upsert({
        id: CLOUD_REVIEWS_SETTINGS_ID,
        store_name: "KoreanSkinCare Customer Reviews",
        currency: "PKR",
        terms_conditions: JSON.stringify(dedupedLocal),
        updated_at: newReview.createdAt,
      });
    } catch {
      // Ignore if anon RLS blocks store_settings write
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ksc-reviews-updated"));
  }

  return newReview;
}
