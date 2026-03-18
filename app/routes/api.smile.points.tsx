import type { LoaderFunctionArgs } from "react-router";
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

  try {
    const { sessionToken, cors } = await authenticate.public.customerAccount(
      request,
      { corsHeaders: ["Authorization", "x-shop-domain"] }
    );

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
      },
    });
    

    if (!smileResponse.ok) {
        const errorText = await smileResponse.text();
        console.error(`[api.smile.points] Smile API error: ${smileResponse.status}`, errorText);
        return cors(new Response(JSON.stringify({ error: "Failed to fetch Smile data" }), { 
            status: smileResponse.status, 
            headers: CORS_HEADERS 
        }));
    }

    const smileData = await smileResponse.json();
    const smileCustomer = smileData?.customer || null;

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
    );
  }
};
