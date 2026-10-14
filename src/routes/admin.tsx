import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tags,
  Truck,
  Settings,
  LogOut,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  AlertTriangle,
  Film,
  Image as ImageIcon,
  Database,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  Menu,
  ChevronRight,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Eye,
  RefreshCw,
  Upload,
  Star,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Button } from "@/components/ui/button";
import { formatPrice, products as fallbackCatalog } from "@/lib/products";
import {
  supabase,
  isSupabaseConfigured,
  type DBProduct,
  type DBOrder,
  type DBCategory,
  type DBShippingSettings,
  type DBStoreSettings,
} from "@/lib/supabase";
import {
  getProducts,
  saveProduct,
  deleteProduct,
  getOrders,
  deleteOrder,
  clearAllDemoOrders,
  updateOrderStatus,
  updateOrderPaymentStatus,
  updateOrderInternalNotes,
  getCategories,
  saveCategory,
  deleteCategory,
  getShippingSettings,
  updateShippingSettings,
  getStoreSettings,
  updateStoreSettings,
  uploadMediaFile,
  checkSupabaseAvailable,
  resolveProductImageUrl,
  syncCatalogToSupabase,
} from "@/lib/store-service";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal | KoreanSkinCare" },
      { name: "description", content: "Management console for KoreanSkinCare store." },
    ],
  }),
  component: AdminPage,
});

type TabType = "dashboard" | "orders" | "products" | "categories" | "shipping" | "settings";

const ADMIN_ROLE_CACHE_KEY = "ksc_verified_admin_uid";

