import { adminCache } from "app/utils/cache.server";

interface GraphQLError {
  message: string;
  extensions?: {
    code?: string;
  };
}

interface GraphQLResponse {
  data?: any;
  errors?: GraphQLError[];
  extensions?: {
    cost?: {
      throttleStatus?: {
        maximumAvailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Standard fetch with retry logic for REST APIs.
 */
export async function safeFetch(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, i);
        console.warn(`[safeFetch] HTTP 429 Throttled. Retrying in ${backoff}ms...`);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (i === retries) break;
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, i);
      console.warn(`[safeFetch] Attempt ${i + 1} failed. Retrying in ${backoff}ms...`, error);
      await new Promise(r => setTimeout(r, backoff));
    }
  }
  throw lastError || new Error(`Fetch failed after ${retries} retries`);
}

/**
 * Generic retry logic for GraphQL calls.
 * @param client - The admin or storefront client.
 * @param query - The GraphQL query/mutation string.
 * @param variables - Variables for the query.
 */
export async function safeGraphql(
  client: { graphql: (query: string, options?: any) => Promise<Response> },
  query: string,
  variables: Record<string, any> = {},
  options: { cacheKey?: string; ttl?: number } = {}
): Promise<GraphQLResponse> {
  const { cacheKey, ttl = 300 } = options;

  if (cacheKey) {
    const cached = adminCache.get(cacheKey);
    if (cached) {
      console.log(`[safeGraphql] Cache Hit: ${cacheKey}`);
      return cached as GraphQLResponse;
    }
  }

  let retries = 0;


  while (retries <= MAX_RETRIES) {
    try {
      const response = await client.graphql(query, { variables });
      
      // Handle HTTP level rate limits (429)
      if (response.status === 429) {
        if (retries === MAX_RETRIES) throw new Error("Max retries exceeded for 429 Throttle");
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, retries);
        console.warn(`[safeGraphql] HTTP 429 Throttled. Retrying in ${backoff}ms...`);
        await new Promise(r => setTimeout(r, backoff));
        retries++;
        continue;
      }

      const json = (await response.json()) as GraphQLResponse;

      // Handle GraphQL level rate limits (THROTTLED error code)
      const isThrottled = json.errors?.some(err => 
        err.extensions?.code === "THROTTLED" || 
        err.message.toLowerCase().includes("throttled")
      );

      if (isThrottled) {
        if (retries === MAX_RETRIES) return json; // Return the throttled response if max retries hit
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, retries);
        console.warn(`[safeGraphql] GraphQL Throttled. Retrying in ${backoff}ms...`);
        await new Promise(r => setTimeout(r, backoff));
        retries++;
        continue;
      }

      if (cacheKey && !json.errors?.length) {
        adminCache.set(cacheKey, json, ttl);
      }

      return json;

    } catch (error) {
      if (retries === MAX_RETRIES) throw error;
      console.error(`[safeGraphql] Attempt ${retries + 1} failed:`, error);
      retries++;
      await new Promise(r => setTimeout(r, INITIAL_BACKOFF_MS * retries));
    }
  }

  throw new Error("GraphQL request failed after retries");
}
