import { RetryConfig, ShopifyCostExtension, ShopifyFetchResult, SmilePointsResponse, CustomOrderStatusResponse, Order } from "./interface";
import { SETTINGS_QUERY } from "./graphql-query";
import { API_VERSION, APP_URL, RETRY_DELAYS, MINUTE, SECOND } from "./constants";

/* =========================================================
   Types
   ========================================================= */

export interface GraphQLError {
  message?: string
  extensions?: {
    code?: string
  }
}

export interface GraphQLResponse {
  data?: unknown
  errors?: GraphQLError[]
  extensions?: {
    cost?: ShopifyCostExtension
  }
}


/* =========================================================
   Utilities
   ========================================================= */

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function safeJsonParse(text: string | null): unknown {
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { raw: text }
  }
}

/**
 * Retry delay with jitter
 */
function getRetryDelay(
  attempt: number,
  base: number,
  max: number
) {
  let delay: number

  if (attempt >= 1 && attempt <= RETRY_DELAYS.length) {
    delay = RETRY_DELAYS[attempt - 1]
  } else {
    delay = base * 2 ** attempt
  }

  const jitter = delay * 0.2 * Math.random()

  return Math.min(delay + jitter, max)
}

export function mapOrderNode(order: any): Order {
  return {
    id: order.id,
    name: order.name,
    processedAt: order.processedAt,
    fulfillmentStatus: order.fulfillmentStatus,
    financialStatus: order.financialStatus,
    totalPrice: {
      amount: order.totalPrice.amount,
      currencyCode: order.totalPrice.currencyCode,
    },
    lineItems:
      order.lineItems?.nodes?.map((li: any) => ({
        id: li.id,
        name: li.name,
        quantity: li.quantity,
        variantTitle: li.variantTitle ?? null,
        variantId: li.variantId ?? null,
        sku: li.sku ?? null,
        image: li.image ? { url: li.image.url } : null,
        productId: li.productId ?? null,
        totalPrice: {
          amount: li.totalPrice.amount,
          currencyCode: li.totalPrice.currencyCode,
        },
        variantOptions: li.variantOptions ?? [],
        customAttributes: li.customAttributes ?? [],
      })) ?? [],
  };
}

/**
 * Shopify adaptive throttling
 */
function adaptiveThrottleDelay(json: GraphQLResponse): number | null {

  const cost = json?.extensions?.cost

  if (!cost) return null

  const {
    requestedQueryCost,
    throttleStatus
  } = cost

  const {
    currentlyAvailable,
    restoreRate
  } = throttleStatus

  if (currentlyAvailable >= requestedQueryCost)
    return null

  const missing = requestedQueryCost - currentlyAvailable

  const waitMs = (missing / restoreRate) * 1000

  return Math.max(waitMs, 200)
}


/* =========================================================
   Request Queue (Concurrency Control)
   ========================================================= */

class RequestQueue {

  private running = 0
  private queue: (() => Promise<void>)[] = []

  constructor(private concurrency = 5) {}

  async add<T>(task: () => Promise<T>): Promise<T> {

    return new Promise((resolve, reject) => {

      const run = async () => {

        this.running++

        try {
          const result = await task()
          resolve(result)
        } catch (err) {
          reject(err)
        }

        this.running--
        this.next()
      }

      this.queue.push(run)

      queueMicrotask(() => this.next())
    })
  }

  private next() {

    if (this.running >= this.concurrency)
      return

    const job = this.queue.shift()

    if (!job) return

    job()
  }
}


/* =========================================================
   Per-Shop Queue Manager
   ========================================================= */

const shopQueues = new Map<string, RequestQueue>()

function getShopQueue(shop: string) {

  if (!shopQueues.has(shop)) {
    shopQueues.set(shop, new RequestQueue(4))
  }

  return shopQueues.get(shop)!
}


/* =========================================================
   Core Shopify Fetch
   ========================================================= */

