import { describe, expect, it } from "vitest";

import { discountPercent, formatPrice, products } from "@/lib/products";

// Prices are set by the store owner; the now price must stay exactly as agreed
// and every item must read as 30% off its original price.
describe("Catalog pricing", () => {
  it("shows the agreed now price for each of the five products", () => {
    const bySlug = Object.fromEntries(products.map((p) => [p.slug, p.price]));

    expect(products).toHaveLength(5);
    expect(bySlug).toEqual({
      "arencia-vitamin-c": 1999,
      "medicube-collagen-mask": 2299,
      "skin1004-centella": 2199,
      "simplist-glycolic-toner": 2099,
      "laneige-water-mask": 2499,
    });
  });

  it("marks every product as 30% off its original price", () => {
    for (const product of products) {
      expect(product.wasPrice).toBeGreaterThan(product.price);
      expect(discountPercent(product)).toBe(30);
    }
  });

  it("formats prices in rupees with a thousands separator", () => {
    expect(formatPrice(1999)).toBe("Rs. 1,999");
    expect(formatPrice(2499)).toBe("Rs. 2,499");
  });
});
