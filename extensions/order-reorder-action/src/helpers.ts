/* =========================================================
   Shopify Adaptive API Client
   Production Grade
   ========================================================= */

export const API_VERSION = "2026-01"
export const APP_URL = "https://oak-invitation-rating-wrote.trycloudflare.com";

/* =========================================================
   Types
   ========================================================= */

export interface RetryConfig {
  retries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  timeoutMs?: number
  log?: boolean
}

export interface ShopifyFetchResult<T = any> {
  data: T
  ok: boolean
  status: number
}

interface ShopifyThrottleStatus {
  maximumAvailable: number
  currentlyAvailable: number
  restoreRate: number
}

interface ShopifyCostExtension {
  requestedQueryCost: number
  actualQueryCost: number
  throttleStatus: ShopifyThrottleStatus
}

/* =========================================================
   Logger (Replace with pino/winston in production)
   ========================================================= */

const logger = {
  warn: console.warn,
  error: console.error,
  info: console.log
}

/* =========================================================
   Helpers
   ========================================================= */

const RETRY_DELAYS = [
  10 * 1000,
  60 * 1000,
  5 * 60 * 1000,
  10 * 60 * 1000,
  15 * 60 * 1000
]

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function safeJsonParse(text: string | null) {
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { raw: text }
  }
}

/* =========================================================
   Retry Delay + Jitter
   ========================================================= */

function getRetryDelay(
  attempt: number,
  base: number,
  max: number
) {
  let delay

  if (attempt >= 1 && attempt <= RETRY_DELAYS.length) {
    delay = RETRY_DELAYS[attempt - 1]
  } else {
    delay = base * 2 ** attempt
  }

  const jitter = delay * 0.2 * Math.random()

  return Math.min(delay + jitter, max)
}

/* =========================================================
   Shopify Adaptive Cost Throttle
   ========================================================= */

function adaptiveThrottleDelay(json: any): number | null {

  const cost: ShopifyCostExtension | undefined =
    json?.extensions?.cost

  if (!cost) return null

  const { requestedQueryCost, throttleStatus } = cost

  const { currentlyAvailable, restoreRate } =
    throttleStatus

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

  constructor(
    private concurrency = 5,
    private maxQueue = 1000
  ) {}

  async add<T>(task: () => Promise<T>): Promise<T> {

    if (this.queue.length > this.maxQueue) {
      throw new Error("Request queue overflow")
    }

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
   Shop Queue Cache (LRU-like cleanup)
   ========================================================= */

const shopQueues = new Map<string, RequestQueue>()
const MAX_SHOPS = 5000

function getShopQueue(shop: string) {

  if (shopQueues.has(shop))
    return shopQueues.get(shop)!

  if (shopQueues.size > MAX_SHOPS) {
    const first = shopQueues.keys().next().value;
    if (first) shopQueues.delete(first);
  }

  const queue = new RequestQueue(4)

  shopQueues.set(shop, queue)

  return queue
}

/* =========================================================
   Core Adaptive Fetch
   ========================================================= */

export async function fetchShopifyAdaptive<T = any>(
  shop: string,
  url: string,
  options: RequestInit,
  config: RetryConfig = {}
): Promise<ShopifyFetchResult<T>> {

  const {
    retries = 5,
    baseDelayMs = 250,
    maxDelayMs = 900000,
    timeoutMs = 30000,
    log = true
  } = config

  const queue = getShopQueue(shop)

  let attempt = 0

  return queue.add(async () => {

    while (true) {

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

        const json = safeJsonParse(text)

        const graphqlErrors = json?.errors ?? []

        const isGraphqlThrottle =
          graphqlErrors.some(
            (err: any) =>
              err?.extensions?.code === "THROTTLED" ||
              err?.message === "Throttled"
          )

        const isServerError =
          response.status >= 500

        /* =============================
           HTTP 429
        ============================= */

        if (response.status === 429) {

          if (attempt >= retries)
            throw new Error("Max retries reached (429)")

          attempt++

          const retryAfterHeader =
            parseInt(
              response.headers.get("Retry-After") || "0"
            ) * 1000

          const delay = Math.max(
            retryAfterHeader,
            getRetryDelay(
              attempt,
              baseDelayMs,
              maxDelayMs
            )
          )

          if (log)
            logger.warn(
              `[Shopify Retry] 429 (${shop}) wait ${delay}`
            )

          await sleep(delay)

          continue
        }

        /* =============================
           GraphQL Throttle
        ============================= */

        if (isGraphqlThrottle) {

          if (attempt >= retries)
            throw new Error("Max retries reached (throttle)")

          attempt++

          const adaptive =
            adaptiveThrottleDelay(json)

          const delay =
            adaptive ??
            getRetryDelay(
              attempt,
              baseDelayMs,
              maxDelayMs
            )

          if (log)
            logger.warn(
              `[Shopify Retry] throttle (${shop}) wait ${delay}`
            )

          await sleep(delay)

          continue
        }

        /* =============================
           Server Errors
        ============================= */

        if (isServerError) {

          if (attempt >= retries)
            throw new Error(
              `Server error ${response.status}`
            )

          attempt++

          const delay =
            getRetryDelay(
              attempt,
              baseDelayMs,
              maxDelayMs
            )

          if (log)
            logger.warn(
              `[Shopify Retry] server ${response.status}`
            )

          await sleep(delay)

          continue
        }

        return {
          data: json,
          ok: response.ok,
          status: response.status
        }

      } catch (err: unknown) {

        clearTimeout(timeout)

        if (attempt >= retries)
          throw err

        attempt++

        const delay =
          getRetryDelay(
            attempt,
            baseDelayMs,
            maxDelayMs
          )

        logger.warn(
          `[Shopify Retry] network error`
        )

        await sleep(delay)
      }
    }
  })
}

/* =========================================================
   Shopify GraphQL Helper
   ========================================================= */

export async function shopifyGraphQL<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, any>
): Promise<T> {

  const url =
    `https://${shop}/admin/api/${API_VERSION}/graphql.json`

  const result =
    await fetchShopifyAdaptive<T>(
      shop,
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken
        },
        body: JSON.stringify({
          query,
          variables
        })
      }
    )

  if (!result.ok)
    throw new Error("Shopify request failed")

  return result.data
}

export async function fetchWithRetry<T = any>(
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

export interface ReorderResponse {
  redirectUrl: string | null;
  missingItems?: { name: string; image?: string }[];
}

export async function reorder(
  orderId: string,
  sessionToken: string,
  shopDomain: string
): Promise<ReorderResponse> {

  const result = await fetchShopifyAdaptive<ReorderResponse>(
    shopDomain,
    `${APP_URL}/api/reorder-link`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
        "x-shop-domain": shopDomain
      },
      body: JSON.stringify({ orderId })
    }
  )

  if (!result.ok) {

    const errorData = result.data as any

    const errorMsg =
      errorData?.error?.message ||
      errorData?.message ||
      errorData?.error ||
      "Unknown reorder error"

    throw new Error(errorMsg)
  }

  return result.data
}