function AdminPage() {
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [initializingAuth, setInitializingAuth] = useState(true);
  const [checkingRole, setCheckingRole] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminNotice, setAdminNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotice = (message: string, type: "success" | "error" = "success") => {
    setAdminNotice({ type, message });
    setTimeout(() => {
      setAdminNotice((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  const [orders, setOrders] = useState<DBOrder[]>([]);
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [categories, setCategories] = useState<DBCategory[]>([]);
  const [shippingSettings, setShippingSettings] = useState<DBShippingSettings>({
    id: "default",
    flat_delivery_fee: 250,
    free_delivery_threshold: 5000,
    free_delivery_enabled: false,
    currency: "PKR",
  });
  const [storeSettings, setStoreSettings] = useState<DBStoreSettings>({
    id: "default",
    store_name: "KoreanSkinCare",
    contact_email: "care@koreanskincare.pk",
    contact_phone: "+92 300 1234567",
    whatsapp_number: "+92 300 1234567",
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
  });
  const [loadingData, setLoadingData] = useState(false);
  const [tablesReady, setTablesReady] = useState<boolean | null>(null);

  // Category creation state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const checkAvailability = async (force = false) => {
    const ready = await checkSupabaseAvailable(force);
    setTablesReady(ready);
  };

  useEffect(() => {
    checkAvailability();
  }, []);

  // Selected Order for Modal / Invoice
  const [selectedOrder, setSelectedOrder] = useState<DBOrder | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  // Selected Product for Edit / Add
  const [editingProduct, setEditingProduct] = useState<Partial<DBProduct> | null>(null);
  const [productImages, setProductImages] = useState<
    Array<{ image_url: string; is_primary?: boolean; alt_text?: string | null }>
  >([]);
  const [productVideos, setProductVideos] = useState<
    Array<{ video_url: string; title: string; thumbnail_url?: string | null | undefined }>
  >([]);
  const [productSections, setProductSections] = useState<
    Array<{ title: string; content: string; section_type?: string }>
  >([]);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  // Order Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");

  // Product Filters
  const [productSearchQuery, setProductSearchQuery] = useState("");

  const checkAdminRole = async (userId: string) => {
    if (!supabase) {
      setInitializingAuth(false);
      return;
    }

    const cachedAdminUid =
      typeof window !== "undefined" ? window.sessionStorage.getItem(ADMIN_ROLE_CACHE_KEY) : null;
    if (cachedAdminUid === userId) {
      setIsAdminRole(true);
      setAuthError(null);
      setInitializingAuth(false);
      setCheckingRole(false);
      return;
    }

    setCheckingRole(true);
    try {
      const { data, error } = await supabase
        .from("admin_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data && data.role === "admin") {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(ADMIN_ROLE_CACHE_KEY, userId);
        }
        setIsAdminRole(true);
        setAuthError(null);
      } else {
        setIsAdminRole(false);
        setAuthError(
          "Access denied: Your account is authenticated in Supabase, but is not assigned the 'admin' role in the admin_roles table.",
        );
      }
    } catch {
      if (cachedAdminUid === userId) {
        setIsAdminRole(true);
      } else {
        setIsAdminRole(false);
        setAuthError("Failed to verify admin permissions.");
      }
    } finally {
      setCheckingRole(false);
      setInitializingAuth(false);
    }
  };

  // Check Supabase session on mount
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setInitializingAuth(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setSessionUser(session.user.email || "Admin User");
        checkAdminRole(session.user.id);
      } else {
        setInitializingAuth(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "TOKEN_REFRESHED" && session?.user) {
        setSessionUser(session.user.email || "Admin User");
        return;
      }
      if (session?.user) {
        setSessionUser(session.user.email || "Admin User");
        checkAdminRole(session.user.id);
      } else if (event === "SIGNED_OUT") {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(ADMIN_ROLE_CACHE_KEY);
        }
        setSessionUser(null);
        setIsAdminRole(false);
        setInitializingAuth(false);
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
        if (!data.user) throw new Error("No user returned from Supabase authentication.");

        setSessionUser(data.user.email || "Admin User");
        setCheckingRole(true);

        // Validate role in admin_roles table
        const { data: roleRow, error: roleErr } = await supabase
          .from("admin_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (roleErr) {
          throw new Error(`Admin role verification error: ${roleErr.message}`);
        }

        if (!roleRow || roleRow.role !== "admin") {
          await supabase.auth.signOut();
          setSessionUser(null);
          setIsAdminRole(false);
          throw new Error(
            `Access Denied: User "${data.user.email}" does not have admin privileges in the admin_roles table.`,
          );
        }

        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(ADMIN_ROLE_CACHE_KEY, data.user.id);
        }
        setIsAdminRole(true);
        setAuthError(null);
      } catch (err: unknown) {
        setAuthError(err instanceof Error ? err.message : "Authentication failed.");
        setIsAdminRole(false);
      } finally {
        setCheckingRole(false);
        setAuthLoading(false);
      }
    } else {
      setAuthLoading(false);
      setAuthError("Supabase credentials are not configured. Please check environment variables.");
    }
  };

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ADMIN_ROLE_CACHE_KEY);
    }
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    setSessionUser(null);
    setIsAdminRole(false);
  };

  // Load Data
  const loadAllData = async () => {
    setLoadingData(true);
    try {
      await syncCatalogToSupabase().catch(() => {});
      const [ordRes, prodRes, catRes, shipRes, storeRes] = await Promise.all([
        getOrders().catch((err) => {
          console.warn("Orders fetch warning:", err);
          return [];
        }),
        getProducts(false).catch((err) => {
          console.warn("Products fetch warning:", err);
          return [];
        }),
        getCategories().catch((err) => {
          console.warn("Categories fetch warning:", err);
          return [];
        }),
        getShippingSettings().catch((err) => {
          console.warn("Shipping settings fetch warning:", err);
          return null;
        }),
        getStoreSettings().catch((err) => {
          console.warn("Store settings fetch warning:", err);
          return null;
        }),
      ]);
      setOrders(ordRes);
      setProducts(prodRes);
      setCategories(catRes);
      if (shipRes) setShippingSettings(shipRes);
      if (storeRes) setStoreSettings(storeRes);
    } catch (err) {
      console.warn("Error loading admin data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (sessionUser && isAdminRole) {
      loadAllData();
    }
  }, [sessionUser, isAdminRole]);

  // Metrics
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (acc, o) =>
        acc + (o.payment_status === "paid" || o.order_status !== "cancelled" ? o.total_amount : 0),
      0,
    );
    const pendingOrders = orders.filter((o) => o.order_status === "pending").length;
    const confirmedOrders = orders.filter((o) => o.order_status === "confirmed").length;
    const shippedOrders = orders.filter((o) => o.order_status === "shipped").length;
    const deliveredOrders = orders.filter((o) => o.order_status === "delivered").length;
    const cancelledOrders = orders.filter((o) => o.order_status === "cancelled").length;

    const totalProducts = products.length;
    const lowStock = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= 10).length;
    const outOfStock = products.filter((p) => p.stock_quantity <= 0).length;

    // Daily revenue last 7 days sorted chronologically
    const sortedOrders = [...orders].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const revenueByDay: Record<string, number> = {};
    sortedOrders.forEach((o) => {
      if (o.order_status === "cancelled") return;
      const day = new Date(o.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      revenueByDay[day] = (revenueByDay[day] || 0) + o.total_amount;
    });

    const chartData = Object.entries(revenueByDay)
      .slice(-7)
      .map(([date, revenue]) => ({ date, revenue }));

    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalProducts,
      lowStock,
      outOfStock,
      chartData,
    };
  }, [orders, products]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = orderStatusFilter === "all" || o.order_status === orderStatusFilter;
      const q = orderSearchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [orders, orderStatusFilter, orderSearchQuery]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = productSearchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)),
    );
  }, [products, productSearchQuery]);

  // Product edit modal handler
  const handleOpenEditProduct = (prod?: DBProduct) => {
    if (prod) {
      setEditingProduct({ ...prod });
      let currentImgs =
        prod.images
          ?.map((i, idx) => ({
            image_url: resolveProductImageUrl(i.image_url, prod.slug),
            is_primary: i.is_primary || idx === 0,
            alt_text: i.alt_text,
          }))
          .filter((i) => Boolean(i.image_url)) || [];

      // Ensure exactly one primary image is at index 0
      const primaryIdx = currentImgs.findIndex((i) => i.is_primary);
      if (primaryIdx > 0) {
        const [primaryItem] = currentImgs.splice(primaryIdx, 1);
        if (primaryItem) currentImgs.unshift(primaryItem);
      }
      currentImgs = currentImgs.map((img, idx) => ({
        ...img,
        is_primary: idx === 0,
      }));

      if (currentImgs.length === 0) {
        const fb = fallbackCatalog.find((s) => s.slug === prod.slug);
        if (fb?.image) {
          currentImgs = [
            {
              image_url: resolveProductImageUrl(fb.image, prod.slug),
              is_primary: true,
              alt_text: fb.name,
            },
          ];
        }
      }
      setProductImages(currentImgs);
      setProductVideos(
        prod.videos?.map((v) => ({
          video_url: v.video_url,
          title: v.title,
          thumbnail_url: v.thumbnail_url || undefined,
        })) || [],
      );
      setProductSections(
        prod.sections?.map((s) => ({
          title: s.title,
          content: s.content,
          section_type: s.section_type,
        })) || [],
      );
    } else {
      setEditingProduct({
        name: "",
        brand: "",
        type: "Face & eye cream",
        size: "50 ml",
        regular_price: 3000,
        sale_price: 2199,
        stock_quantity: 40,
        tag: "Seoul Ritual",
        concern: "Radiance",
        short_description: "",
        full_description: "",
        category_id: categories[0]?.id || "c1111111-1111-4111-8111-111111111111",
        is_published: true,
        is_featured: false,
      });
      setProductImages([]);
      setProductVideos([]);
      setProductSections([
        {
          title: "Highlighted ingredients",
          content: "Vitamin C, Niacinamide, Centella",
          section_type: "ingredients",
        },
        {
          title: "How to use",
          content: "Apply daily onto clean skin before moisturizer.",
          section_type: "usage",
        },
        {
          title: "Before you begin",
          content: "Patch test recommended. Store in a cool, dry place.",
          section_type: "precautions",
        },
      ]);
    }
  };

  const handleSaveProduct = async () => {
    if (!editingProduct?.name || !editingProduct?.brand) {
      showNotice("Product title and brand name are required.", "error");
      return;
    }
    setIsSavingProduct(true);
    try {
      const normalizedImgs = productImages.map((img, idx) => ({
        ...img,
        image_url: resolveProductImageUrl(img.image_url, editingProduct.slug),
        is_primary: idx === 0,
      }));
      await saveProduct(
        editingProduct as DBProduct,
        normalizedImgs,
        productVideos,
        productSections,
      );
      await loadAllData();
      setEditingProduct(null);
      showNotice("Product details & pictures saved and published to storefront!");
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to save product.", "error");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    try {
      await deleteProduct(id);
      await loadAllData();
      showNotice(`Removed "${name}" from storefront catalog.`);
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to delete product.", "error");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, replaceMain = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const res = await uploadMediaFile(file, "products");
      if (res.url) {
        setProductImages((prev) => {
          if (replaceMain && prev.length > 0) {
            const rest = prev.slice(1).map((img) => ({ ...img, is_primary: false }));
            return [{ image_url: res.url, is_primary: true }, ...rest];
          }
          return [
            { image_url: res.url, is_primary: true },
            ...prev.map((img) => ({ ...img, is_primary: false })),
          ];
        });
        showNotice("Picture uploaded! Click 'Save Product & Update Storefront' to publish.");
      } else if (res.error) {
        showNotice(`Failed to upload image: ${res.error}`, "error");
      }
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : "Failed to upload image", "error");
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleAddImageUrl = () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;
    setProductImages((prev) => [
      { image_url: trimmed, is_primary: true },
      ...prev.map((img) => ({ ...img, is_primary: false })),
    ]);
    setNewImageUrl("");
    showNotice("Image URL added as primary picture.");
  };

  const handleRemoveImage = (index: number) => {
    setProductImages((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((img, i) => ({
        ...img,
        is_primary: i === 0,
      }));
    });
  };

  const handleSetPrimaryImage = (index: number) => {
    setProductImages((prev) => {
      const target = prev[index];
      if (!target) return prev;
      const rest = prev.filter((_, i) => i !== index);
      return [
        { ...target, is_primary: true },
        ...rest.map((img) => ({ ...img, is_primary: false })),
      ];
    });
  };

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    try {
      await deleteOrder(orderId);
      await loadAllData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
      showNotice(`Order ${orderNumber} deleted.`);
    } catch {
      showNotice("Failed to delete order.", "error");
    }
  };

  const handleClearDemoOrders = async () => {
    try {
      const removed = await clearAllDemoOrders();
      await loadAllData();
      showNotice(
        removed > 0
          ? `Successfully removed ${removed} demo orders.`
          : "All current orders are genuine customer orders.",
      );
    } catch {
      showNotice("Failed to clear demo orders.", "error");
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;
    setIsUploadingVideo(true);
    try {
      const res = await uploadMediaFile(file, "videos");
      if (res.url) {
        const chosenTitle =
          newVideoTitle.trim() ||
          `${editingProduct?.name || "Product"} — Application & Ritual Guide`;
        setProductVideos((prev) => [
          ...prev,
          {
            video_url: res.url,
            title: chosenTitle,
          },
        ]);
        setNewVideoTitle("");
        showNotice("Video uploaded! Click 'Save Product & Update Storefront' to publish.");
      } else if (res.error) {
        showNotice(`Failed to upload video: ${res.error}`, "error");
      }
    } finally {
      setIsUploadingVideo(false);
      e.target.value = "";
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setIsSavingCategory(true);
    try {
      await saveCategory({
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim(),
        display_order: categories.length + 1,
      });
      setNewCategoryName("");
      setNewCategoryDesc("");
      await loadAllData();
      showNotice("Category saved!");
    } catch {
      showNotice("Failed to save category.", "error");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleRemoveCategory = async (id: string, name: string) => {
    try {
      await deleteCategory(id);
      await loadAllData();
      showNotice(`Category "${name}" removed.`);
    } catch {
      showNotice("Failed to remove category.", "error");
    }
  };

  // CSV Export for Orders
  const handleExportCSV = () => {
    if (orders.length === 0) return;
    const headers = [
      "Order Number",
      "Date",
      "Customer Name",
      "Phone",
      "City",
      "Province",
      "Address",
      "Subtotal",
      "Delivery Fee",
      "Total Amount",
      "Payment Status",
      "Order Status",
    ];
    const rows = orders.map((o) => [
      o.order_number,
      o.created_at,
      `"${o.customer_name.replace(/"/g, '""')}"`,
      `"${o.customer_phone}"`,
      `"${o.city}"`,
      `"${o.province}"`,
      `"${o.delivery_address.replace(/"/g, '""')}"`,
      o.subtotal,
      o.delivery_fee,
      o.total_amount,
      o.payment_status,
      o.order_status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `KoreanSkinCare_Orders_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---------------------------------------------------------------------------
  // LOADING SCREEN WHILE CHECKING EXISTING SESSION
  // ---------------------------------------------------------------------------
  if (initializingAuth || checkingRole) {
    return (
      <div className="min-h-screen bg-secondary/30 flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-md w-full bg-card border rounded-xl p-8 shadow-sm text-center space-y-4">
          <Loader2 size={28} className="animate-spin mx-auto text-primary" />
          <div className="space-y-1">
            <h2 className="font-serif text-lg font-semibold">KoreanSkinCare Admin Portal</h2>
            <p className="text-xs text-muted-foreground">
              Verifying administrator session & permissions...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATION SCREEN IF NOT LOGGED IN OR NOT ADMIN
  // ---------------------------------------------------------------------------
  if (!sessionUser || !isAdminRole) {
    return (
      <div className="min-h-screen bg-secondary/30 flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-md w-full bg-card border rounded-xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <Link to="/" className="brand block mb-2">
              KoreanSkinCare<small>ADMIN CONSOLE</small>
            </Link>
            <p className="text-xs text-muted-foreground">
              Sign in with your authorized store credentials to manage products, inventory, and Cash
              on Delivery orders.
            </p>
          </div>

          {/* Supabase Status Indicator */}
          <div className="mb-6 p-3 rounded-lg border text-xs flex items-center justify-between bg-secondary/40">
            <div className="flex items-center gap-2">
              <Database
                size={15}
                className={isSupabaseConfigured() ? "text-emerald-600" : "text-amber-600"}
              />
              <span className="font-medium">
                {isSupabaseConfigured() ? "Supabase Live Connected" : "Supabase: Unconfigured"}
              </span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                isSupabaseConfigured()
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {isSupabaseConfigured() ? "PRODUCTION" : "UNCONFIGURED"}
            </span>
          </div>

          {authError && (
            <div className="mb-6 p-3 rounded bg-destructive/10 text-destructive text-xs flex items-start gap-2">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold block mb-0.5">Authentication Error</span>
                <span>{authError}</span>
              </div>
            </div>
          )}

          {sessionUser && !isAdminRole ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs">
                <p className="font-semibold text-amber-900 mb-1">Account Lacks Admin Role</p>
                <p className="text-[11px] text-muted-foreground mb-3">
                  You are signed in as <strong>{sessionUser}</strong>, but this user ID is not
                  registered with <code>role = 'admin'</code> in the <code>admin_roles</code>{" "}
                  database table.
                </p>
                <p className="text-[11px] text-muted-foreground mb-1 font-medium">
                  To grant access in Supabase SQL Editor:
                </p>
                <div className="bg-background p-2 rounded border font-mono text-[10px] select-all">
                  INSERT INTO admin_roles (user_id, role)
                  <br />
                  VALUES ((SELECT id FROM auth.users WHERE email = '{sessionUser}'), 'admin')
                  <br />
                  ON CONFLICT (user_id) DO NOTHING;
                </div>
              </div>
              <Button variant="outline" onClick={handleLogout} className="w-full text-xs py-5">
                Sign Out & Return to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="admin@koreanskincare.pk"
                  className="w-full px-3.5 py-2.5 text-xs bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 text-xs bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <Button
                type="submit"
                disabled={authLoading}
                className="w-full py-5 text-xs font-semibold tracking-wider"
              >
                {authLoading ? "Authenticating with Supabase..." : "Sign In to Admin Console"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"
            >
              ← Return to KoreanSkinCare Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN ADMIN CONSOLE LAYOUT
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-secondary/20 flex flex-col md:flex-row">
      {/* Mobile Header Bar */}
      <div className="md:hidden bg-card border-b px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link to="/" className="brand text-xl">
          KoreanSkinCare
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-30 h-screen w-64 bg-card border-r flex flex-col justify-between transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div>
          <div className="p-6 border-b">
            <Link to="/" className="brand block text-xl">
              KoreanSkinCare<small>ADMIN PORTAL</small>
            </Link>
            <div className="mt-3 flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${isSupabaseConfigured() ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              <span className="text-[10px] text-muted-foreground truncate">
                {isSupabaseConfigured() ? "Supabase Live" : "Demo Fallback Active"}
              </span>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "orders", label: "Orders", icon: ShoppingBag, count: metrics.pendingOrders },
              {
                id: "products",
                label: "Products Catalog",
                icon: Package,
                count: metrics.lowStock > 0 ? metrics.lowStock : undefined,
              },
              { id: "categories", label: "Categories", icon: Tags },
              { id: "shipping", label: "Shipping (Rs. 250)", icon: Truck },
              { id: "settings", label: "Store Settings", icon: Settings },
            ].map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => {
                  setActiveTab(id as TabType);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} />
                  <span>{label}</span>
                </div>
                {count !== undefined && count > 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeTab === id
                        ? "bg-primary-foreground text-primary"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t space-y-3">
          <div className="text-[11px] text-muted-foreground truncate px-1">
            Signed in: <strong className="text-foreground block truncate">{sessionUser}</strong>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="w-full text-xs">
              <Link to="/" target="_blank">
                <ExternalLink size={12} className="mr-1" /> View Store
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-xs text-destructive hover:bg-destructive/10"
            >
              <LogOut size={14} />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-6 md:p-10 overflow-y-auto">
        {adminNotice && (
          <div
            className={`mb-6 p-3.5 rounded-lg border text-xs flex items-center justify-between shadow-sm ${
              adminNotice.type === "error"
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-900"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {adminNotice.type === "error" ? (
                <AlertCircle size={15} className="flex-shrink-0" />
              ) : (
                <CheckCircle2 size={15} className="flex-shrink-0 text-emerald-600" />
              )}
              <span>{adminNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setAdminNotice(null)}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Top bar with Refresh */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-serif capitalize">
              {activeTab === "dashboard" ? "Store Overview" : activeTab}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              KoreanSkinCare Real-Time Administrative Controls
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAllData}
              disabled={loadingData}
              className="text-xs"
            >
              <RefreshCw size={13} className={`mr-1.5 ${loadingData ? "animate-spin" : ""}`} />
              Refresh Data
            </Button>
            {activeTab === "products" && (
              <Button size="sm" onClick={() => handleOpenEditProduct()} className="text-xs">
                <Plus size={14} className="mr-1.5" /> Add Product
              </Button>
            )}
            {activeTab === "orders" && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearDemoOrders}
                  className="text-xs text-muted-foreground hover:text-destructive border-dashed"
                  title="Remove all fake / demo seed orders"
                >
                  <Trash2 size={13} className="mr-1.5 text-destructive" /> Clean Fake Orders
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs">
                  <Download size={14} className="mr-1.5" /> Export CSV
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* 1. DASHBOARD TAB */}
        {/* =================================================================== */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border rounded-xl p-5 shadow-sm">
                <span className="eyebrow text-muted-foreground text-[10px]">TOTAL REVENUE</span>
                <div className="font-serif text-2xl font-bold mt-2 text-primary">
                  {formatPrice(metrics.totalRevenue)}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Across {metrics.totalOrders} total orders
                </span>
              </div>

              <div className="bg-card border rounded-xl p-5 shadow-sm">
                <span className="eyebrow text-muted-foreground text-[10px]">
                  PENDING COD ORDERS
                </span>
                <div className="font-serif text-2xl font-bold mt-2 text-amber-600">
                  {metrics.pendingOrders}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Awaiting dispatch confirmation
                </span>
              </div>

              <div className="bg-card border rounded-xl p-5 shadow-sm">
                <span className="eyebrow text-muted-foreground text-[10px]">DELIVERED ORDERS</span>
                <div className="font-serif text-2xl font-bold mt-2 text-emerald-600">
                  {metrics.deliveredOrders}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Successfully completed
                </span>
              </div>

              <div className="bg-card border rounded-xl p-5 shadow-sm">
                <span className="eyebrow text-muted-foreground text-[10px]">INVENTORY ALERTS</span>
                <div className="font-serif text-2xl font-bold mt-2 text-rose-600">
                  {metrics.lowStock + metrics.outOfStock}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  {metrics.outOfStock} out of stock · {metrics.lowStock} low stock
                </span>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-card border rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-serif text-base font-semibold">Sales Trend (PKR)</h3>
                    <p className="text-xs text-muted-foreground">Recent order activity</p>
                  </div>
                  <span className="text-xs font-semibold text-primary">
                    Flat Rs. 250 Delivery Active
                  </span>
                </div>
                <div className="h-64">
                  {metrics.chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics.chartData}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#92400e" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#92400e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#92400e"
                          fillOpacity={1}
                          fill="url(#colorRev)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                      Place orders in storefront to populate revenue trend chart
                    </div>
                  )}
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="lg:col-span-4 bg-card border rounded-xl p-6 shadow-sm">
                <h3 className="font-serif text-base font-semibold mb-4">Orders by Status</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b">
                    <span className="flex items-center gap-2">
                      <Clock size={14} className="text-amber-500" /> Pending
                    </span>
                    <span className="font-bold">{metrics.pendingOrders}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-blue-500" /> Confirmed
                    </span>
                    <span className="font-bold">{metrics.confirmedOrders}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b">
                    <span className="flex items-center gap-2">
                      <Truck size={14} className="text-purple-500" /> Shipped
                    </span>
                    <span className="font-bold">{metrics.shippedOrders}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Delivered
                    </span>
                    <span className="font-bold">{metrics.deliveredOrders}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="flex items-center gap-2">
                      <X size={14} className="text-rose-500" /> Cancelled
                    </span>
                    <span className="font-bold">{metrics.cancelledOrders}</span>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setActiveTab("orders")}
                  >
                    Manage All Orders ({orders.length}) <ChevronRight size={14} className="ml-1" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Recent Orders Preview */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-serif text-base font-semibold">
                  Latest Cash on Delivery Orders
                </h3>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setActiveTab("orders")}
                  className="text-xs"
                >
                  View Full Orders List →
                </Button>
              </div>

              {orders.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">
                  No orders recorded yet. Place a test order via the storefront cart.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-2.5">ORDER #</th>
                        <th className="py-2.5">CUSTOMER</th>
                        <th className="py-2.5">CITY</th>
                        <th className="py-2.5">TOTAL</th>
                        <th className="py-2.5">STATUS</th>
                        <th className="py-2.5 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {orders.slice(0, 5).map((ord) => (
                        <tr key={ord.id} className="hover:bg-secondary/20">
                          <td className="py-3 font-mono font-medium">{ord.order_number}</td>
                          <td className="py-3">{ord.customer_name}</td>
                          <td className="py-3">{ord.city}</td>
                          <td className="py-3 font-semibold">{formatPrice(ord.total_amount)}</td>
                          <td className="py-3">
                            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                              {ord.order_status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedOrder(ord)}
                              className="h-7 text-xs"
                            >
                              Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 2. ORDERS MANAGEMENT TAB */}
        {/* =================================================================== */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-card border rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                <Search size={15} className="text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search order #, customer name, phone, or city..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full text-xs bg-transparent focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Filter:</span>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="text-xs bg-secondary/50 border rounded px-2.5 py-1.5 focus:outline-none"
                >
                  <option value="all">All Statuses ({orders.length})</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="returned">Returned</option>
                </select>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              {filteredOrders.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
                  <p className="font-medium text-foreground">
                    {orders.length === 0
                      ? "No real customer orders placed yet."
                      : "No orders match your filter criteria."}
                  </p>
                  <p>
                    {orders.length === 0
                      ? "Fake and demo seed orders have been removed. When real shoppers place an order via the checkout, it will be listed here automatically."
                      : "Try resetting status filter or search query."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-secondary/40 border-b text-muted-foreground">
                      <tr>
                        <th className="py-3 px-4">ORDER NUMBER</th>
                        <th className="py-3 px-4">DATE</th>
                        <th className="py-3 px-4">CUSTOMER</th>
                        <th className="py-3 px-4">CONTACT</th>
                        <th className="py-3 px-4">CITY</th>
                        <th className="py-3 px-4">ITEMS</th>
                        <th className="py-3 px-4">TOTAL</th>
                        <th className="py-3 px-4">PAYMENT</th>
                        <th className="py-3 px-4">STATUS</th>
                        <th className="py-3 px-4 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-secondary/20">
                          <td className="py-3.5 px-4 font-mono font-bold text-primary">
                            {ord.order_number}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {new Date(ord.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="py-3.5 px-4 font-medium">{ord.customer_name}</td>
                          <td className="py-3.5 px-4">{ord.customer_phone}</td>
                          <td className="py-3.5 px-4">{ord.city}</td>
                          <td className="py-3.5 px-4">
                            {ord.items?.reduce((a, b) => a + b.quantity, 0) || 1} pcs
                          </td>
                          <td className="py-3.5 px-4 font-semibold">
                            {formatPrice(ord.total_amount)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                ord.payment_status === "paid"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              COD: {ord.payment_status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-secondary">
                              {ord.order_status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedOrder(ord);
                                setShowInvoice(false);
                              }}
                              className="h-7 text-xs"
                            >
                              Manage
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedOrder(ord);
                                setShowInvoice(true);
                              }}
                              className="h-7 text-xs"
                              title="Print Invoice"
                            >
                              <Printer size={13} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteOrder(ord.id, ord.order_number)}
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              title="Delete Order"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 3. PRODUCTS MANAGEMENT TAB */}
        {/* =================================================================== */}
        {activeTab === "products" && (
          <div className="space-y-6">
            <div className="bg-card border rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                <Search size={15} className="text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search products by title, brand, slug, or SKU..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full text-xs bg-transparent focus:outline-none"
                />
              </div>
              <span className="text-xs text-muted-foreground">
                Showing {filteredProducts.length} products
              </span>
            </div>

            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/40 border-b text-muted-foreground">
                    <tr>
                      <th className="py-3 px-4">IMAGE</th>
                      <th className="py-3 px-4">PRODUCT NAME</th>
                      <th className="py-3 px-4">BRAND</th>
                      <th className="py-3 px-4">REGULAR (PKR)</th>
                      <th className="py-3 px-4">SALE PRICE (PKR)</th>
                      <th className="py-3 px-4">STOCK</th>
                      <th className="py-3 px-4">STATUS</th>
                      <th className="py-3 px-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredProducts.map((prod) => {
                      const rawImg =
                        prod.images?.find((i) => i.is_primary)?.image_url ||
                        prod.images?.[0]?.image_url ||
                        fallbackCatalog.find((s) => s.slug === prod.slug)?.image ||
                        "";
                      const img = resolveProductImageUrl(rawImg, prod.slug);
                      return (
                        <tr key={prod.id} className="hover:bg-secondary/20">
                          <td className="py-3 px-4">
                            <div className="w-10 h-12 bg-background border rounded overflow-hidden">
                              <img
                                src={img}
                                alt={prod.name}
                                className="w-full h-full object-contain p-0.5"
                                onError={(e) => {
                                  const fb = resolveProductImageUrl(undefined, prod.slug);
                                  if (fb && e.currentTarget.src !== fb) {
                                    e.currentTarget.src = fb;
                                  }
                                }}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-foreground block">{prod.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {prod.type} · {prod.size}
                            </span>
                          </td>
                          <td className="py-3 px-4">{prod.brand}</td>
                          <td className="py-3 px-4 text-muted-foreground line-through">
                            {formatPrice(prod.regular_price)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-primary">
                            {formatPrice(prod.sale_price)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                prod.stock_quantity <= 0
                                  ? "bg-red-100 text-red-800"
                                  : prod.stock_quantity <= 10
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {prod.stock_quantity} in stock
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded ${prod.is_published ? "bg-secondary text-foreground" : "bg-muted text-muted-foreground"}`}
                            >
                              {prod.is_published ? "Published" : "Draft"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEditProduct(prod)}
                              className="h-7 text-xs"
                            >
                              <Edit size={13} className="mr-1" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteProduct(prod.id, prod.name)}
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 4. CATEGORIES TAB */}
        {/* =================================================================== */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="font-serif text-lg font-semibold">Categories & Taxonomy</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Organize storefront products into targeted skincare categories.
                </p>
              </div>

              <form
                onSubmit={handleAddCategory}
                className="grid sm:grid-cols-3 gap-3 p-4 rounded-lg bg-secondary/20 border text-xs"
              >
                <input
                  type="text"
                  required
                  placeholder="New Category Name (e.g. Sunscreens)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="px-3 py-2 bg-background border rounded-md"
                />
                <input
                  type="text"
                  placeholder="Short description (optional)"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  className="px-3 py-2 bg-background border rounded-md"
                />
                <Button type="submit" size="sm" disabled={isSavingCategory} className="h-9 text-xs">
                  <Plus size={14} className="mr-1" />{" "}
                  {isSavingCategory ? "Saving..." : "Add Category"}
                </Button>
              </form>

              <div className="space-y-3">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex justify-between items-center p-3 border rounded-lg bg-secondary/20"
                  >
                    <div>
                      <strong className="text-xs font-semibold">{cat.name}</strong>
                      <span className="text-[10px] text-muted-foreground block font-mono">
                        slug: /{cat.slug}
                        {cat.description ? ` · ${cat.description}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-secondary px-2 py-1 rounded">
                        Order: {cat.display_order}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCategory(cat.id, cat.name)}
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 5. SHIPPING TAB */}
        {/* =================================================================== */}
        {activeTab === "shipping" && shippingSettings && (
          <div className="max-w-2xl bg-card border rounded-xl p-8 shadow-sm space-y-6">
            <h2 className="font-serif text-xl font-semibold">Courier & Delivery Fee Settings</h2>
            <p className="text-xs text-muted-foreground">
              Configure flat delivery rates for all orders across Pakistan with Cash on Delivery.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider mb-2">
                  Flat Delivery Fee (PKR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">Rs.</span>
                  <input
                    type="number"
                    value={shippingSettings.flat_delivery_fee}
                    onChange={(e) =>
                      setShippingSettings({
                        ...shippingSettings,
                        flat_delivery_fee: Number(e.target.value),
                      })
                    }
                    className="w-full pl-10 pr-3 py-2 bg-background border rounded-md"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Currently charged per order (Default: Rs. 250 PKR)
                </span>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="free_deliv"
                    checked={shippingSettings.free_delivery_enabled}
                    onChange={(e) =>
                      setShippingSettings({
                        ...shippingSettings,
                        free_delivery_enabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border"
                  />
                  <label htmlFor="free_deliv" className="font-medium cursor-pointer">
                    Enable Free Delivery Above Threshold
                  </label>
                </div>

                {shippingSettings.free_delivery_enabled && (
                  <div>
                    <label className="block font-semibold uppercase tracking-wider mb-2">
                      Free Delivery Minimum Order Amount (PKR)
                    </label>
                    <input
                      type="number"
                      value={shippingSettings.free_delivery_threshold}
                      onChange={(e) =>
                        setShippingSettings({
                          ...shippingSettings,
                          free_delivery_threshold: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 bg-background border rounded-md"
                    />
                  </div>
                )}
              </div>

              <Button
                onClick={async () => {
                  await updateShippingSettings(shippingSettings);
                  showNotice("Shipping settings successfully saved!");
                }}
                className="mt-4"
              >
                Save Shipping Settings
              </Button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 6. STORE SETTINGS TAB */}
        {/* =================================================================== */}
        {activeTab === "settings" && storeSettings && (
          <div className="max-w-2xl bg-card border rounded-xl p-8 shadow-sm space-y-6">
            <h2 className="font-serif text-xl font-semibold">Store Brand & Policies</h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider mb-1.5">
                  Store Name
                </label>
                <input
                  type="text"
                  value={storeSettings.store_name}
                  onChange={(e) =>
                    setStoreSettings({ ...storeSettings, store_name: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-background border rounded-md"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1.5">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={storeSettings.contact_email}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, contact_email: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-background border rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1.5">
                    WhatsApp Hotline
                  </label>
                  <input
                    type="text"
                    value={storeSettings.whatsapp_number}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, whatsapp_number: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-background border rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider mb-1.5">
                  Top Announcement Bar Message
                </label>
                <input
                  type="text"
                  value={storeSettings.announcement_bar}
                  onChange={(e) =>
                    setStoreSettings({ ...storeSettings, announcement_bar: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-background border rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider mb-1.5">
                  Return & Exchange Policy
                </label>
                <textarea
                  rows={3}
                  value={storeSettings.return_policy || ""}
                  onChange={(e) =>
                    setStoreSettings({ ...storeSettings, return_policy: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-background border rounded-md resize-none"
                />
              </div>

              <Button
                onClick={async () => {
                  await updateStoreSettings(storeSettings);
                  showNotice("Store settings saved!");
                }}
                className="mt-4"
              >
                Save Store Settings
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* ORDER DETAILS MODAL & STATUS UPDATE */}
      {/* =================================================================== */}
      {selectedOrder && !showInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex justify-between items-start pb-4 border-b">
              <div>
                <span className="eyebrow text-muted-foreground text-[10px]">
                  CASH ON DELIVERY ORDER
                </span>
                <h2 className="font-serif text-xl font-bold font-mono text-primary mt-1">
                  {selectedOrder.order_number}
                </h2>
                <span className="text-xs text-muted-foreground">
                  Placed on{" "}
                  {selectedOrder.created_at
                    ? (() => {
                        try {
                          return new Date(selectedOrder.created_at).toLocaleString();
                        } catch {
                          return selectedOrder.created_at;
                        }
                      })()
                    : "Recent"}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(null)}>
                <X size={18} />
              </Button>
            </div>

            {/* Quick Status Changers */}
            <div className="p-4 bg-secondary/40 rounded-lg space-y-3">
              <span className="eyebrow text-muted-foreground text-[9px] block">
                UPDATE DISPATCH STATUS
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  "pending",
                  "confirmed",
                  "processing",
                  "packed",
                  "shipped",
                  "out_for_delivery",
                  "delivered",
                  "cancelled",
                ].map((st) => (
                  <button
                    key={st}
                    onClick={async () => {
                      const updated = await updateOrderStatus(
                        selectedOrder.id,
                        st as DBOrder["order_status"],
                      );
                      setSelectedOrder(updated);
                      await loadAllData();
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      selectedOrder.order_status === st
                        ? "bg-primary text-primary-foreground ring-2 ring-primary"
                        : "bg-background border hover:bg-secondary"
                    }`}
                  >
                    {st.replace(/_/g, " ")}
                  </button>
                ))}
              </div>

              {/* Payment Status Toggle */}
              <div className="pt-3 border-t flex items-center justify-between text-xs">
                <span>Payment Status (Doorstep COD):</span>
                <button
                  onClick={async () => {
                    const newPay = selectedOrder.payment_status === "paid" ? "unpaid" : "paid";
                    await updateOrderPaymentStatus(selectedOrder.id, newPay);
                    setSelectedOrder({ ...selectedOrder, payment_status: newPay });
                    await loadAllData();
                  }}
                  className={`px-3 py-1 rounded font-bold uppercase text-[10px] ${
                    selectedOrder.payment_status === "paid"
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  Mark {selectedOrder.payment_status === "paid" ? "Unpaid" : "Paid"}
                </button>
              </div>
            </div>

            {/* Customer & Address Details */}
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-secondary/20 rounded border space-y-1">
                <span className="eyebrow text-muted-foreground text-[9px] block">
                  Recipient Details
                </span>
                <strong className="block text-sm font-semibold">
                  {selectedOrder.customer_name}
                </strong>
                <span className="block text-muted-foreground">
                  Phone: {selectedOrder.customer_phone}
                </span>
                {selectedOrder.customer_phone && (
                  <a
                    href={`https://wa.me/92${selectedOrder.customer_phone.replace(/^0/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 hover:underline text-[11px] font-semibold mt-1"
                  >
                    Chat on WhatsApp →
                  </a>
                )}
              </div>

              <div className="p-3 bg-secondary/20 rounded border space-y-1">
                <span className="eyebrow text-muted-foreground text-[9px] block">
                  Delivery Destination
                </span>
                <p className="text-muted-foreground">{selectedOrder.delivery_address}</p>
                <strong className="block text-foreground">
                  {selectedOrder.city}, {selectedOrder.province}
                </strong>
                {selectedOrder.order_notes && (
                  <p className="text-[11px] italic text-muted-foreground pt-1 border-t mt-1">
                    Notes: {selectedOrder.order_notes}
                  </p>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="border rounded-lg p-4 space-y-3">
              <span className="eyebrow text-muted-foreground text-[9px] block">Ordered Items</span>
              {selectedOrder.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center text-xs py-1 border-b last:border-0"
                >
                  <div>
                    <span className="font-medium">{item.product_name}</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Qty: {item.quantity} · {formatPrice(item.unit_price)} each
                    </span>
                  </div>
                  <span className="font-semibold">{formatPrice(item.total_price)}</span>
                </div>
              ))}

              <div className="pt-2 text-xs space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Fee:</span>
                  <span>{formatPrice(selectedOrder.delivery_fee)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-2 border-t">
                  <span>Total Payable:</span>
                  <span className="text-primary">{formatPrice(selectedOrder.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Internal Admin Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                Internal Operational Notes
              </label>
              <textarea
                rows={2}
                defaultValue={selectedOrder.internal_notes || ""}
                onBlur={async (e) => {
                  await updateOrderInternalNotes(selectedOrder.id, e.target.value);
                }}
                placeholder="Rider assignment, package tracking code, etc..."
                className="w-full px-3 py-2 text-xs bg-background border rounded-md"
              />
            </div>

            <div className="flex flex-wrap gap-2 justify-between items-center pt-4 border-t">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowInvoice(true)}>
                  <Printer size={14} className="mr-1.5" /> View Printable Invoice
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteOrder(selectedOrder.id, selectedOrder.order_number)}
                  className="text-destructive hover:bg-destructive/10 text-xs"
                >
                  <Trash2 size={14} className="mr-1.5" /> Delete Order
                </Button>
              </div>
              <Button size="sm" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PRINTABLE INVOICE VIEW */}
      {/* =================================================================== */}
      {selectedOrder && showInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white text-black max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 rounded-lg space-y-6 shadow-2xl">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h1 className="text-2xl font-serif font-bold">KoreanSkinCare</h1>
                <p className="text-xs text-gray-500">
                  Official Korean Skincare Importers · Lahore, Pakistan
                </p>
                <p className="text-xs text-gray-500">WhatsApp: 03144706515</p>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-bold uppercase tracking-wider">
                  CASH ON DELIVERY INVOICE
                </h2>
                <p className="text-xs font-mono font-bold mt-1">{selectedOrder.order_number}</p>
                <p className="text-xs text-gray-500">
                  {new Date(selectedOrder.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs border-b pb-4">
              <div>
                <strong className="block text-gray-700 uppercase tracking-wider text-[10px]">
                  DELIVERY TO:
                </strong>
                <p className="font-bold text-sm">{selectedOrder.customer_name}</p>
                <p>{selectedOrder.delivery_address}</p>
                <p>
                  {selectedOrder.city}, {selectedOrder.province}
                </p>
                <p className="font-semibold mt-1">Phone: {selectedOrder.customer_phone}</p>
              </div>
              <div className="text-right">
                <strong className="block text-gray-700 uppercase tracking-wider text-[10px]">
                  PAYMENT INSTRUCTIONS:
                </strong>
                <p className="text-sm font-bold">CASH ON DELIVERY (PKR)</p>
                <p className="text-gray-600 mt-1">Collect exact amount upon delivery.</p>
                <p className="text-xs font-semibold text-emerald-800 uppercase mt-1">
                  Status: {selectedOrder.payment_status}
                </p>
              </div>
            </div>

            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b font-semibold text-gray-600">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedOrder.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2 font-medium">{item.product_name}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">{formatPrice(item.unit_price)}</td>
                    <td className="py-2 text-right font-semibold">
                      {formatPrice(item.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t pt-4 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatPrice(selectedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Express Courier Delivery</span>
                <span>{formatPrice(selectedOrder.delivery_fee)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
                <span>TOTAL PAYABLE (COD)</span>
                <span className="text-emerald-800">{formatPrice(selectedOrder.total_amount)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t text-xs">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer size={14} className="mr-1.5" /> Print Invoice
              </Button>
              <Button size="sm" onClick={() => setShowInvoice(false)}>
                Back to Order
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PRODUCT ADD / EDIT MODAL */}
      {/* =================================================================== */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border rounded-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b">
              <h2 className="font-serif text-xl font-bold">
                {editingProduct.id
                  ? `Edit "${editingProduct.name}"`
                  : "Create New Skincare Product"}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setEditingProduct(null)}>
                <X size={18} />
              </Button>
            </div>

            {adminNotice && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  adminNotice.type === "error"
                    ? "bg-destructive/10 border-destructive/30 text-destructive"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-900"
                }`}
              >
                <span>{adminNotice.message}</span>
                <button
                  type="button"
                  onClick={() => setAdminNotice(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    placeholder="e.g. Centella Soothing Ampoule"
                    className="w-full px-3 py-2 bg-background border rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.brand || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, brand: e.target.value })
                    }
                    placeholder="e.g. SKIN1004"
                    className="w-full px-3 py-2 bg-background border rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={editingProduct.category_id || categories[0]?.id || ""}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        category_id: e.target.value || null,
                      })
                    }
                    className="w-full px-3 py-2 bg-background border rounded-md"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1">
                    Regular Price (PKR)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.regular_price || 0}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        regular_price: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-background border rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1">
                    Sale Price (PKR) *
                  </label>
                  <input
                    type="number"
                    value={editingProduct.sale_price || 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, sale_price: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-background border rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    value={editingProduct.stock_quantity ?? 50}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        stock_quantity: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-background border rounded-md"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1">Type</label>
                  <input
                    type="text"
                    value={editingProduct.type || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, type: e.target.value })}
                    placeholder="Soothing ampoule"
                    className="w-full px-3 py-2 bg-background border rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1">
                    Size / Volume
                  </label>
                  <input
                    type="text"
                    value={editingProduct.size || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, size: e.target.value })}
                    placeholder="100 ml"
                    className="w-full px-3 py-2 bg-background border rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1">
                    Key Concern
                  </label>
                  <input
                    type="text"
                    value={editingProduct.concern || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, concern: e.target.value })
                    }
                    placeholder="Radiance, Soothing..."
                    className="w-full px-3 py-2 bg-background border rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider mb-1">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  value={editingProduct.short_description || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, short_description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-background border rounded-md resize-none"
                />
              </div>

              {/* Product Images Manager */}
              <div className="border rounded-lg p-4 bg-secondary/20 space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5 text-xs">
                      <ImageIcon size={14} className="text-primary" /> Product Pictures & Gallery
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      The Primary picture is displayed on the storefront catalog, product hero, and
                      related products.
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className={`cursor-pointer inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3.5 py-1.5 rounded text-xs font-medium hover:bg-primary/90 transition shadow-sm ${
                        isUploadingImage ? "opacity-60 pointer-events-none" : ""
                      }`}
                    >
                      {isUploadingImage ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload size={13} />
                          Replace Main Picture
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, true)}
                        disabled={isUploadingImage}
                        className="hidden"
                      />
                    </label>
                    <label
                      className={`cursor-pointer inline-flex items-center gap-1.5 bg-background border text-foreground px-3 py-1.5 rounded text-xs font-medium hover:bg-secondary transition shadow-sm ${
                        isUploadingImage ? "opacity-60 pointer-events-none" : ""
                      }`}
                    >
                      <Plus size={13} />
                      Add Gallery Picture
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, false)}
                        disabled={isUploadingImage}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Direct Image URL input */}
                <div className="flex gap-2 items-center pt-1">
                  <input
                    type="url"
                    placeholder="Or paste external image URL (https://images.unsplash.com/...)"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddImageUrl();
                      }
                    }}
                    className="flex-1 text-xs px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddImageUrl}
                    disabled={!newImageUrl.trim()}
                    className="text-xs h-9"
                  >
                    <Plus size={13} className="mr-1" /> Add URL
                  </Button>
                </div>

                {isUploadingImage && (
                  <div className="text-xs text-primary flex items-center gap-2 p-2 bg-primary/10 rounded">
                    <Loader2 size={13} className="animate-spin" />
                    Uploading and optimizing product picture...
                  </div>
                )}

                {productImages.length === 0 ? (
                  <div className="border border-dashed rounded-lg p-6 text-center text-xs text-muted-foreground bg-background/50">
                    <ImageIcon size={28} className="mx-auto mb-2 opacity-40" />
                    No product pictures yet. Upload a picture from your device or paste a URL above.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-1">
                    {productImages.map((img, idx) => {
                      const isPrimary = idx === 0;
                      const resolvedUrl = resolveProductImageUrl(
                        img.image_url,
                        editingProduct.slug,
                      );
                      return (
                        <div
                          key={idx}
                          className={`relative aspect-[3/4] border rounded-lg bg-background overflow-hidden group shadow-sm transition ${
                            isPrimary
                              ? "ring-2 ring-primary border-primary"
                              : "hover:border-foreground/40"
                          }`}
                        >
                          <img
                            src={resolvedUrl}
                            alt=""
                            className="w-full h-full object-contain p-2"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1 opacity-90 hover:opacity-100 hover:scale-110 transition shadow"
                            title="Remove picture"
                          >
                            <X size={11} />
                          </button>

                          {isPrimary ? (
                            <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                              <Star size={9} fill="currentColor" /> Primary
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(idx)}
                              className="absolute bottom-1.5 inset-x-1.5 bg-black/70 hover:bg-black text-white text-[9px] py-1 rounded transition opacity-90 group-hover:opacity-100 text-center flex items-center justify-center gap-1"
                            >
                              <Star size={9} /> Set Primary
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Product Videos Manager */}
              <div className="border rounded-lg p-4 bg-secondary/20 space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5 text-xs">
                      <Film size={14} className="text-primary" /> Product Demonstration Videos
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Enter the video title below before uploading, or edit any uploaded video title
                      directly.
                    </span>
                  </div>
                </div>

                {/* Video Title Input + Upload Button */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Enter video title (e.g. How to Apply Vitamin C Booster Shot)"
                    value={newVideoTitle}
                    onChange={(e) => setNewVideoTitle(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <label
                    className={`cursor-pointer inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground px-3.5 py-2 rounded text-xs font-medium hover:bg-primary/90 transition shadow-sm whitespace-nowrap ${
                      isUploadingVideo ? "opacity-60 pointer-events-none" : ""
                    }`}
                  >
                    {isUploadingVideo ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Uploading Video...
                      </>
                    ) : (
                      <>
                        <Upload size={13} />
                        Upload MP4/WebM Video
                      </>
                    )}
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      onChange={handleVideoUpload}
                      disabled={isUploadingVideo}
                      className="hidden"
                    />
                  </label>
                </div>

                {productVideos.map((vid, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-3 p-3 bg-background border rounded-md"
                  >
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Video #{idx + 1} Title (Displayed on Product Page)
                      </label>
                      <input
                        type="text"
                        value={vid.title}
                        onChange={(e) => {
                          const updated = [...productVideos];
                          const current = updated[idx];
                          if (current) {
                            updated[idx] = { ...current, title: e.target.value };
                            setProductVideos(updated);
                          }
                        }}
                        placeholder="Enter video title..."
                        className="w-full text-xs px-2.5 py-1.5 bg-secondary/20 border rounded focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                      />
                      <span className="text-[10px] text-muted-foreground truncate block max-w-md">
                        {vid.video_url.startsWith("data:")
                          ? "Uploaded Device Video"
                          : vid.video_url}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setProductVideos(productVideos.filter((_, i) => i !== idx))}
                      className="text-destructive h-8 mt-4"
                      title="Remove video"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Structured Sections */}
              <div className="border rounded-lg p-4 bg-secondary/20 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold uppercase tracking-wider">
                    Structured Detail Accordions
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setProductSections([
                        ...productSections,
                        { title: "New Section", content: "" },
                      ])
                    }
                    className="h-7 text-xs"
                  >
                    + Add Section
                  </Button>
                </div>

                {productSections.map((sec, idx) => (
                  <div key={idx} className="p-3 bg-background border rounded space-y-2">
                    <div className="flex justify-between gap-2">
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) => {
                          const updated = [...productSections];
                          if (updated[idx]) updated[idx].title = e.target.value;
                          setProductSections(updated);
                        }}
                        placeholder="Section title"
                        className="w-full px-2 py-1 font-semibold border rounded text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setProductSections(productSections.filter((_, i) => i !== idx))
                        }
                        className="text-destructive h-7"
                      >
                        <X size={12} />
                      </Button>
                    </div>
                    <textarea
                      rows={2}
                      value={sec.content}
                      onChange={(e) => {
                        const updated = [...productSections];
                        if (updated[idx]) updated[idx].content = e.target.value;
                        setProductSections(updated);
                      }}
                      placeholder="Content text"
                      className="w-full px-2 py-1 border rounded text-xs resize-none"
                    />
                  </div>
                ))}
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="pub_check"
                  checked={editingProduct.is_published ?? true}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, is_published: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="pub_check" className="font-medium cursor-pointer">
                  Publish to Customer-Facing Storefront
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditingProduct(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveProduct} disabled={isSavingProduct}>
                {isSavingProduct ? "Saving Product..." : "Save Product & Update Storefront"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
