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
import { authenticate } from "../shopify.server";

interface MetaobjectField { key: string; value: string; }
interface MetaobjectNode { id: string; fields: MetaobjectField[]; }

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
} as const;

function fv(fields: MetaobjectField[], key: string) {
  return fields.find((f) => f.key === key)?.value ?? "";
}

function toEntry(n: MetaobjectNode) {
  return {
    id: n.id,
    first_name: fv(n.fields, "d_first_name"),
    last_name: fv(n.fields, "d_last_name"),
    full_name: fv(n.fields, "d_full_name"),
  };
}

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

// GraphQL queries validated ✅
const LIST_QUERY = `#graphql
  query ListDeps($type: String!, $first: Int!) {
    metaobjects(type: $type, first: $first) {
      nodes { id fields { key value } }
    }
  }
`;

const CREATE_MUTATION = `#graphql
  mutation CreateDep($input: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $input) {
      metaobject { id fields { key value } }
      userErrors { field message }
    }
  }
`;

function getNumericCustomerId(id: string): string {
  if (!id) return "";
  if (id.includes("gid://shopify/Customer/")) {
    return id.split("/").pop() || "";
  }
  return id;
}

// ─── GET /api/dependant?customerId=<gid> ──────────────────────────────────────

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  let admin: Awaited<ReturnType<typeof authenticate.public.appProxy>>["admin"];
  try {
    const result = await authenticate.public.appProxy(request);
    admin = result.admin;
  } catch {
    return ok({ error: "Auth failed" }, 401);
  }

  if (!admin) return ok([]);

  const url = new URL(request.url);
  const rawCustomerId = url.searchParams.get("customerId");
  if (!rawCustomerId) return ok({ error: "customerId required" }, 400);

  const customerId = getNumericCustomerId(rawCustomerId);

  try {
    const res = await admin.graphql(LIST_QUERY, {
      variables: { type: "$app:dependant", first: 250 },
    });
    const json = await res.json();
    const nodes: MetaobjectNode[] = json?.data?.metaobjects?.nodes ?? [];
    const filtered = nodes
      .filter((n) => getNumericCustomerId(fv(n.fields, "d_customer_id")) === customerId)
      .map(toEntry);
    return ok(filtered);
  } catch (e) {
    console.error("[api.dependant] loader error:", e);
    return ok([]);
  }
}

// ─── POST /api/dependant ──────────────────────────────────────────────────────

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (request.method !== "POST") return ok({ error: "Method not allowed" }, 405);

  let admin: Awaited<ReturnType<typeof authenticate.public.appProxy>>["admin"];
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

  const fullName = `${firstName.trim()} ${lastName.trim()}`;

  try {
    const res = await admin.graphql(CREATE_MUTATION, {
      variables: {
        input: {
          type: "$app:dependant",
          fields: [
            { key: "d_first_name", value: firstName.trim() },
            { key: "d_last_name", value: lastName.trim() },
            { key: "d_full_name", value: fullName },
            { key: "d_customer_id", value: getNumericCustomerId(customerId.trim()) },
          ],
        },
      },
    });
    const json = await res.json();
    const { metaobject, userErrors } = json?.data?.metaobjectCreate ?? {};
    if (userErrors?.length) return ok({ errors: userErrors }, 422);
    return ok(toEntry(metaobject as MetaobjectNode), 201);
  } catch (e) {
    console.error("[api.dependant] action error:", e);
    return ok({ error: "Server error" }, 500);
  }
}
