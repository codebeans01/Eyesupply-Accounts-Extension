/**
 * batchHandler.ts — Utility to batch metafield updates.
 * Groups updates to avoid hitting rate limits for repetitive single updates.
 */
import { safeGraphql } from "./graphqlHandler";

interface MetafieldUpdate {
  ownerId: string;
  namespace: string;
  key: string;
  type: string;
  value: string;
}

const SET_METAFIELDS_BATCH = `#graphql
  mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
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

/**
 * Executes a batch of metafield updates in a single call.
 */
export async function batchMetafieldUpdate(
  admin: any,
  metafields: MetafieldUpdate[]
) {
  if (!metafields.length) return { data: { metafieldsSet: { metafields: [] } } };

  return await safeGraphql(admin, SET_METAFIELDS_BATCH, { metafields });
}
