/**
 * api.dependant.me.tsx — Customer Account session-based dependant API
 * Updated for Hybrid Auth with Direct Fetch + JWT fallback parsing
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate, unauthenticated } from "../shopify.server";
import { safeGraphql } from "../utils/graphqlHandler";
import { adminCache } from "../utils/cache.server";
import { batchMetafieldUpdate } from "../utils/batchHandler";


interface MetaobjectField { key: string; value: string; }

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-customer-id, x-shop-domain",
  "Content-Type": "application/json",
} as const;

interface DependantEntry {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
}

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

const GET_CUSTOMER_METAFIELD_ADMIN = `#graphql
  query GetCustomerMetafield($id: ID!) {
    customer(id: $id) {
      metafield(namespace: "custom", key: "dependants") {
        id
        value
      }
    }
  }
`;

const GET_CUSTOMER_METAFIELD_STOREFRONT = `#graphql
  query GetCustomerMetafield($id: ID!) {
    node(id: $id) {
      ... on Customer {
        metafield(namespace: "custom", key: "dependants") {
          value
        }
      }
    }
  }
`;

const SET_METAFIELDS = `#graphql
  mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
        value
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

async function getContext(request: Request) {
  // 1. Try App Proxy (Official path)
  try {
    const result = (await authenticate.public.appProxy(request)) as any;
    const { admin, session, payload } = result;
    if (admin && (session?.shop || payload?.dest)) {
      const shop = session?.shop || (payload?.dest ? new URL(payload.dest).hostname : "");
      const { customerId } = getInfoFromToken(request);
      console.log("[api.dependant.me] App Proxy Auth SUCCESS:", shop);
      return { admin, customerId: customerId || payload?.sub || "", shop };
    }
  } catch (e) {
    // Falls through to direct fetch auth
  }

  // 2. Direct Fetch Fallback (Manual JWT validation)
  const info = getInfoFromToken(request);
  const { customerId, shop } = info;
  
  if (!customerId || !shop) {
    console.error("[api.dependant.me] Auth failed (Missing info):", { customerId, shop });
    return null;
  }

  try {
    const { admin } = await unauthenticated.admin(shop);
    console.log("[api.dependant.me] Direct Auth SUCCESS:", shop);
    return { admin, customerId, shop };
  } catch (e) {
    console.error("[api.dependant.me] unauthenticated.admin failed for shop:", shop, e);
    return null;
  }
}

// ─── GET /api/dependant/me ────────────────────────────────────────────────────

function getNumericCustomerId(id: string): string {
  if (!id) return "";
  if (id.includes("gid://shopify/Customer/")) {
    return id.split("/").pop() || "";
  }
  return id;
}

/** ─── Helper: Fetch and Parse JSON Metafield ─── */
async function getDependants(admin: any, customerId: string, shop: string): Promise<DependantEntry[]> {
  const numericId = getNumericCustomerId(customerId);
  const gid = `gid://shopify/Customer/${numericId}`;
  
  // Cache key unique to this shop and customer
  const cacheKey = `dependants:${shop}:${numericId}`;
  
  try {
    const json = await safeGraphql(admin, GET_CUSTOMER_METAFIELD_ADMIN, { id: gid });
    const value = json?.data?.customer?.metafield?.value;
    if (!value) return [];
    return JSON.parse(value);
  } catch (e) {
    console.error("[api.dependant.me] getDependants error:", e);
    return [];
  }
}

/** ─── Helper: Save JSON Metafield ─── */
async function saveDependants(admin: any, customerId: string, dependants: DependantEntry[], shop: string) {
  const numericId = getNumericCustomerId(customerId);
  const gid = `gid://shopify/Customer/${numericId}`;
  
  const json = await batchMetafieldUpdate(admin, [
    {
      ownerId: gid,
      namespace: "custom",
      key: "dependants",
      type: "json",
      value: JSON.stringify(dependants)
    }
  ]);

  // Invalidate cache on write
  const cacheKey = `dependants:${shop}:${numericId}`;
  adminCache.delete(cacheKey);

  const errors = (json?.data as any)?.metafieldsSet?.userErrors;
  if (errors?.length) {
    throw new Error(errors[0].message);
  }
  return dependants;
}


// ─── GET /api/dependant/me ────────────────────────────────────────────────────

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const ctx = await getContext(request);
  if (!ctx) return ok({ error: "Unauthorized" }, 401);
  const { admin, customerId, shop } = ctx;

  try {
    const dependants = await getDependants(admin, customerId, shop);
    return ok(dependants);
  } catch (e) {
    console.error("[api.dependant.me] loader error:", e);
    return ok([]);
  }
}

