import { CartItem, LineItem, MissingItem } from "./reorder.types";

export function extractNumericId(gid: string): string | null {
  return gid.split("/").pop() ?? null;
}

export function partitionLineItems(lineItems: LineItem[]): {
  cartItems: CartItem[];
  missingItems: MissingItem[];
} {
  const cartItems: CartItem[] = [];
  const missingItems: MissingItem[] = [];

  for (const item of lineItems) {
    const variantGid = item.variant?.id;

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

export function buildCartPermalink(shopDomain: string, cartItems: CartItem[]): string | null {
  if (!cartItems.length) return null;

  const segments = cartItems.map((item) => `${item.numericVariantId}:${item.quantity}`);
  return `https://${shopDomain}/cart/${segments.join(",")}`;
}

export function extractShopDomain(request: Request, dest: string): string {
  const fromHeader = request.headers.get("x-shop-domain");
  const fromDest = dest.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (fromHeader || fromDest).trim();
}
