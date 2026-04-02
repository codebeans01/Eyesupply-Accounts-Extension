import { ORDER_LINE_ITEMS_QUERY } from "./graphql-query";
import { partitionLineItems, buildCartPermalink, CART_CREATE_MUTATION } from "./reorder.helpers";
import type { ReorderResult } from "./reorder.helpers";
import { API_VERSION, fetchWithRetry } from "./helpers";


const CUSTOMER_ACCOUNT_ENDPOINT = `shopify://customer-account/api/${API_VERSION}/graphql.json`;
const STOREFRONT_ENDPOINT = `shopify://storefront/api/2025-04/graphql.json`;

/**
 * Customer Account API se order fetch karke aur Storefront Cart API se 
 * naya cart create karke ReorderResult return karta hai.
 * Yeh method custom attributes ko bhi preserve karta hai.
 */
export async function fetchReorderResult(
  orderId: string,
  shopDomain: string,
  excludeTrial: boolean = false,
  excludeVariantIds: string = ""
): Promise<ReorderResult> {
  console.log("[reorder.service] START fetchReorderResult for orderId:", orderId);
  
  // 1. Fetch Order Line Items using Customer Account API
  const orderBody = JSON.stringify({
    query: ORDER_LINE_ITEMS_QUERY,
    variables: { orderId: orderId },
    _cacheBuster: Date.now(),
  });

  const orderResponse = await fetchWithRetry(CUSTOMER_ACCOUNT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
    body: orderBody,
  });

  if (!orderResponse.ok) {
    throw new Error(`Customer Account API error: ${orderResponse.status}`);
  }

  const orderJson = orderResponse.data as any;
  if (orderJson.errors?.length) {
    throw new Error(orderJson.errors[0]?.message ?? "GraphQL Error (Customer API)");
  }

  const orderData = orderJson.data?.order;
  if (!orderData) {
    throw new Error("Order not found or access denied");
  }

  const orderName = orderData.name;
  const lineItems = orderData.lineItems?.nodes ?? [];
  
  if (!lineItems.length) {
    throw new Error("Order has no line items to reorder");
  }

  // 2. Partition and filter items
  const { cartItems, missingItems } = partitionLineItems(lineItems, excludeTrial, excludeVariantIds);

  if (!cartItems.length) {
    return { redirectUrl: null, missingItems, orderName };
  }

  // 3. Create Cart via Storefront API to preserve attributes
  console.log("[reorder.service] Creating cart with Storefront API for items:", cartItems.length);
  
  const cartInput = {
    lines: cartItems.map(item => ({
      merchandiseId: item.variantId,
      quantity: item.quantity,
      attributes: item.customAttributes.map(attr => ({
        key: attr.key,
        value: attr.value
      }))
    }))
  };

  const cartResponse = await fetchWithRetry(STOREFRONT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: CART_CREATE_MUTATION,
      variables: { input: cartInput }
    }),
  });

  if (!cartResponse.ok) {
    console.warn("[reorder.service] Storefront Cart API failed, falling back to permalink");
    return { 
      redirectUrl: buildCartPermalink(shopDomain, cartItems), 
      missingItems, 
      orderName 
    };
  }

  const cartJson = cartResponse.data as any;
  if (cartJson.errors?.length || cartJson.data?.cartCreate?.userErrors?.length) {
    const errorMsg = cartJson.errors?.[0]?.message || cartJson.data?.cartCreate?.userErrors?.[0]?.message;
    console.warn("[reorder.service] Cart creation error:", errorMsg, "Falling back to permalink");
    return { 
      redirectUrl: buildCartPermalink(shopDomain, cartItems), 
      missingItems, 
      orderName 
    };
  }

  const redirectUrl = cartJson.data.cartCreate.cart.checkoutUrl;
  console.log("[reorder.service] Success! Checkout URL:", redirectUrl);

  return { redirectUrl, missingItems, orderName };
}

