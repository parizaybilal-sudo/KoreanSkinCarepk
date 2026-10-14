import { useState, useEffect } from "react";

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  wasPrice: number;
  size: string;
  type: string;
  quantity: number;
  stock?: number;
}

const CART_STORAGE_KEY = "koreanskincare_cart";
const CART_EVENT = "koreanskincare_cart_updated";

export function getCartItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCartItems(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(CART_EVENT));
  } catch (err) {
    console.error("Failed to save cart items:", err);
  }
}

export function addToCart(item: Omit<CartItem, "quantity">, quantityToAdd = 1): void {
  const current = getCartItems();
  const existingIdx = current.findIndex(
    (i) => i.productId === item.productId || i.slug === item.slug,
  );

  if (existingIdx > -1) {
    const updated = [...current];
    const existing = updated[existingIdx];
    if (existing) {
      existing.quantity += quantityToAdd;
      if (typeof item.stock === "number") {
        existing.stock = item.stock;
      }
      saveCartItems(updated);
    }
  } else {
    saveCartItems([...current, { ...item, quantity: quantityToAdd }]);
  }
}

export function removeFromCart(identifier: string): void {
  const current = getCartItems();
  const filtered = current.filter((i) => i.productId !== identifier && i.slug !== identifier);
  saveCartItems(filtered);
}

export function updateCartQuantity(identifier: string, newQuantity: number): void {
  if (newQuantity <= 0) {
    removeFromCart(identifier);
    return;
  }
  const current = getCartItems();
  const updated = current.map((item) => {
    if (item.productId === identifier || item.slug === identifier) {
      return { ...item, quantity: newQuantity };
    }
    return item;
  });
  saveCartItems(updated);
}

export function clearCart(): void {
  saveCartItems([]);
}

export function getCartSubtotal(items: CartItem[]): number {
  return items.reduce((acc, i) => acc + i.price * i.quantity, 0);
}

export function getCartTotalCount(items: CartItem[]): number {
  return items.reduce((acc, i) => acc + i.quantity, 0);
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(getCartItems());

    const handleUpdate = () => {
      setItems(getCartItems());
    };

    window.addEventListener(CART_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(CART_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const subtotal = getCartSubtotal(items);
  const totalCount = getCartTotalCount(items);

  return {
    items,
    totalCount,
    subtotal,
    addItem: addToCart,
    removeItem: removeFromCart,
    updateQuantity: updateCartQuantity,
    clearCart,
  };
}