export async function fetchShopifyAdaptive<T = unknown>(
  shop: string,
  url: string,
  options: RequestInit,
  config: RetryConfig = {}
): Promise<ShopifyFetchResult<T>> {

  const {
    retries = 5,
    baseDelayMs = 250,
    maxDelayMs = 15 * MINUTE,
    timeoutMs = 30 * SECOND,
    log = true
  } = config

  const queue = getShopQueue(shop)

  return queue.add(async () => {

    for (let attempt = 0; attempt <= retries; attempt++) {

      const controller = new AbortController()

      const timeout = setTimeout(
        () => controller.abort(),
        timeoutMs
      )

      try {

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        })

        clearTimeout(timeout)

        const text = await response.text()
        const parsed = safeJsonParse(text) as GraphQLResponse

        const graphqlErrors = parsed?.errors ?? []

        const isGraphqlThrottle = graphqlErrors.some(
          err =>
            err?.extensions?.code === "THROTTLED" ||
            err?.message === "Throttled"
        )

        const isServerError = response.status >= 500

        /* =============================
           HTTP 429
        ============================= */

        if (response.status === 429) {

          if (attempt >= retries)
            throw new Error("Max retries reached (429)")

          const retryAfterHeader =
            parseInt(response.headers.get("Retry-After") || "0") * 1000

          const delay = Math.max(
            retryAfterHeader,
            getRetryDelay(attempt, baseDelayMs, maxDelayMs)
          )

          if (log)
            console.warn(`[Shopify Retry] 429 ${shop} wait ${delay}ms`)

          await sleep(delay)
          continue
        }

        /* =============================
           GraphQL Throttle
        ============================= */

        if (isGraphqlThrottle) {

          if (attempt >= retries)
            throw new Error("Max retries reached (throttle)")

          const adaptiveDelay = adaptiveThrottleDelay(parsed)

          const delay =
            adaptiveDelay ??
            getRetryDelay(attempt, baseDelayMs, maxDelayMs)

          if (log)
            console.warn(`[Shopify Retry] throttle ${shop} wait ${delay}ms`)

          await sleep(delay)
          continue
        }

        /* =============================
           Server Error
        ============================= */

        if (isServerError) {

          if (attempt >= retries)
            throw new Error(`Max retries reached (${response.status})`)

          const delay = getRetryDelay(
            attempt,
            baseDelayMs,
            maxDelayMs
          )

          if (log)
            console.warn(`[Shopify Retry] server ${response.status} wait ${delay}ms`)

          await sleep(delay)
          continue
        }

        return {
          data: parsed as T,
          ok: response.ok,
          status: response.status
        }

      } catch (err) {

        clearTimeout(timeout)

        if (err instanceof DOMException && err.name === "AbortError") {
          throw new Error("Request timeout")
        }

        if (attempt >= retries)
          throw err

        const delay = getRetryDelay(
          attempt,
          baseDelayMs,
          maxDelayMs
        )

        if (log)
          console.warn(`[Shopify Retry] network error retry in ${delay}ms`)

        await sleep(delay)
      }
    }

    throw new Error("Unexpected retry exit")
  })
}


/* =========================================================
   Legacy Alias
   ========================================================= */

export async function fetchWithRetry<T = unknown>(
  url: string,
  options: RequestInit,
  config: RetryConfig = {}
): Promise<ShopifyFetchResult<T>> {

  const shop = new URL(url).hostname

  return fetchShopifyAdaptive<T>(
    shop,
    url,
    options,
    config
  )
}


/* =========================================================
   Helpers
   ========================================================= */

/**
 * Extract numeric ID from Shopify GID
 */
export function getNumericId(gid?: string): string {

  if (!gid) return ""

  const parts = gid.split("/")

  return parts[parts.length - 1]
}


/**
 * Fetch Smile.io points
 */
export async function fetchSmilePoints(
  sessionToken: string,
  shopDomain: string,
  email?: string | null
): Promise<SmilePointsResponse | null> {

  try {
    const url = new URL(`${APP_URL}/api/smile/points`);
    if (email) url.searchParams.append("email", email);

    const response = await fetchWithRetry<SmilePointsResponse>(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "x-shop-domain": shopDomain
      }
    })

    if (!response.ok) {

      const data = response.data as Record<string, unknown>

      const message =
        (data?.error as any)?.message ||
        data?.error ||
        data?.message ||
        "Failed to fetch points"

      throw new Error(String(message))
    }

    return response.data

  } catch (error) {

    console.error("[Extension] Failed to fetch Smile points:", error)

    return null
  }
}

/**
 * Fetch Custom Order Statuses through the backend proxy to bypass CORS
 */
export async function fetchCustomOrderStatusesProxy(
  sessionToken: string,
  shopDomain: string,
  orderIds: number[]
): Promise<CustomOrderStatusResponse | null> {

  try {
    const url = `${APP_URL}/api/custom-order-status`;
    
    const response = await fetchWithRetry<CustomOrderStatusResponse>(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
        "x-shop-domain": shopDomain
      },
      body: JSON.stringify({
        order_ids: orderIds,
        show_all_history: false
      })
    })

    if (!response.ok) {
      console.warn("[Extension] Status proxy replied with status:", response.status);
      return null;
    }

    return response.data;

  } catch (error) {
    console.error("[Extension] Failed to fetch custom order statuses:", error);
    return null;
  }
}

/**
 * Mask Patient ID: Show only last 4 digits (e.g., ********5468)
 */
export function maskPatientId(id?: string | null): string {
  if (!id) return "";
  const strId = String(id);
  // If it's already masked (contains *), just return it
  if (strId.includes("*")) return strId;
  if (strId.length <= 4) return strId;
  const lastFour = strId.slice(-4);
  const maskedLength = Math.min(strId.length - 4, 8); // Limit stars for cleaner UI
  return "*".repeat(maskedLength) + lastFour;
}

/**
 * Resolve dynamic tokens and keys from context
 */
