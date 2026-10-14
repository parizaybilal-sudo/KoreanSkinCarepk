import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Plus,
  Minus,
  ShoppingBag,
  Check,
  Truck,
  Play,
  Film,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  formatPrice,
  discountPercent,
  products as fallbackCatalog,
  type Product,
} from "@/lib/products";
import {
  Header,
  Footer,
  ProductCard,
  CustomerReviewsSection,
  WhatsAppLogo,
  WHATSAPP_URL,
  WHATSAPP_NUMBER_DISPLAY,
} from "@/components/store";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import {
  getProductBySlug,
  getProducts,
  resolveProductImageUrl,
  SLUG_TO_UPLOADED_GALLERY,
  SLUG_TO_UPLOADED_VIDEOS,
} from "@/lib/store-service";
import type { DBProduct } from "@/lib/supabase";

type ProductPageData = DBProduct & {
  relatedCatalog?: Product[];
};

function mapRelatedCatalog(allProducts: DBProduct[]): Product[] {
  if (!allProducts || allProducts.length === 0) return fallbackCatalog;
  return allProducts.map((item) => {
    const fb = fallbackCatalog.find((s) => s.slug === item.slug);
    const rawImg =
      item.images?.find((img) => img.is_primary)?.image_url ||
      item.images?.[0]?.image_url ||
      fb?.image ||
      "";
    return {
      id: item.id,
      slug: item.slug,
      brand: item.brand,
      name: item.name,
      type: item.type,
      size: item.size,
      image: resolveProductImageUrl(rawImg, item.slug),
      tag: item.tag || fb?.tag || "Seoul Essential",
      concern: item.concern || fb?.concern || "Hydration",
      price: item.sale_price,
      wasPrice: item.regular_price,
      stock_quantity: item.stock_quantity,
      description: item.short_description || item.full_description || fb?.description || "",
      ingredients: fb?.ingredients || [item.concern || "Pure Actives"],
      use: fb?.use || "Apply daily onto clean skin.",
    };
  });
}

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ params }): Promise<ProductPageData> => {
    const [product, allProducts] = await Promise.all([
      getProductBySlug(params.slug),
      getProducts(true).catch(() => []),
    ]);

    const relatedCatalog = mapRelatedCatalog(allProducts);

    if (!product) {
      const fallback = fallbackCatalog.find((p) => p.slug === params.slug);
      if (!fallback) throw notFound();
      const galleryUrls = SLUG_TO_UPLOADED_GALLERY[fallback.slug] || [
        resolveProductImageUrl(fallback.image, fallback.slug),
      ];
      return {
        id: `prod-${fallback.slug}`,
        slug: fallback.slug,
        name: fallback.name,
        brand: fallback.brand,
        type: fallback.type,
        size: fallback.size,
        regular_price: fallback.wasPrice,
        sale_price: fallback.price,
        stock_quantity: 45,
        tag: fallback.tag,
        concern: fallback.concern,
        short_description: fallback.description,
        full_description: fallback.description,
        is_published: true,
        is_featured: true,
        images: galleryUrls.map((url, idx) => ({
          id: `${idx + 1}`,
          product_id: `prod-${fallback.slug}`,
          image_url: url,
          is_primary: idx === 0,
          display_order: idx,
        })),
        videos: (SLUG_TO_UPLOADED_VIDEOS[fallback.slug] || []).map((v, idx) => ({
          id: `vid-${fallback.slug}-${idx + 1}`,
          product_id: `prod-${fallback.slug}`,
          video_url: v.video_url,
          thumbnail_url: null,
          title: v.title,
          display_order: idx,
        })),
        sections: [
          {
            id: "s1",
            product_id: "1",
            title: "Highlighted ingredients",
            content: fallback.ingredients.join(" · "),
            section_type: "ingredients",
            display_order: 1,
          },
          {
            id: "s2",
            product_id: "1",
            title: "How to use",
            content: fallback.use,
            section_type: "usage",
            display_order: 2,
          },
          {
            id: "s3",
            product_id: "1",
            title: "Before you begin",
            content: "Patch test before first use. Stop use if irritation occurs.",
            section_type: "precautions",
            display_order: 3,
          },
        ],
        relatedCatalog,
      } as ProductPageData;
    }
    return {
      ...product,
      relatedCatalog,
    };
  },
  head: ({ loaderData: p }) => ({
    meta: [
      {
        title: p
          ? `${p.name} by ${p.brand} | KoreanSkinCare`
          : "Product unavailable | KoreanSkinCare",
      },
      {
        name: "description",
        content:
          p?.short_description ||
          p?.full_description ||
          "Explore the KoreanSkinCare curated collection.",
      },
      { property: "og:title", content: p ? `${p.name} | KoreanSkinCare` : "KoreanSkinCare" },
      { property: "og:description", content: p?.short_description || "The Seoul Edit" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const loaderData = Route.useLoaderData();
  const [p, setP] = useState<ProductPageData>(loaderData);
  const { addItem } = useCart();
  const navigate = useNavigate();

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [openSectionId, setOpenSectionId] = useState<string>("sec-0");

  useEffect(() => {
    setP(loaderData);
    setActiveImageIdx(0);
    setQuantity(1);
    setAdded(false);
  }, [loaderData]);

  // Client-side sync so any product pictures/videos set in Admin Panel always display on initial hydration & tab focus
  useEffect(() => {
    let active = true;
    const refreshClientProduct = async () => {
      try {
        const [freshProd, freshAll] = await Promise.all([
          getProductBySlug(loaderData.slug),
          getProducts(true).catch(() => []),
        ]);
        if (active && freshProd) {
          setP({
            ...freshProd,
            relatedCatalog: mapRelatedCatalog(freshAll),
          });
        }
      } catch {
        // Keep current product state
      }
    };

    void refreshClientProduct();

    const handleFocus = () => void refreshClientProduct();
    const handleStorage = () => void refreshClientProduct();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, [loaderData.slug]);

  const fallbackImg = resolveProductImageUrl(
    fallbackCatalog.find((s) => s.slug === p.slug)?.image,
    p.slug,
  );
  const imagesList =
    p.images && p.images.length > 0
      ? p.images.map((img) => ({
          ...img,
          image_url: resolveProductImageUrl(img.image_url, p.slug),
        }))
      : [{ id: "def", image_url: fallbackImg, is_primary: true, display_order: 0 }];

  const currentImage = resolveProductImageUrl(
    imagesList[activeImageIdx]?.image_url || imagesList[0]?.image_url || fallbackImg,
    p.slug,
  );

  const salePrice = p.sale_price ?? (p as unknown as { price?: number }).price ?? 0;
  const regularPrice =
    p.regular_price ?? (p as unknown as { wasPrice?: number }).wasPrice ?? salePrice;
  const discount = regularPrice > salePrice ? Math.round((1 - salePrice / regularPrice) * 100) : 0;
  const isOutOfStock = (p.stock_quantity ?? 50) <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem(
      {
        productId: p.id,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        image: currentImage,
        price: salePrice,
        wasPrice: regularPrice,
        size: p.size,
        type: p.type,
      },
      quantity,
    );

    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addItem(
      {
        productId: p.id,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        image: currentImage,
        price: salePrice,
        wasPrice: regularPrice,
        size: p.size,
        type: p.type,
      },
      quantity,
    );
    void navigate({ to: "/checkout" });
  };

  const sections =
    p.sections && p.sections.length > 0
      ? p.sections
      : [
          {
            id: "sec-0",
            title: "Highlighted ingredients",
            content: "Centella Asiatica, Hyaluronic Acid, Vitamin C",
          },
          {
            id: "sec-1",
            title: "How to use",
            content: "Apply onto cleansed skin every morning and evening.",
          },
          {
            id: "sec-2",
            title: "Before you begin",
            content: "Patch test before first use. Discontinue if redness occurs.",
          },
        ];

  return (
    <>
      <Header />
      <main className="max-w-[1280px] mx-auto px-6 md:px-16 py-8">
        <Link
          to="/"
          hash="collection"
          className="inline-flex gap-2 items-center text-[10px] text-muted-foreground my-6 hover:text-foreground transition-colors"
        >
          <ArrowLeft size={13} /> Back to The Curated Five
        </Link>

        {/* Product Hero Info */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-start">
          {/* Gallery Column */}
          <div className="space-y-4">
            <div className="detail-image overflow-hidden rounded-lg bg-card border relative">
              <img
                src={currentImage}
                alt={`${p.brand} ${p.name}`}
                onError={(e) => {
                  if (fallbackImg && e.currentTarget.src !== fallbackImg) {
                    e.currentTarget.src = fallbackImg;
                  }
                }}
                className="w-full h-full object-contain p-4"
              />
              {p.tag && <span className="product-label absolute top-4 left-4 z-10">{p.tag}</span>}
            </div>

            {/* Thumbnails */}
            {imagesList.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {imagesList.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`w-16 h-20 rounded border bg-card flex-shrink-0 overflow-hidden transition-all ${
                      activeImageIdx === idx
                        ? "ring-2 ring-primary border-primary"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt=""
                      onError={(e) => {
                        if (fallbackImg && e.currentTarget.src !== fallbackImg) {
                          e.currentTarget.src = fallbackImg;
                        }
                      }}
                      className="w-full h-full object-contain p-1"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="md:pt-4">
            <p className="eyebrow text-muted-foreground">
              {p.brand} {p.tag ? `· ${p.tag}` : ""}
            </p>
            <h1 className="section-heading mt-3">{p.name}</h1>
            <p className="text-xs text-muted-foreground mt-2">
              {p.type} · {p.size}
            </p>

            {/* Price & Discounts */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 my-5">
              <span className="product-price product-price-lg">{formatPrice(salePrice)}</span>
              <span className="product-price-was">{formatPrice(regularPrice)}</span>
              <span className="product-price-off">{discount}% OFF</span>
            </div>

            {/* Badges / Concerns */}
            <div className="flex flex-wrap gap-2 my-5">
              {p.concern && (
                <span className="bg-secondary text-xs px-3 py-1.5 rounded">{p.concern}</span>
              )}
              <span className="bg-secondary text-xs px-3 py-1.5 rounded">{p.size}</span>
              <span
                className={`text-xs px-3 py-1.5 rounded font-medium ${
                  isOutOfStock
                    ? "bg-red-100 text-red-800"
                    : p.stock_quantity <= 10
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {isOutOfStock
                  ? "Out of Stock"
                  : p.stock_quantity <= 10
                    ? `Low Stock: Only ${p.stock_quantity} left`
                    : "In Stock (Direct Seoul Import)"}
              </span>
            </div>

            <p className="text-sm leading-7 text-muted-foreground">
              {p.short_description || p.full_description}
            </p>

            {/* Add to Cart Actions */}
            <div className="my-8 p-5 bg-secondary/30 rounded-lg border space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold uppercase tracking-wider">Quantity:</span>
                <div className="flex items-center border rounded-md bg-background">
                  <button
                    disabled={quantity <= 1 || isOutOfStock}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2.5 hover:bg-secondary disabled:opacity-40 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="px-4 text-xs font-semibold min-w-[2.5rem] text-center">
                    {quantity}
                  </span>
                  <button
                    disabled={quantity >= p.stock_quantity || isOutOfStock}
                    onClick={() => setQuantity((q) => Math.min(p.stock_quantity, q + 1))}
                    className="p-2.5 hover:bg-secondary disabled:opacity-40 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="text-xs text-muted-foreground ml-auto">
                  Subtotal:{" "}
                  <strong className="text-foreground">{formatPrice(salePrice * quantity)}</strong>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  size="lg"
                  className="flex-1 font-semibold text-xs tracking-wide py-6"
                >
                  {isOutOfStock ? (
                    "Currently Out of Stock"
                  ) : (
                    <>
                      <ShoppingBag className="mr-2" size={18} /> Buy Now ·{" "}
                      {formatPrice(salePrice * quantity)}
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  variant="outline"
                  size="lg"
                  className="py-6 text-xs font-semibold"
                >
                  {added ? (
                    <>
                      <Check className="mr-1.5" size={16} /> Added to Cart!
                    </>
                  ) : (
                    "Add to Cart"
                  )}
                </Button>
              </div>

              <a
                href={`${WHATSAPP_URL}?text=${encodeURIComponent(`Hi! I want to inquire about ${p.brand} - ${p.name} (${formatPrice(salePrice)}).`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-md border bg-background hover:bg-secondary/60 transition-colors py-3 px-4 text-xs font-semibold text-foreground"
              >
                <WhatsAppLogo size={20} />
                <span>Chat / Order on WhatsApp ({WHATSAPP_NUMBER_DISPLAY})</span>
              </a>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                <Truck size={14} className="text-primary flex-shrink-0" />
                <span>Cash on Delivery available nationwide · Flat Rs. 250 shipping</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 py-4 border-t text-xs text-foreground/90">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={17} strokeWidth={1.75} className="text-primary flex-shrink-0" />
                <span>100% Authentic Korean</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Truck size={17} strokeWidth={1.75} className="text-primary flex-shrink-0" />
                <span>Doorstep Cash on Delivery</span>
              </div>
              <div className="flex items-center gap-2.5">
                <RotateCcw size={17} strokeWidth={1.75} className="text-primary flex-shrink-0" />
                <span>7-Day Easy Exchange</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Sparkles size={17} strokeWidth={1.75} className="text-primary flex-shrink-0" />
                <span>Free Delivery Over Rs. 3,000</span>
              </div>
            </div>

            <div className="border-y py-4 my-4 flex items-center gap-3 text-xs">
              <ShieldCheck size={20} strokeWidth={1.3} className="text-primary" />
              <div>
                <span className="block font-medium">A considered addition to your ritual</span>
                <span className="text-muted-foreground text-[10px]">
                  Tamper-proof batch seal. 100% genuine formulation.
                </span>
              </div>
            </div>

            {/* Accordion Sections */}
            <div className="divide-y border-b">
              {sections.map((s, idx) => {
                const secId = s.id || `sec-${idx}`;
                const isOpen = openSectionId === secId;
                return (
                  <div key={secId}>
                    <Button
                      variant="ghost"
                      className="w-full justify-between h-12 px-0 text-xs font-medium hover:bg-transparent"
                      aria-expanded={isOpen}
                      onClick={() => setOpenSectionId(isOpen ? "" : secId)}
                    >
                      {s.title}
                      {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                    </Button>
                    {isOpen && (
                      <p className="text-xs leading-6 text-muted-foreground pb-5 whitespace-pre-line">
                        {s.content}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* DEDICATED PRODUCT VIDEOS SECTION */}
        {p.videos && p.videos.length > 0 && (
          <section className="mt-20 pt-10 border-t">
            <div className="mb-8">
              <span className="eyebrow text-muted-foreground flex items-center gap-2">
                <Film size={14} className="text-primary" /> VISUAL RITUAL DEMONSTRATIONS
              </span>
              <h2 className="section-heading mt-2">
                Product <em>Videos</em>
              </h2>
              <p className="text-xs text-muted-foreground mt-2 max-w-xl">
                Watch texture application, layering guidance, and authentic Seoul skincare
                techniques for {p.name}.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {p.videos.map((vid, i) => (
                <div
                  key={vid.id || i}
                  className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col"
                >
                  <div className="relative bg-black flex items-center justify-center">
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full max-h-[540px] object-contain"
                    >
                      <source
                        src={
                          vid.video_url.startsWith("data:") || vid.video_url.includes("#t=")
                            ? vid.video_url
                            : `${vid.video_url}#t=0.001`
                        }
                        type="video/mp4"
                      />
                      <source src={vid.video_url} type="video/webm" />
                      Your browser does not support HTML5 video playback.
                    </video>
                  </div>
                  <div className="p-4 bg-secondary/20 flex items-center justify-between mt-auto">
                    <div>
                      <h3 className="font-serif text-sm font-semibold">{vid.title}</h3>
                      <span className="text-[10px] text-muted-foreground">
                        Demonstration #{i + 1} · {p.brand}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Products Section */}
        <section className="mt-24 pt-10 border-t">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <div>
              <p className="eyebrow text-muted-foreground mb-3">THE REST OF YOUR RITUAL</p>
              <h2 className="section-heading">
                Beautiful <em>together.</em>
              </h2>
            </div>
            <Button variant="link" asChild className="hidden sm:inline-flex text-xs">
              <Link to="/" hash="collection">
                Explore all essentials <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 md:gap-x-7 gap-y-9 mt-8">
            {(p.relatedCatalog || fallbackCatalog)
              .filter((item) => item.slug !== p.slug)
              .slice(0, 4)
              .map((item) => (
                <ProductCard key={item.slug} product={item} />
              ))}
          </div>
        </section>
      </main>
      <CustomerReviewsSection productSlug={p.slug} productName={p.name} />
      <Footer />
    </>
  );
}
