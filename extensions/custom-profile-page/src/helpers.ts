export const API_VERSION = "2026-01";
export const APP_URL = "https://fewer-integrity-regime-nirvana.trycloudflare.com";

/**
 * Fetches data with retry logic for Shopify Customer Account API.
 * Handles both HTTP 429 and GraphQL "THROTTLED" errors.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  {
    retries = 5,
    baseDelayMs = 300,
  }: { retries?: number; baseDelayMs?: number } = {},
): Promise<any> {
  let attempt = 0;

  while (true) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        if (attempt < retries) {
          attempt += 1;
          const retryAfterSec = parseInt(
            response.headers.get('Retry-After') || '2',
            10,
          );
          const waitMs = retryAfterSec * 1000;
          console.warn(
            `[Extension] Rate limited (429). Retrying after ${waitMs}ms (attempt ${attempt}/${retries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }
        throw new Error('Maximum retries reached for HTTP 429 throttling.');
      }

      // Try to parse JSON safely (in case it's not JSON)
      let json: any;
      let text: string | null = null;
      try {
        text = await response.text();
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { raw: text };
      }

      const graphqlErrors = json?.errors ?? [];
      const isGraphqlThrottled = graphqlErrors.some(
        (err: any) =>
          err?.extensions?.code === 'THROTTLED' ||
          err?.message === 'Throttled',
      );

      const isServerError =
        response.status >= 500 && response.status <= 599;

      // 2) GraphQL-level throttling
      if (isGraphqlThrottled) {
        if (attempt < retries) {
          attempt += 1;
          const restoreRate =
            json.extensions?.cost?.throttleStatus?.restoreRate || 100;
          // Heuristic: wait based on restoreRate, minimum 1s
          const waitTime =
            Math.max(1000, (1000 / restoreRate) * 50) * attempt;
          console.warn(
            `[Extension] GraphQL THROTTLED. restoreRate=${restoreRate}. Retrying after ${waitTime}ms (attempt ${attempt}/${retries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        throw new Error('Maximum retries reached for GraphQL throttling.');
      }

      if (isServerError) {
        if (attempt < retries) {
          attempt += 1;
          const waitTime = baseDelayMs * attempt;
          console.warn(
            `[Extension] Server error ${response.status}. Retrying after ${waitTime}ms (attempt ${attempt}/${retries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        throw new Error(
          `Maximum retries reached for server errors. Last status: ${response.status}`,
        );
      }

      return json;
    } catch (err) {
      // Network error (fetch throw) – retry
      if (attempt < retries) {
        attempt += 1;
        const waitTime = baseDelayMs * attempt;
        console.warn(
          `[Extension] Network error: ${(err as Error).message}. Retrying after ${waitTime}ms (attempt ${attempt}/${retries})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Extracts the numeric ID from a Shopify GID.
 * e.g. "gid://shopify/ProductVariant/12345678" -> "12345678"
 */
export function getNumericId(gid: string | undefined): string {
  if (!gid) return "";
  const parts = gid.split("/");
  return parts[parts.length - 1];
}

/**
 * Fetches Smile.io loyalty points via the server proxy.
 */
export async function fetchSmilePoints(sessionToken: string, shopDomain: string) {
  try {
    const response = await fetch(`${APP_URL}/api/smile/points`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${sessionToken}`,
        "x-shop-domain": shopDomain,
      },
    });

    if (!response.ok) {
        // We handle 404 or other errors gracefully
        return null;
    }

    return await response.json();
  } catch (error) {
    console.error("[Extension] Failed to fetch Smile points:", error);
    return null;
  }
}