export function resolveDynamicToken(input: string, context: any): string {
  if (!input) return "";

  // 1. Handle handlebars-style tokens: {{customer.first_name}}
  let resolved = input.replace(/\{\{\s*customer\.first_name\s*\}\}/g, context?.customer?.firstName || "");
  resolved = resolved.replace(/\{\{\s*customer\.last_name\s*\}\}/g, context?.customer?.lastName || "");
  resolved = resolved.replace(/\{\{\s*customer\.email\s*\}\}/g, context?.customer?.email || "");

  // 2. Handle strict key-based resolution (if input is just a key like "loyalty.points")
  if (input === "loyalty.points") {
    return context?.points !== null ? `${context.points} pts` : "0 pts";
  }
  if (input === "lastOrder") {
    return context?.orders?.[0]?.name || "No orders";
  }
  if (input === "daysLeft") {
    return context?.daysRemaining !== null ? `${context.daysRemaining} days left of lenses` : "--";
  }
  if (input === "orderStatus") {
    const unfulfilledCount = (context?.orders || []).filter((o: any) => o.fulfillmentStatus === "UNFULFILLED").length;
    return `${unfulfilledCount} orders`;
  }
  if (input === "prescriptionStatus") {
    return context?.customer?.prescription?.status || "No Active Prescription";
  }
  if (input === "medicalAid.number") {
    return context?.customer?.medicalAidNumber || "Not Available";
  }
  if (input === "medicalAid.plan") {
    return context?.customer?.medicalAidPlan || "Not Available";
  }
  if (input === "medicalAid.name") {
    return context?.customer?.medicalAidName || "Not Available";
  }
  if (input === "medicalAid.patientId") {
    return context?.customer?.patientIdNumber ? maskPatientId(context.customer.patientIdNumber) : "Not Available";
  }

  return resolved;
}

/**
 * Calculate days remaining between today and a target date string
 */
export function calculateDaysRemaining(targetDateStr?: string | null): number | null {
  if (!targetDateStr) return null;
  
  try {
    const target = new Date(targetDateStr);
    if (isNaN(target.getTime())) return null;

    const now = new Date();
    // Normalize both to midnight to count full days
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());

    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  } catch (e) {
    console.error("[helpers] Failed to calculate days remaining:", e);
    return null;
  }
}

export async function getSettings(api: any) {
  try {
    const response = await api.query(SETTINGS_QUERY);
    
    if (response?.errors && response.errors.length > 0) {
      return { settings: null, error: response.errors[0].message };
    }

    const metafieldValue = response?.data?.shop?.metafield?.value;
    if (metafieldValue) {
      try {
        const parsed = JSON.parse(metafieldValue);
        return { settings: parsed, error: null };
      } catch (parseError) {
        return { settings: null, error: "Failed to parse dynamic settings JSON" };
      }
    }

    return { settings: null, error: "Dynamic settings not found" };
  } catch (e: any) {
    return { settings: null, error: e.message || "Failed to fetch dynamic settings" };
  }
}

/**
 * Format a date string into "Expires DD Month YYYY"
 */
export function formatDateString(dateStr?: string | null): string | null {
  if (!dateStr || dateStr === "-") return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    
    const day = date.getDate();
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    return `Expires ${day} ${month} ${year}`;
  } catch (e) {
    return null;
  }
}

/**
 * Get prescription status text and tone based on expiry date and customer tags
 */
export function getPrescriptionStatus(
  prescriptionExpiry: string | null | undefined,
  ordersCount: number,
  tags: string[]
): { text: string; tone: "neutral" | "success" | "warning" | "critical" } {
  const daysLeft = (prescriptionExpiry === "-") 
    ? "-" 
    : (prescriptionExpiry === null || prescriptionExpiry === undefined
        ? null 
        : calculateDaysRemaining(prescriptionExpiry));

  // Check for loyalty override: 3+ orders AND ('prescription' OR 'prescription-override' tags)
  const isLoyalCustomer = ordersCount >= 3 && tags.some(tag => {
    const lowTag = tag.toLowerCase();
    return lowTag.includes("prescription-override") || lowTag.includes("prescription");
  });

  const statusLabels = {
    all: `All up to date — ${daysLeft ?? '-'} days left`,
    soon: `Expiring soon — ${daysLeft ?? '-'} days left`,
    expired: `Expired — 0 days left`,
    loyalty: "All up to date"
  };

  const statusText = isLoyalCustomer ? statusLabels.loyalty : 
    daysLeft === null ? "Not provided" : 
    typeof daysLeft !== 'number' ? "-" : 
    daysLeft >= 60 ? statusLabels.all :
    daysLeft >= 30 ? statusLabels.soon :
    daysLeft > 0 ? statusLabels.soon : statusLabels.expired;

  const tone: "neutral" | "success" | "warning" | "critical" = isLoyalCustomer ? "success" :
    (daysLeft === null || typeof daysLeft !== 'number') ? "neutral" : 
    daysLeft >= 60 ? "success" : 
    daysLeft >= 30 ? "warning" : "critical";

  return { text: statusText, tone };
}
