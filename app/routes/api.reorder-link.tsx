import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { safeGraphql } from "app/utils/graphqlHandler";
import { standardResponse, handleOptions, errorResponse } from "app/utils/response";
import { authenticate, unauthenticated } from "app/shopify.server";

/**
 * Handle OPTIONS preflight requests in the loader
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return handleOptions();
  }
  return errorResponse("Method not allowed", { status: 405 });
};

/**
 * Handle POST requests for generating reorder links
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  // Although loader usually handles OPTIONS, some environments might send it to action
  if (request.method === "OPTIONS") {
    return handleOptions();
  }

  if (request.method !== "POST") {
    return errorResponse("Method not allowed", { status: 405 });
  }

  let corsWrapper: any = null;

  try {
    console.log(`[api.reorder-link] Authenticating request...`);
    
    // Authenticate the request from the Customer Account UI Extension
    const { cors, sessionToken } = await authenticate.public.customerAccount(
      request,
      { corsHeaders: ["Authorization", "x-shop-domain"] }
    );
    corsWrapper = cors;

    const shopDomain = sessionToken.dest.replace(/^https?:\/\//, "");
    if (!shopDomain) {
      return errorResponse("Invalid shop domain", { status: 400, cors: corsWrapper });
    }

    const { admin } = await unauthenticated.admin(shopDomain);

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return errorResponse("Missing orderId", { status: 400, cors: corsWrapper });
    }

    // Execute GraphQL query to fetch order details from Admin API with retry logic using common helper
    const json = await safeGraphql(admin, `
      query getOrder($id: ID!) {
        order(id: $id) {
          lineItems(first: 50) {
            nodes {
              variant {
                id
              }
              quantity
              customAttributes {
                key
                value
              }
            }
          }
        }
      }
    `, { id: orderId });

    if (json.errors) {
      return errorResponse("GraphQL Error", { details: json.errors, status: 500, cors: corsWrapper });
    }

    const order = json.data?.order;

    if (!order || !order.lineItems?.nodes?.length) {
      console.error(`[api.reorder-link] Order not found or has no line items: ${orderId}`);
      return errorResponse("Order not found or empty", { status: 404, cors: corsWrapper });
    }

    console.log(`[api.reorder-link] Found ${order.lineItems.nodes.length} line items for order ${orderId}`);

    const baseUrl = `https://${shopDomain}/cart/add`;
    const params = new URLSearchParams();

    order.lineItems.nodes.forEach((item: any, index: number) => {
      // Extract numeric variant ID from GID safely
      const variantId = item.variant?.id;
      const numericVariantId = variantId ? variantId.split("/").pop() : null;
      
      if (numericVariantId) {
        params.append(`items[${index}][id]`, numericVariantId);
        params.append(`items[${index}][quantity]`, item.quantity.toString());
        
        if (item.customAttributes && item.customAttributes.length > 0) {
          item.customAttributes.forEach((attr: any) => {
            params.append(`items[${index}][properties][${attr.key}]`, attr.value);
          });
        }
      }
    });

    const redirectUrl = `${baseUrl}?${params.toString()}`;

    return standardResponse({ redirectUrl }, { cors: corsWrapper });

  } catch (error: any) {
    console.error(`[api.reorder-link] Unexpected Error:`, error.message || error);
    
    // Check if it's an authentication error
    const status = error.status || (error.message?.includes("Unauthorized") ? 401 : 500);
    
    return errorResponse(
      error.message || "An unexpected error occurred", 
      { status, cors: corsWrapper }
    );
  }
};
