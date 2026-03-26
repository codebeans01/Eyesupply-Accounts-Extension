
import { ORDER_LINE_ITEMS_QUERY } from "./graphql-query";
import { partitionLineItems, buildCartPermalink } from "./reorder.helpers";
import type { ReorderResult } from "./reorder.helpers";

const API_VERSION = "2024-10";
const CUSTOMER_ACCOUNT_ENDPOINT = `shopify://customer-account/api/${API_VERSION}/graphql.json`;

/**
 * Customer Account API se order fetch karke ReorderResult return karta hai
 */
export async function fetchReorderResult(
  orderId: string,
  shopDomain: string
): Promise<ReorderResult> {
  const response = await fetch(CUSTOMER_ACCOUNT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: ORDER_LINE_ITEMS_QUERY,
      variables: { orderId },
    }),
  });

  if (!response.ok) {
    throw new Error(`Customer Account API error: ${response.status}`);
  }

  const json = await response.json();

  if (json.errors?.length) {
    console.error("[reorder.service] GraphQL errors:", json.errors);
    throw new Error(json.errors[0]?.message ?? "GraphQL Error");
  }

  const lineItems = json.data?.order?.lineItems?.nodes ?? [];

  if (!lineItems.length) {
    throw new Error("Order not found or has no line items");
  }

  const { cartItems, missingItems } = partitionLineItems(lineItems);

  const redirectUrl = buildCartPermalink(shopDomain, cartItems);

  return { redirectUrl, missingItems };
}
