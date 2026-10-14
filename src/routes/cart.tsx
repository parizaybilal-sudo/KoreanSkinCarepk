import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  ShieldCheck,
  Truck,
  Banknote,
  AlertCircle,
} from "lucide-react";
import { Header, Footer } from "@/components/store";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { getProducts, type DBProduct } from "@/lib/store-service";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Shopping Cart | KoreanSkinCare" },
      {
        name: "description",
        content: "Review your skincare selections before Cash on Delivery checkout.",
      },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const [liveProducts, setLiveProducts] = useState<DBProduct[]>([]);

  useEffect(() => {
    let active = true;
    const syncStock = async () => {
      try {
        const prods = await getProducts(false);
        if (active && prods) {
          setLiveProducts(prods);
        }
      } catch {
        // Fallback to item.stock
      }
    };
    void syncStock();
    window.addEventListener("focus", syncStock);
    window.addEventListener("storage", syncStock);
    return () => {
      active = false;
      window.removeEventListener("focus", syncStock);
      window.removeEventListener("storage", syncStock);
    };
  }, []);

  const isItemUnstock = (item: CartItem): boolean => {
    const matched = liveProducts.find((p) => p.id === item.productId || p.slug === item.slug);
    const effectiveStock =
      matched !== undefined
        ? (matched.stock_quantity ?? 50)
        : typeof item.stock === "number"
          ? item.stock
          : 50;
    return effectiveStock <= 0;
  };

  const hasUnstockItems = items.some((item) => isItemUnstock(item));
  const deliveryFee = 250;
  const total = subtotal > 0 ? subtotal + deliveryFee : 0;

  return (
    <>
      <Header />
      <main className="max-w-[1280px] mx-auto px-6 md:px-16 py-10 min-h-[60vh]">
        <div className="flex items-center gap-3 mb-8">
          <Link
            to="/"
            hash="collection"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} /> Continue Shopping
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-xs font-medium">Your Cart</span>
        </div>

        <h1 className="section-heading mb-8">
          Your Skincare <em>Cart</em>
        </h1>

        {items.length === 0 ? (
          <div className="bg-card border rounded-lg p-12 text-center max-w-xl mx-auto my-12">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-5 text-muted-foreground">
              <ShoppingBag size={28} strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-medium mb-3">Your cart is empty</h2>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed max-w-md mx-auto">
              You haven't added any products to your skincare edit yet. Discover our curated
              collection direct from Seoul.
            </p>
            <Button asChild size="lg">
              <Link to="/" hash="collection">
                Explore The Curated 5 <ArrowRight className="ml-2" size={16} />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            {/* Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
              <div className="border-b pb-3 text-xs text-muted-foreground grid grid-cols-12 font-medium">
                <span className="col-span-6 sm:col-span-7">PRODUCT</span>
                <span className="col-span-3 sm:col-span-3 text-center">QUANTITY</span>
                <span className="col-span-3 sm:col-span-2 text-right">TOTAL</span>
              </div>

              {items.map((item) => {
                const itemTotal = item.price * item.quantity;
                const unstock = isItemUnstock(item);
                return (
                  <div
                    key={item.productId || item.slug}
                    className="grid grid-cols-12 items-center gap-4 py-5 border-b"
                  >
                    {/* Item Info */}
                    <div className="col-span-6 sm:col-span-7 flex items-center gap-4">
                      <div className="w-20 h-24 bg-card border rounded overflow-hidden flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-contain p-1"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="eyebrow text-muted-foreground text-[9px] block">
                          {item.brand}
                        </span>
                        <Link
                          to="/products/$slug"
                          params={{ slug: item.slug }}
                          className="font-medium text-sm hover:text-primary transition-colors line-clamp-1 block mt-0.5"
                        >
                          {item.name}
                        </Link>
                        <span className="text-[11px] text-muted-foreground block mt-1">
                          {item.type} {item.size ? `· ${item.size}` : ""}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs font-semibold text-primary">
                            {formatPrice(item.price)}
                          </span>
                          {unstock && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                              Unstock
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.productId || item.slug)}
                          className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 mt-2 transition-colors"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="col-span-3 sm:col-span-3 flex flex-col items-center justify-center gap-1.5">
                      {unstock ? (
                        <span className="px-3 py-1 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                          Unstock
                        </span>
                      ) : (
                        <div className="flex items-center border rounded-md bg-secondary/30">
                          <button
                            onClick={() =>
                              updateQuantity(item.productId || item.slug, item.quantity - 1)
                            }
                            className="p-2 hover:bg-secondary transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="px-3 text-xs font-medium min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.productId || item.slug, item.quantity + 1)
                            }
                            className="p-2 hover:bg-secondary transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Line Total */}
                    <div className="col-span-3 sm:col-span-2 text-right">
                      {unstock ? (
                        <span className="font-bold text-xs text-red-600">Unstock</span>
                      ) : (
                        <span className="font-semibold text-sm">{formatPrice(itemTotal)}</span>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="pt-4 flex justify-between items-center text-xs text-muted-foreground">
                <Link to="/" hash="collection" className="hover:underline flex items-center gap-1">
                  <Plus size={12} /> Add more items
                </Link>
                <span>Prices shown in Pakistani Rupee (PKR)</span>
              </div>
            </div>

            {/* Order Summary Card */}
            <div className="lg:col-span-4 bg-secondary/40 border rounded-lg p-6 sticky top-28">
              <h2 className="font-serif text-xl font-medium mb-5 pb-3 border-b">Order Summary</h2>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-muted-foreground">Courier Delivery</span>
                    <span className="block text-[10px] text-muted-foreground">
                      All Pakistan cities
                    </span>
                  </div>
                  <span className="font-medium">{formatPrice(deliveryFee)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded border border-emerald-200 dark:border-emerald-800">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Banknote size={15} /> Payment Method
                  </span>
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Cash on Delivery
                  </span>
                </div>
              </div>

              <div className="border-t mt-5 pt-4 flex justify-between items-baseline mb-6">
                <div>
                  <span className="font-serif text-lg font-semibold block">Total Payable</span>
                  <span className="text-[10px] text-muted-foreground">
                    Pay upon doorstep delivery
                  </span>
                </div>
                <span className="font-serif text-2xl font-bold text-primary">
                  {formatPrice(total)}
                </span>
              </div>

              {hasUnstockItems ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-semibold">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>Unstock — Order cannot be placed for unstock items.</span>
                  </div>
                  <Button
                    disabled
                    size="lg"
                    className="w-full text-sm font-semibold tracking-wide opacity-80 cursor-not-allowed"
                  >
                    Unstock
                  </Button>
                </div>
              ) : (
                <Button asChild size="lg" className="w-full text-sm font-semibold tracking-wide">
                  <Link to="/checkout">
                    Proceed to Checkout <ArrowRight className="ml-2" size={16} />
                  </Link>
                </Button>
              )}

              <div className="mt-6 pt-6 border-t space-y-3 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary flex-shrink-0" />
                  <span>100% Authentic Korean Products Guarantee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-primary flex-shrink-0" />
                  <span>2-4 Business Days Express Courier Delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <Banknote size={16} className="text-primary flex-shrink-0" />
                  <span>Pay Cash When You Inspect Your Package</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