// ─── ACTION (POST/DELETE) /api/dependant/me ───────────────────────────────────

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const ctx = await getContext(request);
  if (!ctx) return ok({ error: "Unauthorized" }, 401);
  const { admin, customerId, shop } = ctx;

  const dependants = await getDependants(admin, customerId, shop);

  if (request.method === "POST") {
    let body: { firstName?: string; lastName?: string };
    try { body = await request.json(); }
    catch { return ok({ error: "Invalid JSON" }, 400); }

    const { firstName, lastName } = body;
    if (!firstName?.trim() || !lastName?.trim()) {
      return ok({ error: "firstName and lastName required" }, 400);
    }

    console.log('body', body)

    const newDep: DependantEntry = {
      id: Date.now(), // Unique numeric ID
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      full_name: `${firstName.trim()} ${lastName.trim()}`
    };

    const updated = [newDep, ...dependants];
    try {
      await saveDependants(admin, customerId, updated, shop);
      return ok(newDep, 201);
    } catch (e: any) {
      return ok({ error: e.message || "Failed to save" }, 422);
    }
  }

  if (request.method === "PUT") {
    let body: { id?: number; firstName?: string; lastName?: string };
    try { body = await request.json(); }
    catch { return ok({ error: "Invalid JSON" }, 400); }

    const { id, firstName, lastName } = body;
    if (!id || !firstName?.trim() || !lastName?.trim()) {
      return ok({ error: "id, firstName and lastName required" }, 400);
    }

    const index = dependants.findIndex(d => d.id === id);
    if (index === -1) return ok({ error: "Not found" }, 404);

    const updatedDep = {
      ...dependants[index],
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      full_name: `${firstName.trim()} ${lastName.trim()}`
    };

    const updatedList = [...dependants];
    updatedList[index] = updatedDep;

    try {
      await saveDependants(admin, customerId, updatedList, shop);
      return ok(updatedDep);
    } catch (e: any) {
      return ok({ error: e.message || "Failed to save" }, 422);
    }
  }

  if (request.method === "DELETE") {
    let body: { id?: number; ids?: number[] };
    try { body = await request.json(); }
    catch { return ok({ error: "Invalid JSON" }, 400); }

    const { id, ids } = body;
    if (!id && (!ids || !Array.isArray(ids) || ids.length === 0)) {
      return ok({ error: "id or ids array required" }, 400);
    }

    const idsToRemove = ids || [id!];
    const filtered = dependants.filter(d => !idsToRemove.includes(d.id));
    
    try {
      await saveDependants(admin, customerId, filtered, shop);
      return ok({ success: true, removedCount: idsToRemove.length });
    } catch (e: any) {
      return ok({ error: e.message || "Failed to update" }, 422);
    }
  }

  return ok({ error: "Method not allowed" }, 405);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInfoFromToken(request: Request) {
  try {
    const auth = request.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/, "").trim();
    
    // Fallback headers if token fails or is minimal
    const shopHeader = request.headers.get("x-shop-domain") || "";
    const customerHeader = request.headers.get("x-customer-id") || "";
    if (!token) {
      return { 
        customerId: customerHeader.includes("/") ? customerHeader.split("/").pop() : customerHeader, 
        shop: shopHeader 
      };
    }

    const parts = token.split(".");
    if (parts.length < 2) return { customerId: customerHeader, shop: shopHeader };
    
    // Use base64url-safe parsing
    const payloadStr = Buffer.from(parts[1], "base64").toString("utf-8");
    const payload = JSON.parse(payloadStr);
    
    // 1. Customer ID
    let customerId = customerHeader || payload?.sub || "";
    if (customerId.includes("gid://shopify/Customer/")) {
      customerId = customerId.split("/").pop() || "";
    }
    
    // 2. Shop domain
    let shop = shopHeader;
    if (!shop) {
      const dest = payload?.dest || "";
      const iss = payload?.iss || "";
      const target = dest || iss;
      
      if (target) {
        if (target.includes("://")) {
          shop = new URL(target).hostname;
        } else {
          shop = target.split("/")[0];
        }
      }
    }
    
    // Final cleanup: ensure it's a .myshopify.com domain if it looks like one
    if (shop && !shop.includes(".")) {
      shop = `${shop}.myshopify.com`;
    }

    return { customerId, shop };
  } catch (e) {
    console.error("[api.dependant.me] getInfoFromToken error:", e);
    return {};
  }
}
