import type { LoaderFunctionArgs } from "react-router";
import { errorResponse, handleOptions, standardResponse } from "app/utils/response";
import { safeGraphql } from "app/utils/graphqlHandler";
import { authenticate, unauthenticated } from "app/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return handleOptions();
  }

  let corsWrapper: any = null;

  try {
    const { sessionToken, cors } = await authenticate.public.customerAccount(
      request,
      { corsHeaders: ["Authorization", "x-shop-domain"] }
    );
    corsWrapper = cors;

    const shopDomain = sessionToken.dest.replace(/^https?:\/\//, "");
    if (!shopDomain) {
        return errorResponse("Invalid shop domain", { status: 400, cors: corsWrapper });
    }

    const { admin } = await unauthenticated.admin(shopDomain);

    if (!admin) {
        return errorResponse("Admin API not available", { status: 500, cors: corsWrapper });
    }

    const customerGID = sessionToken.sub; 

    // 1. Fetch the customer's metafield which points to the prescription metaobject
    const customerQuery = `
      query GetCustomerPrescription($id: ID!) {
        customer(id: $id) {
          metafield(namespace: "custom", key: "customer_prescription") {
            value
          }
        }
      }
    `;

    const url = new URL(request.url);
    const queryId = url.searchParams.get("id");

    const customerResult = await safeGraphql(admin, customerQuery, { id: customerGID });
    console.log("Customer Metafield Result:", JSON.stringify(customerResult, null, 2));
    
    const metafieldValue = customerResult.data?.customer?.metafield?.value;
    
    // Prioritize queryId if available, fallback to metafieldValue
    const targetHandle = queryId || metafieldValue;

    if (!targetHandle) {
      console.log("No prescription handle found (neither in query param 'id' nor in customer metafield)");
      return standardResponse({ prescription: null }, { cors: corsWrapper });
    }
    
    console.log(`Fetching metaobject with handle/ID: ${targetHandle}`);
    
    let metaobject = null;

    if (targetHandle.startsWith("gid://shopify/Metaobject/")) {
      const metaobjectQuery = `
        query GetPrescriptionById($id: ID!) {
          metaobject(id: $id) {
            id
            fields {
              key
              value
              jsonValue
              references(first: 20) {
                nodes {
                  ... on GenericFile {
                    url
                  }
                  ... on MediaImage {
                    image {
                      url
                    }
                  }
                }
              }
            }
          }
        }
      `;
      const metaobjectResult = await safeGraphql(admin, metaobjectQuery, { id: targetHandle });
      console.log("Metaobject By ID Result:", JSON.stringify(metaobjectResult, null, 2));
      metaobject = metaobjectResult.data?.metaobject;
    } else {
      const metaobjectQuery = `
        query GetPrescription($handle: String!, $type: String!) {
          metaobjectByHandle(handle: { handle: $handle, type: $type }) {
            id
            fields {
              key
              value
              jsonValue
              references(first: 20) {
                nodes {
                  ... on GenericFile {
                    url
                  }
                  ... on MediaImage {
                    image {
                      url
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const metaobjectResult = await safeGraphql(admin, metaobjectQuery, {
        handle: targetHandle,
        type: "customer_prescription"
      });
      console.log("Metaobject By Handle Result:", JSON.stringify(metaobjectResult, null, 2));
      metaobject = metaobjectResult.data?.metaobjectByHandle;
    }

    if (!metaobject) {
       console.log(`No metaobject found for: ${targetHandle}`);
       return standardResponse({ prescription: null }, { cors: corsWrapper });
    }

    // Process fields
    const fields: any = {
        images: [],
        expiry_dates: [],
        statuses: []
    };

    console.log("Metaobject Fields:", JSON.stringify(metaobject.fields, null, 2));

    metaobject.fields.forEach((f: any) => {
      // Check for image/file references (common keys: image_pdf_url, prescription_file, file)
      if (["image_pdf_url", "prescription_file", "file"].includes(f.key)) {
        const refs = f.references?.nodes?.map((n: any) => n.url || n.image?.url).filter(Boolean) || [];
        if (refs.length > 0) {
          fields.images = [...fields.images, ...refs];
        } else if (f.value && f.value.startsWith("http")) {
             fields.images.push(f.value);
        }
      } else if (f.key === "expiry_date") {
        fields.expiry_dates = Array.isArray(f.jsonValue) ? f.jsonValue : (f.jsonValue ? [f.jsonValue] : [f.value].filter(Boolean));
      } else if (f.key === "status") {
        fields.statuses = Array.isArray(f.jsonValue) ? f.jsonValue : (f.jsonValue ? [f.jsonValue] : [f.value].filter(Boolean));
      }
    });

    const prescription = {
      image_url: fields.images?.length > 0 ? fields.images[fields.images.length - 1] : null,
      expiry_date: fields.expiry_dates?.length > 0 ? fields.expiry_dates[fields.expiry_dates.length - 1] : null,
      status: fields.statuses?.length > 0 ? fields.statuses[fields.statuses.length - 1] : null,
    };

    return standardResponse({ prescription }, { cors: corsWrapper });

  } catch (error: any) {
    console.error("Prescription API Error:", error);
    return errorResponse(
      error.message || "An unexpected error occurred", 
      { status: 500, cors: corsWrapper }
    );
  }
};
