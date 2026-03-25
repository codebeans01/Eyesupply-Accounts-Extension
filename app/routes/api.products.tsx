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
      { corsHeaders: ["Authorization", "x-shop-domain"] }
    );

    corsWrapper = cors;

    const shopDomain = sessionToken.dest.replace(/^https?:\/\//, "");

    if (!shopDomain) {
      return errorResponse("Invalid shop domain", { status: 400, cors: corsWrapper });
    }

    const { storefront } = await unauthenticated.storefront(shopDomain);

    const url = new URL(request.url);
    const targetIds = url.searchParams.get("ids");

    if (!targetIds) {
      return standardResponse(
        { products: {} },
        { cors: corsWrapper }
      );
    }

    const ids = targetIds.split(",").map((x) => x.trim()).filter(id => 
      id.startsWith("gid://shopify/Product/") || 
      id.startsWith("gid://shopify/ProductVariant/")
    );

    if (ids.length === 0) {
      return standardResponse(
        { products: {} },
        { cors: corsWrapper }
      );
    }

    const productQuery = `
      query GetProducts($ids: [ID!]!) {
        nodes(ids: $ids) {
          __typename
          ... on Product {
            id
            handle
          }
          ... on ProductVariant {
            id
            product {
              id
              handle
            }
          }
        }
      }
    `;

    const response = await storefront.graphql(productQuery, {
      variables: { ids },
    });

    const result = await response.json();

    const products: Record<string, string> = {};

    for (const node of result.data?.nodes || []) {
      if (!node) continue;
      
      if (node.__typename === "Product" && node.id && node.handle) {
        products[node.id] = node.handle;
      } else if (node.__typename === "ProductVariant" && node.id && node.product?.handle) {
        products[node.id] = node.product.handle;
      } else if (node.id && node.handle) { // Fallback for simple Product match
        products[node.id] = node.handle;
      }
    }

    return standardResponse(
      { products },
      { cors: corsWrapper }
    );
  } catch (error: any) {
    console.error("Products API Error:", error);

    return errorResponse(error.message || "Unexpected error", {
      status: 500,
      cors: corsWrapper,
    });
  }
};
