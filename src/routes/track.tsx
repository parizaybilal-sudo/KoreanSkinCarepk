import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  ShieldAlert,
  ArrowLeft,
  Loader2,
  Calendar,
} from "lucide-react";
import { Header, Footer } from "@/components/store";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/products";
import { trackOrder } from "@/lib/store-service";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track Your Order | KoreanSkinCare" },
      {
        name: "description",
        content:
          "Check your KoreanSkinCare delivery status using your order number and phone number.",
      },
    ],
  }),
  component: OrderTrackingPage,
});

const PIPELINE_STEPS = [
  { key: "pending", label: "Received", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "processing", label: "Processing", icon: Package },
  { key: "packed", label: "Packed", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

function getStepIndex(status: string): number {
  const norm = status.toLowerCase();
  const idx = PIPELINE_STEPS.findIndex((s) => s.key === norm);
  return idx > -1 ? idx : 0;
}

function OrderTrackingPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackResult, setTrackResult] = useState<
    Awaited<ReturnType<typeof trackOrder>>["order"] | null
  >(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) {
      setError("Please provide both your order number and the phone number used at checkout.");
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await trackOrder(orderNumber, phone);
      if (res.found && res.order) {
        setTrackResult(res.order);
      } else {
        setTrackResult(null);
        setError(res.error || "No order found matching this order number and phone number.");
      }
    } catch {
      setError("Could not retrieve tracking details. Please verify your information.");
      setTrackResult(null);
    } finally {
      setLoading(false);
    }
  };

  const currentStep = trackResult ? getStepIndex(trackResult.order_status) : 0;

  return (
    <>
      <Header />
      <main className="max-w-[840px] mx-auto px-6 py-12 min-h-[70vh]">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={13} /> Back to Store
          </Link>
          <h1 className="section-heading mt-4">
            Track Your <em>Parcel</em>
          </h1>
          <p className="text-xs text-muted-foreground mt-2 max-w-lg leading-relaxed">
            Enter your unique order number and the phone number provided at checkout to view
            real-time courier updates.
          </p>
        </div>

        {/* Tracking Search Card */}
        <form
          onSubmit={handleTrack}
          className="bg-card border rounded-xl p-6 sm:p-8 shadow-sm mb-10"
        >
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2">
                Order Number
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. KSC-20261013-AB123"
                className="w-full px-3.5 py-2.5 text-xs bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03144706515"
                className="w-full px-3.5 py-2.5 text-xs bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 animate-spin" size={16} /> Checking Status...
              </>
            ) : (
              <>
                <Search className="mr-2" size={16} /> Track Shipment
              </>
            )}
          </Button>
        </form>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-3 mb-8">
            <ShieldAlert size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-medium">Tracking Inquiry Failed</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Tracking Results */}
        {trackResult && (
          <div className="space-y-8 animate-in fade-in">
            {/* Header Status Card */}
            <div className="bg-card border rounded-xl p-6 sm:p-8">
              <div className="flex flex-wrap justify-between items-center gap-4 pb-6 border-b">
                <div>
                  <span className="eyebrow text-muted-foreground text-[10px]">
                    CURRENT DISPATCH STATUS
                  </span>
                  <h2 className="text-xl font-serif mt-1 font-semibold capitalize">
                    {trackResult.order_status.replace(/_/g, " ")}
                  </h2>
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 font-mono">
                    <Calendar size={13} /> Order #{trackResult.order_number}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold px-3 py-1 rounded bg-secondary block">
                    Cash on Delivery: {trackResult.payment_status}
                  </span>
                  <span className="text-xs font-medium text-primary mt-1.5 block">
                    Total: {formatPrice(trackResult.total_amount)}
                  </span>
                </div>
              </div>

              {/* Progress Pipeline */}
              <div className="mt-8 pt-2">
                <div className="relative">
                  {/* Progress Line */}
                  <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 z-0" />
                  <div
                    className="hidden md:block absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-700"
                    style={{
                      width: `${(currentStep / (PIPELINE_STEPS.length - 1)) * 100}%`,
                    }}
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4 relative z-10">
                    {PIPELINE_STEPS.map((step, idx) => {
                      const StepIcon = step.icon;
                      const isComplete = idx <= currentStep;
                      const isCurrent = idx === currentStep;

                      return (
                        <div key={step.key} className="flex flex-col items-center text-center">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                              isCurrent
                                ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                                : isComplete
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary text-muted-foreground border"
                            }`}
                          >
                            <StepIcon size={16} />
                          </div>
                          <span
                            className={`text-[10px] mt-2 font-medium ${
                              isCurrent ? "text-primary font-bold" : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Delivery destination preview */}
              <div className="mt-8 pt-6 border-t grid sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-secondary/40 p-3.5 rounded border">
                  <span className="eyebrow text-muted-foreground text-[9px] block mb-1">
                    Customer
                  </span>
                  <strong className="block font-medium">{trackResult.customer_name}</strong>
                  <span className="text-muted-foreground">
                    {trackResult.city}, {trackResult.province}
                  </span>
                </div>
                <div className="bg-secondary/40 p-3.5 rounded border">
                  <span className="eyebrow text-muted-foreground text-[9px] block mb-1">
                    Courier Dispatch
                  </span>
                  <span className="text-muted-foreground block">
                    Express Courier with Cash on Delivery
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold block mt-0.5 text-[11px]">
                    Expected 2-4 business days
                  </span>
                </div>
              </div>
            </div>

            {/* Status History Timeline */}
            {trackResult.history && trackResult.history.length > 0 && (
              <div className="bg-card border rounded-xl p-6 sm:p-8">
                <h3 className="font-serif text-base font-medium mb-4">Milestone History</h3>
                <div className="space-y-4">
                  {trackResult.history.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 text-xs border-l-2 border-primary pl-4 py-1"
                    >
                      <div>
                        <strong className="font-semibold capitalize block">
                          {h.status.replace(/_/g, " ")}
                        </strong>
                        {h.notes && (
                          <p className="text-muted-foreground text-[11px] mt-0.5">{h.notes}</p>
                        )}
                        <span className="text-[10px] text-muted-foreground mt-1 block">
                          {(() => {
                            try {
                              return new Date(h.created_at).toLocaleString("en-US", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              });
                            } catch {
                              return h.created_at;
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {searched && !trackResult && !error && (
          <p className="text-center text-xs text-muted-foreground py-10">
            No active shipment found with these details.
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
