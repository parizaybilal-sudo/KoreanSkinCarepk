import { useState, useEffect, useId } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Menu,
  X,
  ShieldCheck,
  Truck,
  FlaskConical,
  BadgeCheck,
  Globe2,
  Droplets,
  Banknote,
  ShoppingBag,
  Search,
  Lock,
  Check,
  Star,
  MapPin,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Product, products as fallbackCatalog, formatPrice } from "@/lib/products";
import {
  resolveProductImageUrl,
  getCustomerReviews,
  postCustomerReview,
  type CustomerReview,
} from "@/lib/store-service";
import { useCart } from "@/lib/cart";

export const WHATSAPP_NUMBER_DISPLAY = "03144706515";
export const WHATSAPP_URL = "https://wa.me/923144706515";

export function WhatsAppLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `waSquircleGrad_${rawId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 640 640"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradId}
          x1="320"
          y1="0"
          x2="320"
          y2="640"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#5DF876" />
          <stop offset="50%" stopColor="#25D366" />
          <stop offset="100%" stopColor="#1DA851" />
        </linearGradient>
      </defs>
      <rect width="640" height="640" rx="148" fill="#25D366" />
      <rect width="640" height="640" rx="148" fill={`url(#${gradId})`} />
      <g transform="translate(96, 64)">
        <path
          fill="#FFFFFF"
          d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"
        />
      </g>
    </svg>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const { totalCount } = useCart();

  const handleSectionJump = (sectionId: string) => {
    setOpen(false);
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);
  };

  return (
    <div className="sticky top-0 z-40">
      <div className="bg-primary text-primary-foreground">
        <div className="text-center py-2.5 px-4 flex justify-between items-center max-w-[1408px] mx-auto">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 hover:underline text-[10px] tracking-[1px] font-medium"
          >
            <WhatsAppLogo size={15} /> WhatsApp: {WHATSAPP_NUMBER_DISPLAY}
          </a>
          <span className="mx-auto sm:mx-0 text-xs sm:text-sm font-bold tracking-[0.8px]">
            Pay Online & Enjoy 10% Off on All Products!
          </span>
          <Link
            to="/track"
            className="hidden sm:inline-flex items-center gap-1 hover:underline text-[9px] tracking-[1.4px]"
          >
            <Search size={10} /> Track Order
          </Link>
        </div>
      </div>

      <header className="site-header px-6 md:px-16 grid grid-cols-[1fr_auto_1fr] items-center bg-background/95 backdrop-blur-sm">
        <nav className="hidden md:flex items-center gap-6 text-[11px]">
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="hover:text-primary transition-colors"
          >
            Home
          </Link>
          <Link
            to="/"
            hash="collection"
            onClick={() => handleSectionJump("collection")}
            className="hover:text-primary transition-colors font-medium"
          >
            Shop All Products
          </Link>
          <Link
            to="/"
            hash="reviews"
            onClick={() => handleSectionJump("reviews")}
            className="hover:text-primary transition-colors"
          >
            Reviews
          </Link>
          <Link
            to="/track"
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            Track Order
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors inline-flex items-center gap-1.5 font-medium"
          >
            <WhatsAppLogo size={17} /> WhatsApp
          </a>
        </nav>

        <Button
          className="md:hidden justify-self-start"
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </Button>

        <Link to="/" className="brand col-start-2 text-center">
          KoreanSkinCare
        </Link>

        <div className="justify-self-end flex items-center gap-3">
          <Link
            to="/cart"
            className="relative p-2.5 rounded-full hover:bg-secondary transition-colors text-foreground flex items-center justify-center"
            aria-label={`Shopping Cart with ${totalCount} items`}
          >
            <ShoppingBag size={20} strokeWidth={1.5} />
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-in zoom-in">
                {totalCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {open && (
        <nav className="md:hidden border-b px-6 py-5 flex flex-col gap-4 text-sm bg-background shadow-md">
          <Link
            to="/"
            onClick={() => {
              setOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="hover:text-primary font-medium"
          >
            Home
          </Link>
          <Link
            to="/"
            hash="collection"
            onClick={() => handleSectionJump("collection")}
            className="hover:text-primary font-medium flex items-center justify-between"
          >
            <span>Shop All Products</span>
            <ArrowRight size={14} className="text-muted-foreground" />
          </Link>
          <Link
            to="/"
            hash="reviews"
            onClick={() => handleSectionJump("reviews")}
            className="hover:text-primary flex items-center gap-2"
          >
            <Star size={14} /> Customer Reviews
          </Link>
          <Link
            to="/track"
            onClick={() => setOpen(false)}
            className="hover:text-primary flex items-center gap-2"
          >
            <Search size={14} /> Track Order
          </Link>
          <Link
            to="/cart"
            onClick={() => setOpen(false)}
            className="hover:text-primary flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag size={14} /> Shopping Cart
            </span>
            {totalCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {totalCount}
              </span>
            )}
          </Link>
          <Link
            to="/checkout"
            onClick={() => setOpen(false)}
            className="hover:text-primary flex items-center gap-2"
          >
            <Truck size={14} /> Checkout
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="pt-3 border-t flex items-center gap-2.5 font-semibold text-foreground hover:text-primary"
          >
            <WhatsAppLogo size={22} />
            <span>WhatsApp: {WHATSAPP_NUMBER_DISPLAY}</span>
          </a>
        </nav>
      )}
    </div>
  );
}

export function ProductCard({
  product,
}: {
  product:
    | Product
    | {
        id?: string;
        slug: string;
        brand: string;
        name: string;
        type?: string;
        size?: string;
        image?: string;
        tag?: string | null;
        concern?: string | null;
        price?: number;
        wasPrice?: number;
        sale_price?: number;
        regular_price?: number;
        stock_quantity?: number;
        images?: Array<{ image_url: string; is_primary?: boolean }>;
      };
}) {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const slug = product.slug || "";
  const rawProduct = product as Record<string, unknown>;
  const productId =
    typeof rawProduct["id"] === "string" && rawProduct["id"] ? rawProduct["id"] : slug;
  const rawImages = rawProduct["images"] as
    Array<{ image_url: string; is_primary?: boolean }> | undefined;
  const candidateImage =
    "image" in product && typeof product.image === "string" && product.image
      ? product.image
      : rawImages?.find((i) => i.is_primary)?.image_url ||
        rawImages?.[0]?.image_url ||
        fallbackCatalog.find((f) => f.slug === slug)?.image ||
        "";
  const displayImage = resolveProductImageUrl(candidateImage, slug);
  const price =
    typeof rawProduct["price"] === "number"
      ? rawProduct["price"]
      : typeof rawProduct["sale_price"] === "number"
        ? rawProduct["sale_price"]
        : 0;
  const wasPrice =
    typeof rawProduct["wasPrice"] === "number"
      ? rawProduct["wasPrice"]
      : typeof rawProduct["regular_price"] === "number"
        ? rawProduct["regular_price"]
        : price;
  const discount = wasPrice > price && wasPrice > 0 ? Math.round((1 - price / wasPrice) * 100) : 0;
  const stockQuantity =
    typeof rawProduct["stock_quantity"] === "number" ? rawProduct["stock_quantity"] : undefined;

  const cartItemPayload = {
    productId,
    slug,
    name: product.name,
    brand: product.brand,
    image: displayImage,
    price,
    wasPrice,
    size: product.size || "Standard",
    type: product.type || "Skincare",
    stock: stockQuantity,
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(cartItemPayload, 1);
    if (typeof stockQuantity === "number" && stockQuantity <= 0) {
      void navigate({ to: "/cart" });
      return;
    }
    void navigate({ to: "/checkout" });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(cartItemPayload, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    void navigate({ to: "/cart" });
  };

  return (
    <div className="product-link flex flex-col min-w-0 group">
      <Link to="/products/$slug" params={{ slug }} className="block flex-1">
        <div className="product-image">
          <img
            src={displayImage}
            alt={`${product.brand} ${product.name}`}
            loading="lazy"
            onError={(e) => {
              const fbUrl = resolveProductImageUrl("", slug);
              if (fbUrl && e.currentTarget.src !== fbUrl) {
                e.currentTarget.src = fbUrl;
              }
            }}
            className="group-hover:scale-105 transition-transform duration-500"
          />
          {product.tag && <span className="product-label">{product.tag}</span>}
        </div>
        <div className="flex justify-between items-center mt-5">
          <span className="eyebrow text-muted-foreground">{product.brand}</span>
          <ArrowUpRight
            size={17}
            className="text-muted-foreground group-hover:text-foreground transition-colors"
          />
        </div>
        <h3 className="product-title mt-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <p className="text-[10px] text-muted-foreground mt-2">
          {product.type || "Skincare"} <span className="mx-1">·</span> {product.size || "Standard"}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mt-4">
          <span className="product-price">{formatPrice(price)}</span>
          <span className="product-price-was">{formatPrice(wasPrice)}</span>
          <span className="product-price-off">{discount}% OFF</span>
        </div>
        <div className="flex justify-between border-t mt-4 pt-3 text-[10px]">
          <span>{product.concern || "Skincare"}</span>
          <span className="text-primary font-medium">
            Discover <ArrowRight className="inline ml-1" size={12} />
          </span>
        </div>
      </Link>
      <div className="mt-3.5 flex flex-col gap-2">
        <Button
          type="button"
          onClick={handleBuyNow}
          size="sm"
          className="w-full text-[11px] font-semibold tracking-wide h-9"
        >
          <ShoppingBag size={13} className="mr-1.5" /> Buy Now
        </Button>
        <Button
          type="button"
          onClick={handleAddToCart}
          variant="outline"
          size="sm"
          className="w-full text-[11px] font-semibold tracking-wide h-9"
        >
          {added ? (
            <>
              <Check size={13} className="mr-1.5" /> Added to Cart!
            </>
          ) : (
            "Add to Cart"
          )}
        </Button>
      </div>
    </div>
  );
}

export function TrustStrip() {
  const entries = [
    { Icon: ShieldCheck, title: "100% Authentic", sub: "Direct Seoul Imports" },
    { Icon: Truck, title: "Cash On Delivery", sub: "Rs. 250 All Pakistan Cities" },
    { Icon: FlaskConical, title: "Pure Actives", sub: "Dermatologist Verified" },
    { Icon: BadgeCheck, title: "Batch-Verified", sub: "Fresh Factory Lots" },
  ];
  return (
    <div className="trust-strip">
      {entries.map(({ Icon, title, sub }) => (
        <div key={title} className="trust-item">
          <Icon />
          <div>
            <strong>{title}</strong>
            <span>{sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Difference() {
  const items = [
    {
      Icon: Globe2,
      title: "Seoul Direct Import",
      body: "Zero middlemen. Authentic Korean distribution chains ensure tamper-proof seals and full batch provenance on every bottle.",
    },
    {
      Icon: Droplets,
      title: "Glass Skin Efficacy",
      body: "Powered by Centella Asiatica, Vitamin C 200, Glycolic Acid, and Hydrolyzed Collagen for visible, glassy clarity.",
    },
    {
      Icon: Banknote,
      title: "Cash On Delivery",
      body: "Reliable doorstep payment nationwide. Flat Rs. 250 express courier shipping to Karachi, Lahore, Islamabad and all cities.",
    },
    {
      Icon: ShieldCheck,
      title: "Barrier-First Calibrated",
      body: "Gentle pH balances and soothing botanical extracts protect your moisture barrier against regional environmental stressors.",
    },
  ];
  return (
    <section id="difference" className="difference-primary px-6 md:px-16 py-14 md:py-20">
      <div className="max-w-[1408px] mx-auto">
        <h2 className="section-heading">
          The Hanbit <em>Difference</em>
        </h2>
        <p className="font-semibold text-sm md:text-base mt-5 max-w-xl leading-7">
          Uncompromising Standards for Your Skin
        </p>
        <p className="text-xs text-primary-foreground/70 mt-3 max-w-xl leading-7">
          Every formulation is hand-selected to deliver tangible, dermatological benefits without
          compromise.
        </p>
        <div className="difference-grid">
          {items.map(({ Icon, title, body }, i) => (
            <div key={title} className="difference-item">
              <Icon />
              <span>{`0${i + 1}`}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Quiz({
  open,
  onClose,
  availableProducts,
}: {
  open: boolean;
  onClose: () => void;
  availableProducts?: Product[];
}) {
  const [concern, setConcern] = useState("");
  if (!open) return null;

  const catalog = availableProducts || [];
  const match = catalog.find((p) => p.concern === concern);

  return (
    <div className="quiz-overlay" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Find your routine"
        className="quiz-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="eyebrow">Your personal edit</span>
          <Button variant="ghost" size="icon" aria-label="Close quiz" onClick={onClose}>
            <X />
          </Button>
        </div>
        <h2 className="section-heading mt-5">What does your skin need?</h2>
        <div className="grid grid-cols-2 gap-2 mt-6">
          {catalog.map((p) => (
            <Button
              key={p.concern || p.slug}
              variant={concern === p.concern ? "default" : "outline"}
              onClick={() => setConcern(p.concern || "")}
            >
              {p.concern || p.name}
            </Button>
          ))}
        </div>
        {match && (
          <div className="mt-7 border-t pt-5">
            <p className="eyebrow text-muted-foreground">Your ritual starts here</p>
            <h3 className="product-title my-3">{match.name}</h3>
            {(() => {
              const mObj = match as unknown as {
                price?: number;
                wasPrice?: number;
                sale_price?: number;
                regular_price?: number;
              };
              const mPrice = mObj.price ?? mObj.sale_price ?? 0;
              const mWasPrice = mObj.wasPrice ?? mObj.regular_price ?? mPrice;
              const mDiscount = mWasPrice > mPrice ? Math.round((1 - mPrice / mWasPrice) * 100) : 0;

              return (
                <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 my-3">
                  <span className="product-price">{formatPrice(mPrice)}</span>
                  <span className="product-price-was">{formatPrice(mWasPrice)}</span>
                  {mDiscount > 0 && <span className="product-price-off">{mDiscount}% OFF</span>}
                </p>
              );
            })()}
            <p className="text-xs leading-6 text-muted-foreground">{match.description}</p>
            <Button asChild className="mt-5">
              <Link to="/products/$slug" params={{ slug: match.slug }} onClick={onClose}>
                Explore your match <ArrowRight />
              </Link>
            </Button>
            <p className="text-[10px] text-muted-foreground mt-4">
              A skincare suggestion, not medical advice. Patch test before use.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export function Footer() {
  return (
    <>
      <footer className="footer-primary px-6 md:px-16 py-12 mt-16">
        <div className="max-w-[1408px] mx-auto">
          <div className="flex flex-col md:flex-row gap-8 justify-between">
            <div>
              <Link to="/" className="brand">
                KoreanSkinCare
              </Link>
              <p className="text-xs text-primary-foreground/70 mt-4 max-w-sm leading-relaxed">
                Thoughtfully curated Korean skincare essentials. Official direct Seoul imports
                delivered to every doorstep in Pakistan with Cash on Delivery.
              </p>
              <div className="mt-5">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <WhatsAppLogo size={24} />
                  <span>WhatsApp: {WHATSAPP_NUMBER_DISPLAY}</span>
                </a>
              </div>
            </div>
            <div className="flex flex-wrap gap-8 items-start text-xs">
              <div className="flex flex-col gap-2">
                <span className="eyebrow text-primary-foreground/50 mb-1">Navigation</span>
                <Link to="/" className="hover:underline">
                  Home
                </Link>
                <Link to="/" hash="collection" className="hover:underline">
                  Shop All Products
                </Link>
                <Link to="/" hash="reviews" className="hover:underline">
                  Customer Reviews
                </Link>
                <Link to="/cart" className="hover:underline">
                  View Cart
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="eyebrow text-primary-foreground/50 mb-1">Customer Care</span>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline inline-flex items-center gap-1.5 font-medium"
                >
                  <WhatsAppLogo size={16} /> WhatsApp: {WHATSAPP_NUMBER_DISPLAY}
                </a>
                <Link to="/track" className="hover:underline">
                  Track Order
                </Link>
                <span className="text-primary-foreground/70">Flat Rs. 250 Delivery</span>
                <span className="text-primary-foreground/70">Cash On Delivery</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="eyebrow text-primary-foreground/50 mb-1">Operations</span>
                <Link to="/admin" className="hover:underline flex items-center gap-1">
                  <Lock size={12} /> Admin Login
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-10 pt-6 flex flex-col sm:flex-row gap-3 justify-between text-[10px] text-primary-foreground/70">
            <span>© 2026 KoreanSkinCare. All rights reserved.</span>
            <span>From Seoul, with care. Cash On Delivery Pakistan.</span>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button on all store pages */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chat with us on WhatsApp (${WHATSAPP_NUMBER_DISPLAY})`}
        title={`Chat on WhatsApp: ${WHATSAPP_NUMBER_DISPLAY}`}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center justify-center rounded-[16px] shadow-lg hover:scale-105 active:scale-95 transition-transform duration-200"
      >
        <WhatsAppLogo size={56} />
      </a>
    </>
  );
}

const REVIEWS_PER_PAGE = 5;

export function CustomerReviewsSection({
  productSlug,
  productName,
}: {
  productSlug?: string;
  productName?: string;
}) {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [city, setCity] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [selectedProductSlug, setSelectedProductSlug] = useState(
    productSlug || fallbackCatalog[0]?.slug || "arencia-vitamin-c",
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (productSlug) {
      setSelectedProductSlug(productSlug);
    }
  }, [productSlug]);

  useEffect(() => {
    let active = true;
    const loadReviews = async () => {
      try {
        const list = await getCustomerReviews();
        if (active) {
          setReviews(list);
        }
      } catch {
        // Keep current list
      }
    };

    void loadReviews();

    const handleUpdated = () => void loadReviews();
    window.addEventListener("ksc-reviews-updated", handleUpdated);
    window.addEventListener("focus", handleUpdated);
    return () => {
      active = false;
      window.removeEventListener("ksc-reviews-updated", handleUpdated);
      window.removeEventListener("focus", handleUpdated);
    };
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!customerName.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }
    if (!city.trim()) {
      setErrorMsg("Please enter your city.");
      return;
    }
    if (!comment.trim()) {
      setErrorMsg("Please write your review.");
      return;
    }

    setSubmitting(true);
    try {
      const matchedCatalogProduct = fallbackCatalog.find((p) => p.slug === selectedProductSlug);
      const resolvedProductName = productName || matchedCatalogProduct?.name || "KoreanSkinCare";
      const resolvedProductSlug = productSlug || selectedProductSlug || "all";

      const created = await postCustomerReview({
        productSlug: resolvedProductSlug,
        productName: resolvedProductName,
        customerName: customerName.trim(),
        city: city.trim(),
        rating,
        comment: comment.trim(),
        imageUrl: null,
      });

      setReviews((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
      setCurrentPage(0);
      setCustomerName("");
      setCity("");
      setRating(5);
      setComment("");
      setSuccessMsg("Your review has been posted live! Thank you for sharing your experience.");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch {
      setErrorMsg("Could not post review right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const [showVerifyDetails, setShowVerifyDetails] = useState(false);

  const totalPages = Math.max(1, Math.ceil(reviews.length / REVIEWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages - 1);
  const startIndex = safePage * REVIEWS_PER_PAGE;
  const visibleReviews = reviews.slice(startIndex, startIndex + REVIEWS_PER_PAGE);
  const hasPrevious = safePage > 0;
  const hasMore = startIndex + REVIEWS_PER_PAGE < reviews.length;

  return (
    <section className="max-w-[1408px] mx-auto px-6 md:px-16 py-16 border-t">
      {/* Our Unbending Guarantee Card (Above Reviews in Website Theme Colors) */}
      <div className="mb-14 max-w-xl mx-auto rounded-[28px] bg-primary text-primary-foreground px-7 py-9 sm:px-10 sm:py-11 shadow-md">
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-accent">
          OUR UNBENDING GUARANTEE
        </p>

        <h2 className="font-serif text-3xl sm:text-4xl font-semibold leading-[1.18] tracking-tight text-primary-foreground mt-4">
          100% Authentic Korean Provenance
        </h2>

        <p className="mt-5 text-sm sm:text-[15px] leading-[1.7] text-primary-foreground/90 font-normal">
          We maintain direct partnerships with authorized manufacturers in Seoul, South Korea. We
          reject counterfeiters and unverified third parties. Every unit shipped to you is sealed,
          fresh, climate-preserved, and backed by our unconditional 100% money-back authenticity
          guarantee.
        </p>

        <div className="mt-7 space-y-4">
          <div className="flex items-center gap-3.5">
            <ShieldCheck className="w-5 h-5 text-accent shrink-0" strokeWidth={1.8} />
            <span className="text-sm sm:text-[15px] font-medium text-primary-foreground">
              Original Tamper Seals
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <Award className="w-5 h-5 text-accent shrink-0" strokeWidth={1.8} />
            <span className="text-sm sm:text-[15px] font-medium text-primary-foreground">
              Verifiable Batch Codes
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <Truck className="w-5 h-5 text-accent shrink-0" strokeWidth={1.8} />
            <span className="text-sm sm:text-[15px] font-medium text-primary-foreground">
              Climate-Controlled Hub
            </span>
          </div>
        </div>

        <div className="mt-9 flex justify-center">
          <button
            type="button"
            onClick={() => setShowVerifyDetails((prev) => !prev)}
            className="inline-flex items-center justify-center gap-2.5 rounded-full bg-accent text-foreground hover:bg-accent/90 transition-colors px-8 py-4 text-sm sm:text-[15px] font-semibold shadow-xs cursor-pointer"
          >
            <span>Learn How We Verify</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {showVerifyDetails && (
          <div className="mt-6 pt-5 border-t border-primary-foreground/20 text-xs leading-relaxed text-primary-foreground/90 space-y-2">
            <p>
              <strong className="text-accent">1. Direct Seoul Sourcing:</strong> Every batch is
              imported directly from authorized Korean brand distributors with official export
              documentation.
            </p>
            <p>
              <strong className="text-accent">2. Batch & Expiry Lot Check:</strong> Customers can
              verify the LOT/Batch code printed on the box and bottle upon delivery.
            </p>
            <p>
              <strong className="text-accent">3. Factory Tamper Seal:</strong> Every unit arrives
              with its original Korean factory safety seal intact and temperature-protected.
            </p>
          </div>
        )}
      </div>

      <div id="reviews" className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start scroll-mt-24">
        {/* Left Column: Customer Reviews List (5 at a time) */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <p className="eyebrow text-muted-foreground mb-2">REAL CUSTOMER EXPERIENCES</p>
            <h2 className="section-heading">
              Customer <em>Reviews</em>
            </h2>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={15} className="fill-amber-500 text-amber-500" />
                ))}
              </div>
              <span className="text-xs font-semibold">4.9 / 5.0</span>
              <span className="text-xs text-muted-foreground">
                · Based on {reviews.length} verified reviews across Pakistan
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {visibleReviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-card border rounded-lg p-5 flex flex-col justify-between gap-4 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={13}
                          className={
                            star <= (rev.rating || 5)
                              ? "fill-amber-500 text-amber-500"
                              : "text-muted-foreground/30"
                          }
                        />
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded font-medium">
                      <CheckCircle2 size={10} /> Verified
                    </span>
                  </div>

                  {rev.productName && (
                    <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mt-2.5">
                      {rev.productName}
                    </p>
                  )}

                  <p className="text-xs leading-6 text-foreground/90 mt-2 whitespace-pre-line">
                    “{rev.comment}”
                  </p>
                </div>

                <div className="pt-3 border-t flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-foreground">{rev.customerName}</span>
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    <MapPin size={11} className="text-primary" /> {rev.city}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Previous & View More Controls (5 Reviews Per Page) */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t">
            <Button
              type="button"
              variant="outline"
              disabled={!hasPrevious}
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              className="font-semibold text-xs px-5 py-5"
            >
              <ChevronLeft size={15} className="mr-1" /> Previous
            </Button>

            <span className="text-xs text-muted-foreground font-medium">
              {reviews.length > 0
                ? `${startIndex + 1}–${Math.min(startIndex + REVIEWS_PER_PAGE, reviews.length)} of ${reviews.length} Reviews`
                : "0 Reviews"}
            </span>

            <Button
              type="button"
              disabled={!hasMore}
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              className="font-semibold text-xs px-5 py-5"
            >
              View More <ChevronRight size={15} className="ml-1" />
            </Button>
          </div>
        </div>

        {/* Right Column: Post a Live Review Form */}
        <div className="lg:col-span-5 bg-secondary/40 border rounded-xl p-6 md:p-8">
          <p className="eyebrow text-primary mb-1">SHARE YOUR RITUAL</p>
          <h3 className="font-serif text-2xl font-normal">Post a Review</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-6">
            Share your experience with customers across Pakistan.
          </p>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 size={15} className="flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ayesha Khan"
                  className="w-full h-10 px-3 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Lahore, Karachi"
                  className="w-full h-10 px-3 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {!productSlug && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                  Product
                </label>
                <select
                  value={selectedProductSlug}
                  onChange={(e) => setSelectedProductSlug(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {fallbackCatalog.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.brand} — {item.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                Rating
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 rounded hover:bg-secondary transition-colors"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      size={20}
                      className={
                        star <= rating
                          ? "fill-amber-500 text-amber-500"
                          : "text-muted-foreground/40"
                      }
                    />
                  </button>
                ))}
                <span className="text-xs text-muted-foreground ml-2">{rating} / 5 Stars</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                Write Your Review *
              </label>
              <textarea
                required
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write your review here..."
                className="w-full p-3 rounded-md border bg-background text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              size="lg"
              className="w-full font-semibold text-xs py-6"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" /> Posting Live Review...
                </>
              ) : (
                "Post Live Review"
              )}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
