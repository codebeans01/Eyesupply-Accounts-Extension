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
    const customerID = customerGID?.split("/").pop();

    if (!customerID) {
      return errorResponse("Customer not identified", { status: 401, cors: corsWrapper });
    }

    const apiKey = process.env.SMILE_API_KEY;
    if (!apiKey) {
      return errorResponse("Smile API configuration missing", { status: 500, cors: corsWrapper });
    }

    const smileBaseUrl = "https://api.smile.io/v1";
    
    const smileResponse = await safeFetch(`${smileBaseUrl}/customers/${customerID}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
    });
    

    if (!smileResponse.ok) {
        const errorText = await smileResponse.text();
        return errorResponse("Failed to fetch Smile data", { 
            status: smileResponse.status, 
            cors: corsWrapper,
            details: errorText 
        });
    }

    const smileData = await smileResponse.json();
    const smileCustomer = smileData?.customer || null;

    return standardResponse({ customer: smileCustomer }, { cors: corsWrapper });

  } catch (error: any) {
    return errorResponse(
      error.message || "An unexpected error occurred", 
      { status: 500, cors: corsWrapper }
    );
  }
};
