/**
 * api.dependant.tsx — App Proxy route for dependant metaobject CRUD.
 *
 * Called from storefront browser via Shopify App Proxy:
 *   Browser → /apps/eyesupply/api/dependant
 *
 * The App Proxy automatically adds shop/customer context via signed headers.
 * We use authenticate.public.appProxy() to get admin API access.
 *
 * GET  ?customerId=<gid>   → list dependants (customerId can come from client or header)
 * POST { firstName, lastName, customerId? } → create dependant
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate, unauthenticated } from "../shopify.server";
import { safeGraphql } from "../utils/graphqlHandler";

interface DependantEntry {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
} as const;

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

function getNumericCustomerId(id: string): string {
  if (!id) return "";
  if (id.includes("gid://shopify/Customer/")) {
    return id.split("/").pop() || "";
  }
  return id;
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

const EXPOSE_METAFIELD_STOREFRONT = `#graphql
  mutation metafieldStorefrontVisibilityCreate($input: MetafieldStorefrontVisibilityInput!) {
    metafieldStorefrontVisibilityCreate(input: $input) {
      metafieldStorefrontVisibility {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// ─── GET /api/dependant?customerId=<gid> ──────────────────────────────────────

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  let admin: any;
  let shop: string;
  try {
    const result = await authenticate.public.appProxy(request) as any;
    admin = result?.admin;
    shop = result?.session?.shop || "";
  } catch {
    return ok({ error: "Auth failed" }, 401);
  }
  if (!admin || !shop) return ok([]);

  const url = new URL(request.url);
  const rawCustomerId = url.searchParams.get("customerId");
  console.log("[api.dependant] loader request for customerId:", rawCustomerId, "Shop:", shop);
  if (!rawCustomerId) return ok({ error: "customerId required" }, 400);

  const gid = `gid://shopify/Customer/${getNumericCustomerId(rawCustomerId)}`;

  try {
    const json = await safeGraphql(admin, GET_CUSTOMER_METAFIELD_ADMIN, { id: gid });
    
    if (json.errors) {
      console.error("[api.dependant] Admin GraphQL Errors:", JSON.stringify(json.errors, null, 2));
      return ok([]);
    }
    const value = json?.data?.customer?.metafield?.value;
    if (!value) return ok([]);
    const dependants = JSON.parse(value);
    return ok(dependants);
  } catch (e) {
    console.error("[api.dependant] loader error:", e);
    return ok([]);
  }
}

// ─── POST /api/dependant ──────────────────────────────────────────────────────

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "POST") return ok({ error: "Method not allowed" }, 405);

  let admin: any;
  try {
    const result = await authenticate.public.appProxy(request);
    admin = result.admin;
  } catch {
    return ok({ error: "Auth failed" }, 401);
  }
  if (!admin) return ok({ error: "Unauthorized" }, 401);

  let body: { firstName?: string; lastName?: string; customerId?: string };
  try { body = await request.json(); }
  catch { return ok({ error: "Invalid JSON" }, 400); }

  const { firstName, lastName, customerId } = body;
  if (!firstName?.trim() || !lastName?.trim() || !customerId?.trim()) {
    return ok({ error: "firstName, lastName and customerId required" }, 400);
  }

  const numericId = getNumericCustomerId(customerId.trim());
  const gid = `gid://shopify/Customer/${numericId}`;

  try {
    // 1. Fetch current (using Admin for write consistency)
    const getJson = await safeGraphql(admin, GET_CUSTOMER_METAFIELD_ADMIN, { id: gid });
    const value = getJson?.data?.customer?.metafield?.value;
    let dependants: DependantEntry[] = [];
    if (value) {
      try { dependants = JSON.parse(value); } catch {}
    }

    // 2. Add new
    const newDep: DependantEntry = {
      id: Date.now(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      full_name: `${firstName.trim()} ${lastName.trim()}`
    };
    const updated = [newDep, ...dependants];

    // 3. Save
    const updateJson = await safeGraphql(admin, SET_METAFIELDS, {
      metafields: [
        {
          ownerId: gid,
          namespace: "custom",
          key: "dependants",
          type: "json",
          value: JSON.stringify(updated)
        }
      ]
    });

    const errors = updateJson?.data?.metafieldsSet?.userErrors;
    if (errors?.length) return ok({ errors }, 422);

    return ok(newDep, 201);
  } catch (e) {
    console.error("[api.dependant] action error:", e);
    return ok({ error: "Server error" }, 500);
  }
}

// ─── POST /api/dependant/setup (Optional: Expose Metafield) ──────────────────
// To be called once to allow Storefront API access
export async function exposeToStorefront(admin: any) {
  try {
    const json = await safeGraphql(admin, EXPOSE_METAFIELD_STOREFRONT, {
      input: {
        namespace: "custom",
        key: "dependants",
        ownerType: "CUSTOMER"
      }
    });
    console.log("[api.dependant] Storefront Visibility response:", JSON.stringify(json, null, 2));
    return json;
  } catch (e) {
    console.error("[api.dependant] Failed to expose metafield:", e);
    throw e;
  }
}
