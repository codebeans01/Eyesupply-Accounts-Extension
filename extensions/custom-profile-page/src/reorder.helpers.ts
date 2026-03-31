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
  orderName?: string;
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
  sku?: string | null;
  productType?: string | null;
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
export function partitionLineItems(
  lineItems: LineItem[], 
  excludeTrial: boolean = false,
  excludeVariantIds: string = ""
): {
  cartItems: CartItem[];
  missingItems: MissingItem[];
} {
  const cartItems: CartItem[] = [];
  const missingItems: MissingItem[] = [];

  // Parse excluded variant IDs into an array for easy lookup
  const excludedIds = excludeVariantIds 
    ? excludeVariantIds.split(',').map(id => id.trim()).filter(id => id) 
    : [];

  for (const item of lineItems) {
    // Basic variant info
    const variantGid = item.variantId;
    const numericVariantId = variantGid ? extractNumericId(variantGid) : null;

    // Trial Pack / Specific ID Exclude Logic
    if (excludeTrial) {
      const name = (item.name || item.title || "").toLowerCase();
      const sku = (item.sku || "").toLowerCase();
      const type = (item.productType || "").toLowerCase();

      const isTrial = 
        name.includes("trial pack") || 
        sku.includes("trial") || 
        type.includes("trial");

      // Check if this specific variant ID is in the exclusion list
      const isSpecificExcluded = !!(numericVariantId && excludedIds.includes(numericVariantId));

      if (isTrial || isSpecificExcluded) {
        console.log(`[reorder.helpers] Excluding item: ${item.name || item.title} (Reason: ${isTrial ? 'Trial' : 'Specific ID'})`);
        continue;
      }
    }

    // ✅ variantId directly available — no nesting
    if (!variantGid) {
      missingItems.push({
        name: item.name || item.title || "Unknown Product",
        image: item.image?.url,
      });
      continue;
    }

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
