import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Banknote,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { Header, Footer } from "@/components/store";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { placeOrderCOD, getProducts, type DBProduct } from "@/lib/store-service";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Cash on Delivery Checkout | KoreanSkinCare" },
      {
        name: "description",
        content: "Fast and secure Cash on Delivery checkout across all cities in Pakistan.",
      },
    ],
  }),
  component: CheckoutPage,
});

const PAKISTAN_PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa (KPK)",
  "Islamabad Capital Territory",
  "Balochistan",
  "Azad Jammu & Kashmir (AJK)",
  "Gilgit-Baltistan",
];

const POPULAR_CITIES = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Sialkot",
  "Gujranwala",
  "Hyderabad",
  "Bahawalpur",
  "Sargodha",
  "Sukkur",
  "Abbottabad",
  "Other City",
];

function CheckoutPage() {
  const { items, subtotal, clearCart, removeItem } = useCart();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Lahore");
  const [customCity, setCustomCity] = useState("");
  const [province, setProvince] = useState("Punjab");
  const [postalCode, setPostalCode] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const deliveryFee = 250;
  const totalAmount = subtotal > 0 ? subtotal + deliveryFee : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError("Your cart is empty. Please add items before checking out.");
      return;
    }

    if (hasUnstockItems) {
      setError("Unstock: One or more items in your cart are out of stock and cannot be ordered.");
      return;
    }

    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      setError("Please complete all required fields (Full Name, Phone Number, Delivery Address).");
      return;
    }

    const selectedCity = city === "Other City" ? customCity.trim() : city;
    if (!selectedCity) {
      setError("Please enter your city.");
      return;
    }

    try {
      setLoading(true);

      const latestProds = await getProducts(false).catch(() => liveProducts);
      for (const item of items) {
        const matched = latestProds.find((p) => p.id === item.productId || p.slug === item.slug);
        const stock =
          matched !== undefined
            ? (matched.stock_quantity ?? 50)
            : typeof item.stock === "number"
              ? item.stock
              : 50;
        if (stock <= 0 || stock < item.quantity) {
          setError(`Unstock: ${item.name} is out of stock and cannot be ordered.`);
          setLoading(false);
          return;
        }
      }

      const orderData = {
        customer_name: fullName.trim(),
        customer_phone: phone.trim(),
        customer_whatsapp: whatsapp.trim() || undefined,
        customer_email: email.trim() || undefined,
        delivery_address: address.trim(),
        city: selectedCity,
        province,
        postal_code: postalCode.trim() || undefined,
        order_notes: orderNotes.trim() || undefined,
        items: items.map((i) => ({
          product_id: i.productId,
          slug: i.slug,
          quantity: i.quantity,
          name: i.name,
          brand: i.brand,
          price: i.price,
          image: i.image,
        })),
      };

      const result = await placeOrderCOD(orderData);
      clearCart();

      // Navigate to order confirmation page
      navigate({
        to: "/order-confirmation/$orderNumber",
        params: { orderNumber: result.order_number },
      });
    } catch (err: unknown) {
      console.error("Order submission failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while placing your order. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="max-w-xl mx-auto px-6 py-20 text-center">
          <h1 className="text-2xl font-serif mb-3">No Items in Checkout</h1>
          <p className="text-xs text-muted-foreground mb-6">
            Please add skincare products to your cart before proceeding to checkout.
          </p>
          <Button asChild>
            <Link to="/" hash="collection">
              Return to Catalog
            </Link>
          </Button>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-[1280px] mx-auto px-6 md:px-16 py-10">
        <div className="flex items-center gap-3 mb-8 text-xs text-muted-foreground">
          <Link to="/cart" className="hover:text-foreground inline-flex items-center gap-1.5">
            <ArrowLeft size={13} /> Back to Cart
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">Cash on Delivery Checkout</span>
        </div>

        <h1 className="section-heading mb-8">
          Complete Your <em>Order</em>
        </h1>

        {hasUnstockItems && (
          <div className="mb-8 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-red-600" />
            <div>
              <strong className="block font-bold text-sm">Unstock</strong>
              <span>
                One or more products in your cart are currently Unstock (out of stock) and cannot be
                ordered.
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-3">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-medium">Order could not be placed</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-12 gap-10 items-start">
          {/* Checkout Form */}
          <div className="lg:col-span-7 space-y-8">
            {/* Delivery Details */}
            <div className="bg-card border rounded-lg p-6">
              <h2 className="font-serif text-lg font-medium mb-1 flex items-center gap-2">
                <Truck size={18} className="text-primary" /> Delivery Information
              </h2>
              <p className="text-xs text-muted-foreground mb-6">
                Enter where you'd like your parcel delivered via express courier.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ayesha Khan"
                    className="w-full px-3.5 py-2.5 text-xs bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                      Phone Number (For Delivery Call) <span className="text-primary">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="03144706515"
                      className="w-full px-3.5 py-2.5 text-xs bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      The rider will call this number before arrival.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                      WhatsApp Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="03144706515"
                      className="w-full px-3.5 py-2.5 text-xs bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      For dispatch tracking updates.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ayesha@example.com"
                    className="w-full px-3.5 py-2.5 text-xs bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    Full Street Address <span className="text-primary">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House/Apartment #, Street, Block/Phase, Sector or Landmark..."
                    className="w-full px-3.5 py-2.5 text-xs bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                      City <span className="text-primary">*</span>
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {POPULAR_CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    {city === "Other City" && (
                      <input
                        type="text"
                        required
                        value={customCity}
                        onChange={(e) => setCustomCity(e.target.value)}
                        placeholder="Enter your city name"
                        className="mt-2 w-full px-3.5 py-2.5 text-xs bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                      Province <span className="text-primary">*</span>
                    </label>
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {PAKISTAN_PROVINCES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    Delivery Instructions / Order Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="e.g. Call before delivery, deliver after 2 PM..."
                    className="w-full px-3.5 py-2.5 text-xs bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Option */}
            <div className="bg-card border rounded-lg p-6">
              <h2 className="font-serif text-lg font-medium mb-1 flex items-center gap-2">
                <Banknote size={18} className="text-primary" /> Payment Method
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                Doorstep cash collection on delivery. No advance online payment required.
              </p>

              <div className="border-2 border-primary bg-primary/5 rounded-lg p-4 flex items-start gap-4">
                <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0 mt-0.5">
                  <CheckCircle2 size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Cash on Delivery (COD)</span>
                    <span className="text-[10px] bg-primary text-primary-foreground font-semibold px-2 py-0.5 rounded">
                      Standard
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Pay safely in cash to the delivery rider when your package arrives at your
                    doorstep. Please keep exact change ready.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-5 bg-secondary/30 border rounded-lg p-6 sticky top-28">
            <h2 className="font-serif text-xl font-medium mb-4 pb-3 border-b">
              Your Items ({items.length})
            </h2>

            <div className="divide-y max-h-72 overflow-y-auto pr-1 mb-6">
              {items.map((item) => {
                const unstock = isItemUnstock(item);
                return (
                  <div key={item.productId || item.slug} className="py-3 flex items-center gap-3">
                    <div className="w-12 h-14 bg-background border rounded overflow-hidden flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain p-0.5"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-medium truncate">{item.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-muted-foreground">
                          Qty: {item.quantity} · {item.brand}
                        </p>
                        {unstock && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            Unstock
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId || item.slug)}
                        className="text-[10px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1 mt-1 transition-colors"
                      >
                        <Trash2 size={11} /> Remove
                      </button>
                    </div>
                    <div className="text-right">
                      {unstock ? (
                        <span className="text-xs font-bold text-red-600 block">Unstock</span>
                      ) : (
                        <span className="text-xs font-semibold">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 text-xs border-t pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-muted-foreground">Express Courier Delivery</span>
                  <span className="block text-[10px] text-muted-foreground">
                    Flat fee across Pakistan
                  </span>
                </div>
                <span className="font-medium">{formatPrice(deliveryFee)}</span>
              </div>
            </div>

            <div className="border-t mt-4 pt-4 flex justify-between items-baseline mb-6">
              <div>
                <span className="font-serif text-lg font-semibold block">Total Payable</span>
                <span className="text-[10px] text-muted-foreground">Cash on Delivery</span>
              </div>
              <span className="font-serif text-2xl font-bold text-primary">
                {formatPrice(totalAmount)}
              </span>
            </div>

            {hasUnstockItems && (
              <div className="mb-3 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-semibold">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>Unstock — Order cannot be placed.</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || hasUnstockItems}
              size="lg"
              className="w-full text-sm font-semibold tracking-wide py-6"
            >
              {hasUnstockItems ? (
                "Unstock"
              ) : loading ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={18} /> Processing Order...
                </>
              ) : (
                <>Confirm Cash on Delivery Order ({formatPrice(totalAmount)})</>
              )}
            </Button>

            <div className="mt-6 pt-5 border-t space-y-2 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-primary flex-shrink-0" />
                <span>100% Guaranteed Original Korean Imports</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck size={14} className="text-primary flex-shrink-0" />
                <span>Rider will coordinate before arrival at your address</span>
              </div>
            </div>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
}
