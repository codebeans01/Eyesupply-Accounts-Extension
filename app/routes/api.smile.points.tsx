import type { LoaderFunctionArgs } from "react-router";
<<<<<<< HEAD
import { authenticate } from "../shopify.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-shop-domain",
  "Content-Type": "application/json",
} as const;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

=======
import { errorResponse, handleOptions, standardResponse} from "app/utils/response";
import { safeFetch } from "app/utils/graphqlHandler";
import { authenticate } from "app/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return handleOptions();
  }

  let corsWrapper: any = null;

>>>>>>> stage
  try {
    const { sessionToken, cors } = await authenticate.public.customerAccount(
      request,
      { corsHeaders: ["Authorization", "x-shop-domain"] }
    );
<<<<<<< HEAD

    const shop = sessionToken.dest;
    //const customerEmail = sessionToken.email || ""; // We might need email for Smile or ID
    const customerID = 3512945852;

    const apiKey = process.env.SMILE_API_KEY;
    if (!apiKey) {
      console.warn("[api.smile.points] SMILE_API_KEY is not set in environment.");
      return cors(new Response(JSON.stringify({ error: "Smile API configuration missing" }), { 
        status: 500, 
        headers: CORS_HEADERS 
      }));
    }

    // First list customers to find the one with matching email
    // Or if we have a direct customer ID from sessionToken, we might need a mapping.
    // Usually Smile uses email as the primary identifier for integration.
    
    const smileBaseUrl = "https://api.smile.io/v1";
    const smileResponse = await fetch(`${smileBaseUrl}/customers/${customerID}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        // "Content-Type": "application/json",
=======
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
>>>>>>> stage
      },
    });
    

    if (!smileResponse.ok) {
        const errorText = await smileResponse.text();
<<<<<<< HEAD
        console.error(`[api.smile.points] Smile API error: ${smileResponse.status}`, errorText);
        return cors(new Response(JSON.stringify({ error: "Failed to fetch Smile data" }), { 
            status: smileResponse.status, 
            headers: CORS_HEADERS 
        }));
=======
        return errorResponse("Failed to fetch Smile data", { 
            status: smileResponse.status, 
            cors: corsWrapper,
            details: errorText 
        });
>>>>>>> stage
    }

    const smileData = await smileResponse.json();
    const smileCustomer = smileData?.customer || null;

<<<<<<< HEAD
    return cors(new Response(JSON.stringify({ customer: smileCustomer }), { 
        status: 200, 
        headers: CORS_HEADERS 
    }));

  } catch (error: any) {
    console.error(`[api.smile.points] Error:`, error.message || error);
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        message: error.message || "An unexpected error occurred" 
      }), 
      { 
        status: 500, 
        headers: CORS_HEADERS 
      }
=======
    return standardResponse({ customer: smileCustomer }, { cors: corsWrapper });

  } catch (error: any) {
    return errorResponse(
      error.message || "An unexpected error occurred", 
      { status: 500, cors: corsWrapper }
>>>>>>> stage
    );
  }
};
