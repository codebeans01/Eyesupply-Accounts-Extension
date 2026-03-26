export interface CartItem {
  numericVariantId: string;
  quantity: number;
  customAttributes: { key: string; value: string }[];
}

export interface MissingItem {
  name: string;
  image?: string;
}

export interface ReorderResult {
  redirectUrl: string | null;
  missingItems: MissingItem[];
}

interface LineItem {
  id: string;
  title: string;
  name: string;
  quantity: number;
  image?: { url: string };
  customAttributes: { key: string; value: string }[];
  variantId?: string | null;   // ✅ Direct — already GID format
  productId?: string | null;   // nullable — deleted product pe null hoga
}



/**
 * GID se numeric ID extract karta hai
 * "gid://shopify/ProductVariant/123" → "123"
 */
export function extractNumericId(gid: string): string | null {
  return gid.split("/").pop() ?? null;
}

/**
 * Line items ko cartItems aur missingItems mein split karta hai
 */
export function partitionLineItems(lineItems: LineItem[]): {
  cartItems: CartItem[];
  missingItems: MissingItem[];
} {
  const cartItems: CartItem[] = [];
  const missingItems: MissingItem[] = [];

  for (const item of lineItems) {
    // ✅ variantId directly available — no nesting
    const variantGid = item.variantId;

    if (!variantGid) {
      missingItems.push({
        name: item.name || item.title || "Unknown Product",
        image: item.image?.url,
      });
      continue;
    }

    const numericVariantId = extractNumericId(variantGid);
    if (!numericVariantId) continue;

    cartItems.push({
      numericVariantId,
      quantity: item.quantity,
      customAttributes: item.customAttributes ?? [],
    });
  }

  return { cartItems, missingItems };
}



/**
 * Cart permalink banata hai — customAttributes support nahi
 * Format: /cart/VAR1:QTY1,VAR2:QTY2
 */
export function buildCartPermalink(shopDomain: string, cartItems: CartItem[]): string | null {
  if (!cartItems.length) return null;
  const segments = cartItems.map((i) => `${i.numericVariantId}:${i.quantity}`);
  return `https://${shopDomain}/cart/${segments.join(",")}`;
}
