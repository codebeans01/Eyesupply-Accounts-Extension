import { RetryConfig, ShopifyCostExtension, ShopifyFetchResult } from "./interface";

export const API_VERSION = "2026-01";
export const APP_URL = "https://jeans-per-oliver-dir.trycloudflare.com";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/**
 * Fixed retry schedule used by large Shopify apps
 */
const RETRY_DELAYS = [
  10 * SECOND,
  1 * MINUTE,
  5 * MINUTE,
  10 * MINUTE,
  15 * MINUTE
];


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
  shopDomain: string
) {

  try {

    const response = await fetchWithRetry(`${APP_URL}/api/smile/points`, {
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