import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { standardResponse, handleOptions, errorResponse } from "app/utils/response";
import { authenticate, unauthenticated } from "app/shopify.server";
import { extractShopDomain } from "./modules/reorder/reorder.helpers";
import { buildReorderResult } from "./modules/reorder/reorder.service";

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
  if (request.method === "OPTIONS") return handleOptions();
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", { status: 405 });
  }

  let corsWrapper: any = null;

  try {
    const { cors, sessionToken } = await authenticate.public.customerAccount(request, {
      corsHeaders: ["Authorization", "x-shop-domain"],
    });
    corsWrapper = cors;

    const shopDomain = extractShopDomain(request, sessionToken.dest);
    if (!shopDomain) {
      return errorResponse("Invalid shop domain", { status: 400, cors: corsWrapper });
    }

    const { orderId } = await request.json();
    if (!orderId) {
      return errorResponse("Missing orderId", { status: 400, cors: corsWrapper });
    }

    const { admin } = await unauthenticated.admin(shopDomain);

    const result = await buildReorderResult(admin, orderId, shopDomain);

    console.log(`[api.reorder-link] redirectUrl: ${result.redirectUrl}`);
    return standardResponse(result, { cors: corsWrapper });

  } catch (error: any) {
    console.error("[api.reorder-link] Error:", error?.message ?? error);
    const status = error?.status ?? (error?.message?.includes("Unauthorized") ? 401 : 500);
    return errorResponse(error?.message ?? "Unexpected error", { status, cors: corsWrapper });
  }
};