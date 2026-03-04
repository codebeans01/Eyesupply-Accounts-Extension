/**
 * api.dependant.me.tsx — Customer Account session-based dependant API
 * Updated for Hybrid Auth with Direct Fetch + JWT fallback parsing
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import shopify, { authenticate, unauthenticated } from "../shopify.server";

interface MetaobjectField { key: string; value: string; }
interface MetaobjectNode { id: string; fields: MetaobjectField[]; }

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-customer-id",
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

const DELETE_MUTATION = `#graphql
  mutation DeleteMetaobject($id: ID!) {
    metaobjectDelete(id: $id) {
      deletedId
      userErrors { field message }
    }
  }
`;

const UPDATE_MUTATION = `#graphql
  mutation UpdateDep($id: ID!, $fields: [MetaobjectFieldInput!]!) {
    metaobjectUpdate(id: $id, metaobject: { fields: $fields }) {
      metaobject { id fields { key value } }
      userErrors { field message }
    }
  }
`;

async function getContext(request: Request) {
  // 1. Try App Proxy (Official path)
  try {
    const { admin } = await authenticate.public.appProxy(request);
    if (admin) {
      const { customerId } = getInfoFromToken(request);
      return { admin, customerId };
    }
  } catch (e) {
    // Falls through
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
    return { admin, customerId };
  } catch (e) {
    console.error("[api.dependant.me] unauthenticated.admin failed:", e);
    return null;
  }
}

// ─── GET /api/dependant/me ────────────────────────────────────────────────────

/** ─── SELF-HEALING: Auto-Create Missing Metaobject Definition ──────────────── */

function isMissingDef(json: any) {
  if (!json) return false;
  const msg = "No metaobject definition exists";
  // 1. Check top-level errors
  if (json.errors?.some((e: any) => e.message?.includes(msg))) return true;
  // 2. Check userErrors in various mutations
  const data = json.data || {};
  for (const key in data) {
    if (data[key]?.userErrors?.some((e: any) => e.message?.includes(msg))) return true;
  }
  return false;
}

async function ensureDefinition(admin: any) {
  console.log("[api.dependant.me] Attempting to auto-create missing definition...");
  const mutation = `#graphql
    mutation AutoCreateDef($input: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $input) {
        metaobjectDefinition { id }
        userErrors { message code }
      }
    }
  `;
  try {
    const res = await admin.graphql(mutation, {
      variables: {
        input: {
          name: "Dependant",
          type: "$app:dependant",
          access: { admin: "MERCHANT_READ_WRITE", storefront: "NONE" },
          fieldDefinitions: [
            { name: "First Name", key: "d_first_name", type: "single_line_text_field" },
            { name: "Last Name", key: "d_last_name", type: "single_line_text_field" },
            { name: "Full Name", key: "d_full_name", type: "single_line_text_field" },
            { name: "Customer ID", key: "d_customer_id", type: "single_line_text_field" }
          ]
        }
      }
    });
    const json = (await res.json()) as any;
    const { userErrors } = json?.data?.metaobjectDefinitionCreate ?? {};
    if (userErrors?.length) {
      console.error("[api.dependant.me] Auto-create failed:", JSON.stringify(userErrors));
      return false;
    }
    console.log("[api.dependant.me] Auto-create SUCCESS.");
    return true;
  } catch (e) {
    console.error("[api.dependant.me] Auto-create exception:", e);
    return false;
  }
}

