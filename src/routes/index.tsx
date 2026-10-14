import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Sparkles, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Header,
  Footer,
  ProductCard,
  TrustStrip,
  Quiz,
  Difference,
  CustomerReviewsSection,
} from "@/components/store";
import { products as staticCatalog } from "@/lib/products";
import { getProducts, isSupabaseTablesReady, resolveProductImageUrl } from "@/lib/store-service";
import { isSupabaseConfigured, type DBProduct } from "@/lib/supabase";
import heroVideo from "@/assets/hero-video.mp4";
import arenciaVideo from "@/assets/arencia-video.mp4";

export interface LoaderResult {
  catalog: CatalogItem[];
  isLiveFromDb: boolean;
}

function mapProductsToCatalog(dynamicProducts: DBProduct[]): CatalogItem[] {
  return dynamicProducts.map((p) => {
    const fallback = staticCatalog.find((s) => s.slug === p.slug);
    const rawImg =
      p.images?.find((img) => img.is_primary)?.image_url ||
      p.images?.[0]?.image_url ||
      fallback?.image ||
      "";
    return {
      id: p.id,
      slug: p.slug,
      brand: p.brand,
      name: p.name,
      type: p.type,
      size: p.size,
      image: resolveProductImageUrl(rawImg, p.slug),
      tag: p.tag || fallback?.tag || "Seoul Essential",
      concern: p.concern || fallback?.concern || "Hydration",
      price: p.sale_price,
      wasPrice: p.regular_price,
      stock_quantity: p.stock_quantity,
      description: p.short_description || p.full_description || fallback?.description || "",
      ingredients: fallback?.ingredients || [p.concern || "Pure Actives"],
      use: fallback?.use || "Apply daily onto clean skin.",
    };
  });
}

