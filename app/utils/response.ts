// Standard Response and Request are available globally in Node 18+ and React Router v7
// No need to import Response from @remix-run/node

const DEFAULT_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-shop-domain",
  "Content-Type": "application/json",
} as const;

/**
 * Standard response helper to ensure CORS and consistent error formatting.
 */
export function standardResponse(
  data: any,
  options: { 
    status?: number; 
    headers?: Record<string, string>;
    cors?: (res: Response) => Response;
  } = {}
) {
  const { status = 200, headers = {}, cors } = options;
  
  const responseHeaders = {
    ...DEFAULT_CORS_HEADERS,
    ...headers,
  };

  const response = new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders,
  });

  // If a cors wrapper is provided (from shopify.authenticate), use it
  if (cors) {
    return cors(response);
  }

  return response;
}

/**
 * Handle OPTIONS preflight requests uniformly.
 */
export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: DEFAULT_CORS_HEADERS,
  });
}

/**
 * Standard error response to prevent leaking internal details.
 */
export function errorResponse(
  message: string,
  options: { 
    status?: number; 
    details?: any;
    cors?: (res: Response) => Response;
  } = {}
) {
  const { status = 500, details, cors } = options;
  
  console.error(`[API Error] ${message}`, details || "");

  return standardResponse(
    { 
      error: message,
      ...(process.env.NODE_ENV === "development" ? { details } : {}),
    },
    { status, cors }
  );
}
