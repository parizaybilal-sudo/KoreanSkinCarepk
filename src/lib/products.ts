import arencia from "@/assets/arencia.asset.json";
import medicube from "@/assets/medicube.asset.json";
import centella from "@/assets/centella.asset.json";
import simplist from "@/assets/simplist.asset.json";
import laneige from "@/assets/laneige.asset.json";

const SUPABASE_MEDIA_BASE =
  "https://whyzbmsyihcbitpfkces.supabase.co/storage/v1/object/public/product-media";

const resolveAssetUrl = (assetUrl: string | undefined, fallbackFile: string): string => {
  if (!assetUrl || assetUrl.startsWith("/__l5e/")) {
    return `${SUPABASE_MEDIA_BASE}/products/${fallbackFile}`;
  }
  return assetUrl;
};

export const products = [
  {
    slug: "arencia-vitamin-c",
    brand: "Arencia",
    name: "Vitamin C Booster Shot",
    type: "Face & eye cream",
    size: "30 ml",
    image: resolveAssetUrl(arencia.url, "1791959369045-wicadg.png"),
    tag: "The glow essential",
    concern: "Radiance",
    price: 1999,
    wasPrice: 2850,
    description:
      "A face and eye cream moisturizer with Vitamin C Complex (5%) and glutathione. A targeted addition to a radiance-focused skincare ritual.",
    ingredients: ["Vitamin C Complex (5%)", "Glutathione"],
    use: "Apply a small amount to clean skin, following the directions on your product packaging. Use sunscreen during the day.",
  },
  {
    slug: "medicube-collagen-mask",
    brand: "medicube",
    name: "Collagen Night Wrapping Mask",
    type: "Overnight mask",
    size: "75 ml",
    image: resolveAssetUrl(medicube.url, "1791959583980-szobvk.png"),
    tag: "The overnight ritual",
    concern: "Firmness",
    price: 2299,
    wasPrice: 3300,
    description:
      "An overnight wrapping mask with collagen extract, niacinamide and Ceramide NP. Designed to help skin feel moisturized, smooth and firm overnight.",
    ingredients: ["Collagen extract", "Niacinamide", "Ceramide NP"],
    use: "Use as the final step of your evening routine. Follow the packaging instructions for application, drying time and removal.",
  },
  {
    slug: "skin1004-centella",
    brand: "SKIN1004",
    name: "Madagascar Centella Ampoule",
    type: "Soothing ampoule",
    size: "100 ml",
    image: resolveAssetUrl(centella.url, "1791959678180-imdqzd.png"),
    tag: "The barrier favourite",
    concern: "Soothing",
    price: 2199,
    wasPrice: 3150,
    description:
      "An ampoule made with pure Centella from Madagascar. A simple, soothing step for a gentle daily skincare routine.",
    ingredients: ["Centella asiatica extract"],
    use: "Apply a few drops to cleansed skin and gently pat in. Follow with moisturizer and daytime sunscreen.",
  },
  {
    slug: "simplist-glycolic-toner",
    brand: "Simplist",
    name: "Glycolic Acid 07% Toner",
    type: "Exfoliating toner",
    size: "100 ml",
    image: resolveAssetUrl(simplist.url, "1791959732187-egs1lo.png"),
    tag: "The texture reset",
    concern: "Texture",
    price: 2099,
    wasPrice: 3000,
    description:
      "A fragrance-free exfoliating toner with 7% glycolic acid, hyaluronic acid and ginseng extract. Formulated to exfoliate and improve the appearance of skin texture.",
    ingredients: ["Glycolic acid (7%)", "Hyaluronic acid", "Ginseng extract"],
    use: "Follow the packaging instructions and introduce gradually in your evening routine. Avoid the eye area and use sunscreen daily. Do not apply to irritated skin.",
  },
  {
    slug: "laneige-water-mask",
    brand: "LANEIGE",
    name: "Water Sleeping Mask EX",
    type: "Hydrating sleeping mask",
    size: "70 ml",
    image: resolveAssetUrl(laneige.url, "1791959794299-bpbcln.png"),
    tag: "The hydration edit",
    concern: "Hydration",
    price: 2499,
    wasPrice: 3550,
    description:
      "An overnight hydration mask featuring Sleeping Microbiome™. A replenishing final step for skin that feels soft, hydrated and refreshed.",
    ingredients: ["Sleeping Microbiome™"],
    use: "Apply as the final step of your evening skincare routine, following the product packaging. Rinse off in the morning.",
  },
];
export type Product = (typeof products)[number] & {
  id?: string;
  stock_quantity?: number;
};

export const formatPrice = (value: unknown): string => {
  if (value === undefined || value === null || value === "") return "Rs. 0";
  const num = typeof value === "number" ? value : Number(value);
  if (typeof num !== "number" || isNaN(num) || !isFinite(num)) return "Rs. 0";
  try {
    return `Rs. ${num.toLocaleString("en-US")}`;
  } catch {
    return `Rs. ${num}`;
  }
};

export const discountPercent = (
  product?: {
    price?: number;
    wasPrice?: number;
    sale_price?: number;
    regular_price?: number;
  } | null,
): number => {
  if (!product) return 0;
  const price = product.price ?? product.sale_price ?? 0;
  const wasPrice = product.wasPrice ?? product.regular_price ?? price;
  if (!wasPrice || wasPrice <= price) return 0;
  return Math.round((1 - price / wasPrice) * 100);
};
