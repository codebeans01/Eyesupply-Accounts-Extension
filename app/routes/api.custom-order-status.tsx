import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { errorResponse, handleOptions, standardResponse } from "app/utils/response";
import { authenticate } from "app/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return handleOptions();
  }
  return errorResponse("Method not allowed", { status: 405 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return handleOptions();
  }

  let corsWrapper: any = null;

  try {
    const { sessionToken, cors } = await authenticate.public.customerAccount(
      request,
      { corsHeaders: ["Authorization", "Content-Type", "x-shop-domain"] }
    );
    corsWrapper = cors;

    const body = await request.json();
    const { order_ids, show_all_history } = body;

    if (!order_ids || !Array.isArray(order_ids)) {
      return errorResponse("order_ids array is required", { status: 400, cors: corsWrapper });
    }

    const API_URL = "https://custom-order-status.cblyst.com/api/v1/orders-status";
    const API_KEY = process.env.ORDER_STATUS_API_KEY || "codebeansdev2:7ac352a2-6629-404c-babf-042c50a32639";
    
    console.log("[Proxy] Fetching custom order statuses for IDs:", order_ids);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_ids,
        show_all_history: show_all_history ?? false,
      }),
    });

    if (!response.ok) {
      console.warn("[Proxy] External API replied with error status:", response.status);
      const errorText = await response.text();
      return errorResponse(`External API Error: ${response.status}`, { status: response.status, details: errorText, cors: corsWrapper });
    }
 
    const data = await response.json();
    return standardResponse(data, { cors: corsWrapper });

  } catch (error: any) {
    console.error("[Proxy] Unexpected error in status proxy:", error);
    return errorResponse(
      error.message || "An unexpected error occurred", 
      { status: 500, cors: corsWrapper }
    );
  }
};
