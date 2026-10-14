import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Truck,
  Banknote,
  ArrowRight,
  Copy,
  Check,
  Search,
  Calendar,
} from "lucide-react";
import { Header, Footer } from "@/components/store";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/products";
import { getOrderByNumber } from "@/lib/store-service";
import type { DBOrder } from "@/lib/supabase";

export const Route = createFileRoute("/order-confirmation/$orderNumber")({
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.orderNumber} Confirmed | KoreanSkinCare` },
      { name: "description", content: "Thank you for your order with KoreanSkinCare." },
    ],
  }),
  component: OrderConfirmationPage,
});

function OrderConfirmationPage() {
  const { orderNumber } = Route.useParams();
  const [order, setOrder] = useState<DBOrder | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getOrderByNumber(orderNumber).then((res) => {
      if (res) setOrder(res);
    });
  }, [orderNumber]);

  const handleCopy = () => {
    navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Header />
      <main className="max-w-[860px] mx-auto px-6 py-12">
        {/* Success Banner */}
        <div className="bg-card border rounded-xl p-8 sm:p-12 text-center shadow-sm mb-10">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center mx-auto mb-5 animate-in zoom-in">
            <CheckCircle2 size={36} strokeWidth={2} />
          </div>

          <span className="eyebrow text-emerald-800 dark:text-emerald-400 font-semibold tracking-wider">
            ORDER SUCCESSFULLY RECEIVED
          </span>
          <h1 className="section-heading mt-2 mb-3">
            Thank you for <em>your ritual.</em>
          </h1>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your Cash on Delivery order has been registered. Our fulfillment team in Lahore will
            pack your fresh Seoul imports and dispatch via express courier.
          </p>

          {/* Order Number Badge */}
          <div className="mt-8 inline-flex items-center gap-3 bg-secondary px-5 py-3 rounded-lg border">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block text-left">
                Your Unique Order Number
              </span>
              <span className="font-mono font-bold text-sm tracking-wide text-foreground">
                {orderNumber}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
              title="Copy Order Number"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* COD Reminder Callout */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg p-5 mb-10 flex items-start gap-4 text-xs text-amber-900 dark:text-amber-200">
          <Banknote size={22} className="flex-shrink-0 text-amber-700 mt-0.5" />
          <div className="space-y-1">
            <strong className="block font-semibold">Cash on Delivery Reminder</strong>
            <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
              Please keep{" "}
              <span className="font-bold underline">
                {order ? formatPrice(order.total_amount) : "the exact cash amount"}
              </span>{" "}
              ready for the courier rider upon delivery. The courier rider will contact you on your
              provided phone number before arriving.
            </p>
          </div>
        </div>

        {/* Order Details Breakdown */}
        {order && (
          <div className="bg-card border rounded-lg p-6 sm:p-8 space-y-6 mb-10">
            <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b">
              <div>
                <h2 className="font-serif text-lg font-medium">Order Overview</h2>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Calendar size={12} /> Placed on{" "}
                  {new Date(order.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-semibold px-2.5 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {order.order_status.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] uppercase font-semibold px-2.5 py-1 rounded bg-secondary">
                  Payment: {order.payment_status}
                </span>
              </div>
            </div>

            {/* Delivery address */}
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-secondary/30 rounded border">
                <span className="eyebrow text-muted-foreground text-[9px] block mb-1">
                  Recipient
                </span>
                <strong className="block text-sm font-medium">{order.customer_name}</strong>
                <span className="text-muted-foreground block mt-0.5">{order.customer_phone}</span>
                {order.customer_whatsapp && (
                  <span className="text-muted-foreground block text-[11px]">
                    WhatsApp: {order.customer_whatsapp}
                  </span>
                )}
              </div>
              <div className="p-3 bg-secondary/30 rounded border">
                <span className="eyebrow text-muted-foreground text-[9px] block mb-1">
                  Delivery Destination
                </span>
                <p className="text-muted-foreground leading-relaxed">{order.delivery_address}</p>
                <span className="font-medium text-foreground block mt-1">
                  {order.city}, {order.province} {order.postal_code || ""}
                </span>
              </div>
            </div>

            {/* Items */}
            {order.items && order.items.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="eyebrow text-muted-foreground text-[10px] mb-3">
                  Ordered Formulations
                </h3>
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-muted-foreground text-[11px] block">
                          Qty: {item.quantity} · {formatPrice(item.unit_price)} each
                        </span>
                      </div>
                      <span className="font-semibold">{formatPrice(item.total_price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price calculation */}
            <div className="border-t pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Courier Delivery (All Pakistan)</span>
                <span>{formatPrice(order.delivery_fee)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t font-semibold text-sm">
                <span className="font-serif text-base">Total Payable</span>
                <span className="font-serif text-xl text-primary">
                  {formatPrice(order.total_amount)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/track">
              <Search className="mr-2" size={16} /> Track Order Progress
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link to="/" hash="collection">
              Continue Shopping <ArrowRight className="ml-2" size={16} />
            </Link>
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
