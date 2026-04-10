import type { LoaderFunctionArgs } from "react-router";
import { errorResponse, handleOptions, standardResponse } from "app/utils/response";
import { authenticate, unauthenticated } from "app/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }

  let corsWrapper: any = null;

  try {
    const { sessionToken, cors } = await authenticate.public.customerAccount(
      request,
      { corsHeaders: ["Authorization", "Content-Type", "x-shop-domain"] }
    );

    corsWrapper = cors;
    const shopDomain = request.headers.get("x-shop-domain") || 
                       sessionToken.dest.replace(/^https?:\/\//, "").replace(/\/$/, "");

    if (!shopDomain) {
      return errorResponse("Invalid shop domain", { status: 400, cors: corsWrapper });
    }

    const { storefront } = await unauthenticated.storefront(shopDomain);

    const url = new URL(request.url);
    const targetIds = url.searchParams.get("ids");
    const targetHandle = url.searchParams.get("id");

    if (!targetIds && !targetHandle) {
      return standardResponse(
        { prescription: null, prescriptions: [] },
        { cors: corsWrapper }
      );
    }

    const parse = (val: string) => {
      if (!val) return [];
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [val];
      } catch {
        return [val];
      }
    };

    const normalizeDate = (dateStr: string) => {
      if (!dateStr) return dateStr;
      
      const parts = dateStr.split(/[-/.]/);
      if (parts.length !== 3) return dateStr;

      let year, month, day;

      if (parts[0].length === 4) {
        // YYYY-MM-DD
        year = parts[0];
        month = parts[1];
        day = parts[2];
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY or MM-DD-YYYY
        year = parts[2];
        const p1 = parseInt(parts[0], 10);
        const p2 = parseInt(parts[1], 10);

        if (p1 > 12) {
          // DD-MM-YYYY
          day = parts[0];
          month = parts[1];
        } else if (p2 > 12) {
          // MM-DD-YYYY
          month = parts[0];
          day = parts[1];
        } else {
          // Default to DD-MM-YYYY for ambiguous cases
          day = parts[0];
          month = parts[1];
        }
      } else {
        return dateStr;
      }

      const pad = (n: string) => n.toString().padStart(2, '0');
      return `${year}-${pad(month)}-${pad(day)}`;
    };

    // 🔥 Resolve Media IDs -> URLs
    const resolveMedia = async (ids: string[]) => {
      if (!ids.length) return [];

      const query = `
        query GetFiles($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on MediaImage {
              image { url }
            }
            ... on GenericFile {
              url
            }
          }
        }
      `;

      const res = await storefront.graphql(query, { variables: { ids } });
      const json = await res.json();

      return (
        json.data?.nodes
          ?.map((n: any) => n?.url || n?.image?.url)
          .filter(Boolean) || []
      );
    };

    const processMetaobject = async (node: any) => {
      const fields: any = {
        images: [],
        expiry_dates: [],
        statuses: [],
        customer_email: null,
      };
      
      for (const f of node.fields || []) {
        const key = f.key.toLowerCase();
        
        let refs =
          f.references?.nodes
            ?.map((n: any) => n?.url || n?.image?.url)
            .filter(Boolean) || [];
         
        // 🔥 fallback if references null
        if (!refs.length && f.value && key.includes("image_pdf_url")) {
          const ids = parse(f.value); 
          refs = await resolveMedia(ids);
        }

        if (key.includes("image_pdf_url")) {
          fields.images.push(...refs);
        }

        if (key.includes("expiry")) {
          const rawDates = parse(f.value);
          fields.expiry_dates.push(...rawDates.map(normalizeDate));
        }

        if (key.includes("status")) {
          fields.statuses.push(...parse(f.value));
        }

        if (key.includes("email")) {
          fields.customer_email = f.value;
        }
      }

      const maxLength = Math.max(
        fields.images.length,
        fields.expiry_dates.length,
        fields.statuses.length,
        1
      );

      const entries: any[] = [];

      for (let i = 0; i < maxLength; i++) {
        entries.push({
          id: `${node.id}-${i}`,
          metaobjectId: node.id,
          handle: node.handle,
          image_url: fields.images[i] || fields.images[0] || null,
          expiry_date: fields.expiry_dates[i] || fields.expiry_dates[0] || null,
          status: fields.statuses[i] || fields.statuses[0] || "Active",
          customer_email: fields.customer_email,
          updatedAt: node.updatedAt,
        });
      }

      return entries;
    };

    const sortByUpdatedAt = (list: any[]) => {
      return list.sort((a, b) => {
        const dateDiff =
          new Date(b.updatedAt || 0).getTime() -
          new Date(a.updatedAt || 0).getTime();
        
        if (dateDiff !== 0) return dateDiff;

        // Secondary sort: numeric suffix of ID (for unfolded entries within same metaobject)
        const getSuffix = (id: string) => {
          const parts = id.split("-");
          const suffix = parseInt(parts[parts.length - 1], 10);
          return isNaN(suffix) ? 0 : suffix;
        };

        return getSuffix(b.id) - getSuffix(a.id);
      });
    };

    const metaobjectQuery = `
      query GetPrescriptions($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Metaobject {
            id
            handle
            updatedAt
            fields {
              key
              value
              references(first: 20) {
                nodes {
                  ... on GenericFile { url }
                  ... on MediaImage { image { url } }
                }
              }
            }
          }
        }
      }
    `;

    let ids: string[] = [];

    if (targetIds) {
      ids = targetIds.split(",").map((x) => x.trim());
    }

    if (targetHandle && targetHandle.startsWith("gid://shopify/Metaobject/")) {
      ids = [targetHandle];
    }

    const response = await storefront.graphql(metaobjectQuery, {
      variables: { ids },
    });

    const result = await response.json();

    const prescriptions: any[] = [];

    for (const node of result.data?.nodes || []) {
      if (!node) continue;

      const entries = await processMetaobject(node);
      prescriptions.push(...entries);
    }

    const sorted = sortByUpdatedAt(prescriptions);

    return standardResponse(
      {
        prescription: sorted[0] || null,
        prescriptions: sorted,
      },
      { cors: corsWrapper }
    );
  } catch (error: any) {
    console.error("Prescription API Error:", error);

    return errorResponse(error.message || "Unexpected error", {
      status: 500,
      cors: corsWrapper,
    });
  }
};