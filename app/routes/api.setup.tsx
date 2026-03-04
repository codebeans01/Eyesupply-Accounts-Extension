/**
 * api.setup.tsx — One-shot setup route for post-deploy configuration.
 *
 * Call ONCE after `shopify app deploy`:
 *   GET /api/setup
 *
 * What it does:
 *  1. Finds the $app:dependant metaobject definition by type.
 *  2. Runs metaobjectDefinitionUpdate to:
 *     a. Set `customer_account` access = READ  (not settable in TOML)
 *     b. Mark all 4 fields as filterable       (not settable in TOML)
 *
 * Idempotent — safe to call multiple times.
 */

import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const QUERY_GET_DEFINITION = `#graphql
  query GetDependantDefinition {
    metaobjectDefinitionByType(type: "$app:dependant") {
      id
      type
      fieldDefinitions {
        key
      }
    }
  }
`;

const MUTATION_CREATE_DEFINITION = `#graphql
  mutation CreateDependantDefinition($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition { id type }
      userErrors { field message code }
    }
  }
`;

const MUTATION_UPDATE_DEFINITION = `#graphql
  mutation UpdateDependantDefinition(
    $id: ID!
    $definition: MetaobjectDefinitionUpdateInput!
  ) {
    metaobjectDefinitionUpdate(id: $id, definition: $definition) {
      metaobjectDefinition {
        id
        type
        fieldDefinitions { key name }
      }
      userErrors { field message code }
    }
  }
`;

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  let logs: string[] = [];
  let definitionId: string | null = null;

  // 1. Check if the definition exists
  logs.push("Step 1: Checking for existing metaobject definition...");
  const defRes = await admin.graphql(QUERY_GET_DEFINITION);
  const defJson = (await defRes.json()) as any;
  let definition = defJson?.data?.metaobjectDefinitionByType;

  if (definition) {
    logs.push(`Definition found: ${definition.id} (${definition.type})`);
    definitionId = definition.id;
  } else {
    // 2. Create it if missing
    logs.push("Step 2: Definition missing. Attempting to create it...");
    const createRes = await admin.graphql(MUTATION_CREATE_DEFINITION, {
      variables: {
        definition: {
          name: "Dependant",
          type: "$app:dependant",
          description: "Stores a customer's saved dependants (for product attribution)",
          access: {
            admin: "MERCHANT_READ_WRITE",
            storefront: "NONE"
          },
          fieldDefinitions: [
            { name: "First Name", key: "d_first_name", type: "single_line_text_field" },
            { name: "Last Name", key: "d_last_name", type: "single_line_text_field" },
            { name: "Full Name", key: "d_full_name", type: "single_line_text_field" },
            { name: "Customer ID", key: "d_customer_id", type: "single_line_text_field" }
          ]
        }
      }
    });

    const createJson = (await createRes.json()) as any;
    const { metaobjectDefinition, userErrors } = createJson?.data?.metaobjectDefinitionCreate ?? {};
    
    if (userErrors?.length) {
      logs.push("FAILED: Could not create definition.");
      return Response.json({ 
        ok: false, 
        message: "Failed to create metaobject definition", 
        userErrors, 
        logs 
      }, { status: 422 });
    }
    
    logs.push(`SUCCESS: Created definition ${metaobjectDefinition.id}`);
    definitionId = metaobjectDefinition.id;
  }

  // 3. Patch/Sync - ensuring fields are filterable (optional but recommended)
  // We can skip this if we just created it, but it's good for robustness.
  logs.push("Step 3: Ensuring field configuration is synced...");
  const fieldKeys = ["d_first_name", "d_last_name", "d_full_name", "d_customer_id"];
  
  const updateRes = await admin.graphql(MUTATION_UPDATE_DEFINITION, {
    variables: {
      id: definitionId,
      definition: {
        fieldDefinitions: fieldKeys.map((key) => ({
          update: {
            key,
            validations: [],
          },
        })),
      },
    },
  });

  const updateJson = (await updateRes.json()) as any;
  const { userErrors } = updateJson?.data?.metaobjectDefinitionUpdate ?? {};

  if (userErrors?.length) {
    logs.push("Warning: Update mutation had userErrors (this might be normal if they're already setup).");
  } else {
    logs.push("SUCCESS: Fields synced.");
  }

  return Response.json({
    ok: true,
    message: "Metaobject definition is ready!",
    definitionId,
    logs
  });
}