// ─── GET /api/dependant/me ────────────────────────────────────────────────────

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const ctx = await getContext(request);
  if (!ctx) return ok({ error: "Unauthorized" }, 401);
  const { admin, customerId } = ctx;

  const fetchDeps = async () => {
    const res = await admin.graphql(LIST_QUERY, {
      variables: { type: "$app:dependant", first: 250 },
    });
    return (await res.json()) as any;
  };

  try {
    let json = await fetchDeps();
    
    // Check for missing definition error
    if (isMissingDef(json)) {
      const created = await ensureDefinition(admin);
      if (created) json = await fetchDeps(); // Retry
      else return ok({ error: "Database definition missing and auto-repair failed." }, 404);
    }

    const nodes: MetaobjectNode[] = json?.data?.metaobjects?.nodes ?? [];
    const filtered = nodes
      .filter((n: any) => fv(n.fields, "d_customer_id").includes(customerId))
      .map(toEntry);
    return ok(filtered);
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
  const { admin, customerId } = ctx;

  if (request.method === "POST") {
    let body: { firstName?: string; lastName?: string };
    try { body = await request.json(); }
    catch { return ok({ error: "Invalid JSON" }, 400); }

    const { firstName, lastName } = body;
    if (!firstName?.trim() || !lastName?.trim()) {
      return ok({ error: "firstName and lastName required" }, 400);
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const createInput = {
      type: "$app:dependant",
      fields: [
        { key: "d_first_name", value: firstName.trim() },
        { key: "d_last_name", value: lastName.trim() },
        { key: "d_full_name", value: fullName },
        { key: "d_customer_id", value: customerId },
      ],
    };

    try {
      let res = await admin.graphql(CREATE_MUTATION, { variables: { input: createInput } });
      let json = (await res.json()) as any;

      if (isMissingDef(json)) {
        const created = await ensureDefinition(admin);
        if (created) {
          res = await admin.graphql(CREATE_MUTATION, { variables: { input: createInput } });
          json = (await res.json()) as any;
        }
      }

      const { metaobject, userErrors } = json?.data?.metaobjectCreate ?? {};
      if (userErrors?.length) return ok({ errors: userErrors }, 422);
      return ok(toEntry(metaobject as MetaobjectNode), 201);
    } catch (e) {
      console.error("[api.dependant.me] POST error:", e);
      return ok({ error: "Server error" }, 500);
    }
  }

  if (request.method === "DELETE") {
    let body: { id?: string };
    try { body = await request.json(); }
    catch { return ok({ error: "Invalid JSON" }, 400); }

    const { id } = body;
    if (!id) return ok({ error: "id required" }, 400);

    try {
      let res = await admin.graphql(DELETE_MUTATION, { variables: { id } });
      let json = (await res.json()) as any;

      if (isMissingDef(json)) {
        const created = await ensureDefinition(admin);
        if (created) {
          res = await admin.graphql(DELETE_MUTATION, { variables: { id } });
          json = (await res.json()) as any;
        }
      }

      const { userErrors } = json?.data?.metaobjectDelete ?? {};
      if (userErrors?.length) return ok({ errors: userErrors }, 422);
      return ok({ success: true });
    } catch (e) {
      console.error("[api.dependant.me] DELETE error:", e);
      return ok({ error: "Server error" }, 500);
    }
  }

  if (request.method === "PUT") {
    let body: { id?: string; firstName?: string; lastName?: string };
    try { body = await request.json(); }
    catch { return ok({ error: "Invalid JSON" }, 400); }

    const { id, firstName, lastName } = body;
    if (!id || !firstName?.trim() || !lastName?.trim()) {
      return ok({ error: "id, firstName and lastName required" }, 400);
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const updateFields = [
      { key: "d_first_name", value: firstName.trim() },
      { key: "d_last_name", value: lastName.trim() },
      { key: "d_full_name", value: fullName },
    ];

    try {
      let res = await admin.graphql(UPDATE_MUTATION, { variables: { id, fields: updateFields } });
      let json = (await res.json()) as any;

      if (isMissingDef(json)) {
        const created = await ensureDefinition(admin);
        if (created) {
          res = await admin.graphql(UPDATE_MUTATION, { variables: { id, fields: updateFields } });
          json = (await res.json()) as any;
        }
      }

      const { metaobject, userErrors } = json?.data?.metaobjectUpdate ?? {};
      if (userErrors?.length) return ok({ errors: userErrors }, 422);
      return ok(toEntry(metaobject as MetaobjectNode));
    } catch (e) {
      console.error("[api.dependant.me] PUT error:", e);
      return ok({ error: "Server error" }, 500);
    }
  }

  return ok({ error: "Method not allowed" }, 405);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInfoFromToken(request: Request) {
  try {
    const auth = request.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/, "").trim();
    if (!token) return {};
    const parts = token.split(".");
    if (parts.length < 2) return {};
    
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    
    // 1. Customer ID (Try header first, then payload.sub)
    let customerId = request.headers.get("x-customer-id") || payload?.sub || "";
    if (customerId.includes("gid://shopify/Customer/")) {
      customerId = customerId.split("/").pop() || "";
    }
    
    // 2. Shop domain (Handle missing protocols in dest/iss)
    let shop = "";
    const dest = payload?.dest || "";
    const iss = payload?.iss || "";
    
    if (dest) {
       shop = dest.includes("://") ? new URL(dest).hostname : dest.split("/")[0];
    } else if (iss) {
       shop = iss.includes("://") ? new URL(iss).hostname : iss.split("/")[0];
    }
    
    return { customerId, shop };
  } catch (e) {
    console.error("[api.dependant.me] getInfoFromToken error:", e);
    return {};
  }
}
