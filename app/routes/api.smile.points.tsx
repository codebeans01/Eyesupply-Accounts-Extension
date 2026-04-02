import type { LoaderFunctionArgs } from "react-router";
import { errorResponse, handleOptions, standardResponse} from "app/utils/response";
import { safeFetch } from "app/utils/graphqlHandler";
import { authenticate } from "app/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return handleOptions();
  }

  let corsWrapper: any = null;

  try {
    const { sessionToken, cors } = await authenticate.public.customerAccount(
      request,
      { corsHeaders: ["Authorization", "x-shop-domain"] }
    );
    corsWrapper = cors;

    const customerGID = sessionToken.sub; 
    const shopifyCustomerID = customerGID?.split("/").pop();

    const url = new URL(request.url);
    const email = url.searchParams.get("email");

    if (!shopifyCustomerID && !email) {
      return errorResponse("Customer identification missing", { status: 400, cors: corsWrapper });
    }

    const apiKey = process.env.SMILE_API_KEY;
    const smileBaseUrl = process.env.SMILE_BASE_URL || "https://api.smile.io/v1";

    if (!apiKey) {
      return errorResponse("Smile API configuration missing", { status: 500, cors: corsWrapper });
    }

    let smileCustomer = null;

    // 1. Try lookup by Email (most reliable mapping in Smile)
    if (email) {
      const searchResponse = await safeFetch(`${smileBaseUrl}/customers?email=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json",
        },
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.customers && searchData.customers.length > 0) {
          smileCustomer = searchData.customers[0];
        }
      }
    }

    // 2. Fallback: Try lookup by Shopify Customer ID directly
    if (!smileCustomer && shopifyCustomerID) {
      const directResponse = await safeFetch(`${smileBaseUrl}/customers/${shopifyCustomerID}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json",
        },
      });

      if (directResponse.ok) {
        const directData = await directResponse.json();
        smileCustomer = directData.customer;
      }
    }

    if (!smileCustomer) {
      return standardResponse({ customer: null, message: "Customer not found in Smile" }, { cors: corsWrapper });
    }

    return standardResponse({ customer: smileCustomer }, { cors: corsWrapper });

  } catch (error: any) {
    return errorResponse(
      error.message || "An unexpected error occurred", 
      { status: 500, cors: corsWrapper }
    );
  }
};
