
import { ORDER_LINE_ITEMS_QUERY } from "./graphql-query";
import { partitionLineItems, buildCartPermalink } from "./reorder.helpers";
import type { ReorderResult } from "./reorder.helpers";
import { fetchWithRetry } from "./helpers";

const API_VERSION = "2024-10";
const CUSTOMER_ACCOUNT_ENDPOINT = `shopify://customer-account/api/${API_VERSION}/graphql`;

/**
 * Customer Account API se order fetch karke ReorderResult return karta hai
 */
export async function fetchReorderResult(
  orderId: string,
  shopDomain: string,
  excludeTrial: boolean = false,
  excludeVariantIds: string = ""
): Promise<ReorderResult> {
  console.log("[reorder.service] START fetchReorderResult for orderId:", orderId);
  
  const body = JSON.stringify({
    query: ORDER_LINE_ITEMS_QUERY,
    variables: { orderId: orderId }, // Explicitly naming the variable
    // Add a random property to the body to ensure unique request signature
    _cacheBuster: Date.now(),
  });

  console.log("[reorder.service] Request body:", body);

  const response = await fetchWithRetry(CUSTOMER_ACCOUNT_ENDPOINT, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Cache-Control": "no-cache", // Try to prevent caching
    },
    body: body,
  });

  if (!response.ok) {
    console.error("[reorder.service] API Error:", response.status);
    throw new Error(`Customer Account API error: ${response.status}`);
  }

  const json = response.data as any;

  if (json.errors?.length) {
    console.error("[reorder.service] GraphQL errors returned:", json.errors);
    throw new Error(json.errors[0]?.message ?? "GraphQL Error");
  }

  const orderData = json.data?.order;
  if (!orderData) {
    console.error("[reorder.service] Order not found in response for ID:", orderId);
    throw new Error("Order not found or access denied");
  }

  console.log("[reorder.service] Received data for order GID:", orderData.id);
  
  const lineItems = orderData.lineItems?.nodes ?? [];
  console.log("[reorder.service] Item count from API:", lineItems.length);

  if (lineItems.length > 0) {
    console.log("[reorder.service] First item in response:", lineItems[0].name, "(variantId:", lineItems[0].variantId, ")");
  }

  if (!lineItems.length) {
    throw new Error("Order has no line items to reorder");
  }

  const { cartItems, missingItems } = partitionLineItems(lineItems, excludeTrial, excludeVariantIds);
  const redirectUrl = buildCartPermalink(shopDomain, cartItems);
  
  console.log("[reorder.service] Returning redirectUrl:", redirectUrl);
  return { redirectUrl, missingItems };
}