export const Route = createFileRoute("/")({
  loader: async (): Promise<LoaderResult> => {
    try {
      const dynamicProducts = await getProducts(true);
      if (dynamicProducts && dynamicProducts.length > 0) {
        return {
          catalog: mapProductsToCatalog(dynamicProducts),
          isLiveFromDb: isSupabaseTablesReady() || isSupabaseConfigured(),
        };
      }
    } catch (err) {
      console.warn("Loader products fetch warning:", err);
    }
    return {
      catalog: staticCatalog,
      isLiveFromDb: false,
    };
  },
  head: () => ({
    meta: [
      { title: "KoreanSkinCare — The Seoul Edit" },
      {
        name: "description",
        content:
          "Discover the curated five: Korean skincare, daily rituals and the essence of glass skin, from Seoul to Pakistan.",
      },
      { property: "og:title", content: "KoreanSkinCare — The Seoul Edit" },
      {
        property: "og:description",
        content: "Five considered skincare essentials. Explore your Korean skincare ritual.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

interface CatalogItem {
  id?: string;
  slug: string;
  brand: string;
  name: string;
  type: string;
  size: string;
  image: string;
  tag: string;
  concern: string;
  price: number;
  wasPrice: number;
  stock_quantity?: number;
  description: string;
  ingredients: string[];
  use: string;
}

function Index() {
  const loaderData = Route.useLoaderData();
  const [quiz, setQuiz] = useState(false);
  const [catalog, setCatalog] = useState<CatalogItem[]>(loaderData.catalog);
  const videoRef = useRef<HTMLVideoElement>(null);
  const arenciaVideoRef = useRef<HTMLVideoElement>(null);

  // Ensure background ritual videos autoplay smoothly across browsers and mobile devices
  useEffect(() => {
    for (const v of [videoRef.current, arenciaVideoRef.current]) {
      if (v) {
        v.defaultMuted = true;
        v.muted = true;
        const playPromise = v.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Handled browser autoplay restrictions
          });
        }
      }
    }
  }, []);

  // Sync state if loader re-runs on client transitions
  useEffect(() => {
    setCatalog(loaderData.catalog);
  }, [loaderData]);

  // Smooth scroll to hash section (#collection or #reviews) when landing from menu bar
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 60);
      }
    };
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  // Client-side hydration & live sync so pictures set in Admin Panel always appear even after SSR
  useEffect(() => {
    let active = true;
    const refreshClientCatalog = async () => {
      try {
        const latest = await getProducts(true);
        if (active && latest && latest.length > 0) {
          setCatalog(mapProductsToCatalog(latest));
        }
      } catch {
        // Keep current catalog
      }
    };

    void refreshClientCatalog();

    const handleFocus = () => void refreshClientCatalog();
    const handleStorage = () => void refreshClientCatalog();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <>
      <Header />

      <main>
        <section className="hero">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-label="Original KoreanSkinCare ritual background video"
          >
            <source src={heroVideo} type="video/mp4" />
            <source src="/hero-video.mp4" type="video/mp4" />
            <source src="/2026-10-13-074211794.mp4" type="video/mp4" />
          </video>
          <div className="hero-content">
            <div className="eyebrow flex items-center gap-3">
              <span className="w-7 border-t border-hero-ink" /> THE ART OF KOREAN SKINCARE
            </div>
            <h1>
              The Essence of
              <br />
              <em>Glass Skin</em>
            </h1>
            <p className="hero-copy">
              Pure, clinically-proven formulations direct from Seoul to Pakistan. Curated for
              transformative radiance, barrier resilience, and lasting cellular hydration.
            </p>
            <div className="hero-actions">
              <Button variant="hero" size="lg" asChild>
                <Link to="/" hash="collection">
                  Explore The Collection <ArrowRight />
                </Link>
              </Button>
              <Button variant="heroLink" onClick={() => setQuiz(true)}>
                Find Your Routine Quiz <ArrowUpIcon />
              </Button>
            </div>
          </div>
        </section>
        <TrustStrip />
        <section id="collection" className="max-w-[1408px] mx-auto px-6 md:px-16 py-14 md:py-20">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="eyebrow text-muted-foreground">LESS, BUT BETTER</p>
              </div>
              <h2 className="section-heading">
                The Curated <em>Collection.</em>
              </h2>
              <p className="text-xs text-muted-foreground mt-4 leading-6">
                Exceptional formulas. One intentional ritual.
              </p>
            </div>
            <span className="hidden sm:flex items-center gap-2 text-[10px] pb-1">
              Your daily glow, refined <ArrowDown size={14} />
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-10 md:gap-x-6 mt-9">
            {catalog.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>

        {/* Featured Arencia Video & Breakthrough Section (Right below products) */}
        <section className="max-w-[1408px] mx-auto px-6 md:px-16 pb-16 md:pb-24">
          <div className="overflow-hidden rounded-[28px] border bg-card shadow-sm">
            {/* Seamless Continuous Video with Light Overlay Text (No Video Icons/Controls) */}
            <div className="relative w-full aspect-[4/5] sm:aspect-[16/10] md:aspect-[16/9] overflow-hidden bg-stone-900">
              <video
                ref={arenciaVideoRef}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                disablePictureInPicture
                controlsList="nodownload nofullscreen noremoteplayback"
                className="w-full h-full object-cover pointer-events-none select-none"
                aria-label="Arencia Fresh Royal Rosehip & Vitamin C 200"
              >
                <source src={arenciaVideo} type="video/mp4" />
                <source src="/arencia-video.mp4" type="video/mp4" />
              </video>

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 sm:p-10 md:p-12">
                <p className="text-[11px] sm:text-xs uppercase tracking-[0.22em] font-semibold text-white/85">
                  Morning Radiance Powerhouse
                </p>
                <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-medium text-white mt-2 leading-tight">
                  Fresh Royal Rosehip &amp; Vitamin C 200
                </h3>
              </div>
            </div>

            {/* Text Content Below Video */}
            <div className="p-6 sm:p-10 md:p-12 bg-secondary/40">
              <p className="eyebrow text-primary">Featured Breakthrough</p>
              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-normal text-foreground mt-2.5 leading-tight">
                Arencia Fresh Royal Rosehip Vitamin C 200 Booster Shot
              </h2>
              <p className="text-xs sm:text-sm leading-7 text-muted-foreground mt-4 max-w-3xl">
                Formulated with micro-encapsulated French rosehip extract and bio-available Vitamin
                C beads that burst upon contact. Effortlessly dissolves dullness, regulates melanin
                production, and leaves the skin visibly energized with a healthy glass glow.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mt-7 max-w-2xl">
                <div className="rounded-2xl border bg-background/80 p-4 sm:p-5">
                  <p className="font-serif text-lg font-medium text-foreground">French Rosehip</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    High polyphenol antioxidant shield
                  </p>
                </div>

                <div className="rounded-2xl border bg-background/80 p-4 sm:p-5">
                  <p className="font-serif text-lg font-medium text-foreground">Vitamin C 200</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Non-oxidizing brightening beads
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t flex flex-wrap items-center justify-between gap-4 max-w-2xl">
                <Button asChild size="lg" className="font-semibold text-xs px-7 py-6">
                  <Link to="/products/$slug" params={{ slug: "arencia-vitamin-c" }}>
                    Discover Arencia Ritual <ArrowRight className="ml-1.5" size={15} />
                  </Link>
                </Button>
                <span className="font-serif text-2xl sm:text-3xl font-semibold text-foreground">
                  Rs. 1999
                </span>
              </div>
            </div>
          </div>
        </section>

        <Difference />
        <section id="philosophy" className="bg-secondary px-6 py-16 md:py-20 text-center">
          <Sparkles className="mx-auto mb-5" size={26} strokeWidth={1} />
          <p className="eyebrow text-muted-foreground mb-4">THE KOREANSKINCARE PHILOSOPHY</p>
          <h2 className="section-heading">
            A ritual, <em>not a routine.</em>
          </h2>
          <p className="text-xs leading-7 text-muted-foreground max-w-lg mx-auto mt-5">
            We believe beautiful skin begins with a considered approach. A small edit of purposeful
            formulas, chosen to bring a little more care to your everyday.
          </p>
          <Button variant="link" className="mt-5 text-xs" onClick={() => setQuiz(true)}>
            Find your skin's essentials <ArrowRight />
          </Button>
        </section>
        <CustomerReviewsSection />
      </main>
      <Footer />
      <Quiz open={quiz} onClose={() => setQuiz(false)} availableProducts={catalog} />
    </>
  );
}

function ArrowUpIcon() {
  return <ArrowRight className="-rotate-45" />;
}
