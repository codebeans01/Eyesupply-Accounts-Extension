import { safeGraphql } from "app/utils/graphqlHandler";
import { ORDER_LINE_ITEMS_QUERY } from "./reorder.queries";
import { partitionLineItems, buildCartPermalink } from "./reorder.helpers";
import type { LineItem, ReorderResult } from "./reorder.types";
import { AdminApiContext } from "@shopify/shopify-app-react-router/server";

/**
 * Order fetch karke cart redirect URL generate karta hai
 */
export async function buildReorderResult(
  admin: AdminApiContext,
  orderId: string,
  shopDomain: string
): Promise<ReorderResult> {
  const json = await safeGraphql(admin, ORDER_LINE_ITEMS_QUERY, { id: orderId });

  if (json.errors) {
    throw Object.assign(new Error("GraphQL Error"), { details: json.errors, status: 500 });
  }

  const lineItems: LineItem[] = json.data?.order?.lineItems?.nodes ?? [];

  if (!lineItems.length) {
    throw Object.assign(new Error("Order not found or empty"), { status: 404 });
  }

  const { cartItems, missingItems } = partitionLineItems(lineItems);

  if (missingItems.length > 0) {
    console.warn(
      `[reorder.service] ${missingItems.length} unavailable item(s):`,
      missingItems.map((i) => i.name)
    );
  }

  const redirectUrl = buildCartPermalink(shopDomain, cartItems);

  return { redirectUrl, missingItems };
}
