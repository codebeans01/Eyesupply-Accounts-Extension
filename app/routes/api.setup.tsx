import type { LoaderFunctionArgs } from "react-router";
import { safeGraphql } from "app/utils/graphqlHandler";
import { standardResponse, errorResponse } from "app/utils/response";
import { authenticate } from "app/shopify.server";

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

export async function loader({ request }: LoaderFunctionArgs) {
  let admin: any;
  try {
    const authResult = await authenticate.admin(request);
    admin = authResult.admin;
  } catch (e: any) {
    return errorResponse("Admin authentication failed", { status: 401, details: e.message });
  }

  let logs: string[] = [];
  let definitionId: string | null = null;

  try {
    logs.push("Step 1: Checking for existing metaobject definition...");
    const defJson = await safeGraphql(admin, QUERY_GET_DEFINITION);
    
    if (defJson.errors) {
        return errorResponse("Failed to query metaobject definition", { status: 500, details: defJson.errors });
    }

    let definition = defJson?.data?.metaobjectDefinitionByType;

    if (definition) {
      logs.push(`Definition found: ${definition.id} (${definition.type})`);
      definitionId = definition.id;
    } else {
      logs.push("Step 2: Definition missing. Attempting to create it...");
      const createJson = await safeGraphql(admin, MUTATION_CREATE_DEFINITION, {
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
      });

      const { metaobjectDefinition, userErrors } = createJson?.data?.metaobjectDefinitionCreate ?? {};
      
      if (userErrors?.length) {
        logs.push("FAILED: Could not create definition.");
        return standardResponse({ 
          ok: false, 
          message: "Failed to create metaobject definition", 
          userErrors, 
          logs 
        }, { status: 422 });
      }
      
      logs.push(`SUCCESS: Created definition ${metaobjectDefinition.id}`);
      definitionId = metaobjectDefinition.id;
    }

    logs.push("Step 3: Ensuring field configuration is synced...");
    const fieldKeys = ["d_first_name", "d_last_name", "d_full_name", "d_customer_id"];
    
    const updateJson = await safeGraphql(admin, MUTATION_UPDATE_DEFINITION, {
      id: definitionId,
      definition: {
        fieldDefinitions: fieldKeys.map((key) => ({
          update: {
            key,
            validations: [],
          },
        })),
      },
    });

    const userErrors = updateJson?.data?.metaobjectDefinitionUpdate?.userErrors;

    if (userErrors?.length) {
      logs.push("Warning: Update mutation had userErrors (this might be normal if they're already setup).");
    } else {
      logs.push("SUCCESS: Fields synced.");
    }

    return standardResponse({
      ok: true,
      message: "Metaobject definition is ready!",
      definitionId,
      logs
    });

  } catch (error: any) {
    console.error("[api.setup] Setup error:", error);
    return errorResponse("Setup failed unexpectedy", { details: error.message, status: 500 });
  }
}
