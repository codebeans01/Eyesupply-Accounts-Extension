import { CUSTOMER_DATA_QUERY } from "./graphql-query";
import { API_VERSION, fetchWithRetry, APP_URL } from "./helpers";
import { CustomerDataQueryResponse, CustomerSummary, GraphQLResponse, LoadCustomerDataParams, LoadCustomerDataResult, Order, LineItem } from "./interface";


export async function loadCustomerData(
  params: LoadCustomerDataParams = {},
): Promise<LoadCustomerDataResult> {
  const {
    ordersLimit = 5,
    lineItemsLimit = 10,
  } = params;

  const endpoint = `shopify://customer-account/api/${API_VERSION}/graphql.json`;

  const result = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: CUSTOMER_DATA_QUERY,
      variables: {
        ordersFirst: ordersLimit,
        lineItemsFirst: lineItemsLimit,
      },
    }),
  });

  const json = result.data as GraphQLResponse<{ customer: CustomerDataQueryResponse['customer']; shop: { myshopifyDomain: string } }>;

  if (json.errors && json.errors.length > 0) {
    console.error('GraphQL errors:', json.errors);
    throw new Error('Customer Account API GraphQL error');
  }

  const customer = json.data?.customer ?? null;
  if (!customer) {
    return {
      customer: null,
      orders: [],
      myshopifyDomain: "",
    };
  }

  const metafieldsArray = customer.metafields ?? [];
  const metafieldMap = new Map<string, string>();
  for (const mf of metafieldsArray) {
    if (mf) {
      metafieldMap.set(`${mf.namespace}.${mf.key}`, mf.value);
    }
  }

  const ordersNodes = customer.orders?.nodes ?? [];

  const customerSummary: CustomerSummary = {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.emailAddress?.emailAddress ?? null,
    phone: customer.phoneNumber?.phoneNumber ?? null,
    daysTillRunOut: metafieldMap.get("custom.days_till_run_out") ?? null,
    medicalAidNumber: metafieldMap.get("custom.medical_aid_number") ?? null,
    medicalAidPlan: metafieldMap.get("custom.medical_aid_plan") ?? null,
    medicalAidName: metafieldMap.get("custom.medical_aid_name") ?? null,
    patientIdNumber: metafieldMap.get("custom.patient_id_number") ?? null,
  };

  const orders: Order[] = ordersNodes.map((order) => ({
    id: order.id,
    name: order.name,
    processedAt: order.processedAt,
    fulfillmentStatus: order.fulfillmentStatus,
    financialStatus: order.financialStatus,
    totalPrice: {
      amount: order.totalPrice.amount,
      currencyCode: order.totalPrice.currencyCode,
    },
    lineItems:
      order.lineItems?.nodes?.map<LineItem>((li: any) => ({
        id: li.id,
        name: li.name,
        quantity: li.quantity,
        variantTitle: li.variantTitle ?? null,
        variantId: li.variantId ?? null,
        sku: li.sku ?? null,
        image: li.image ? { url: li.image.url } : null,
        productId: li.productId ?? null,
        totalPrice: {
          amount: li.totalPrice.amount,
          currencyCode: li.totalPrice.currencyCode,
        },
        variantOptions: li.variantOptions ?? [],
        customAttributes: li.customAttributes ?? [],
      })) ?? [],
  }));

  const myshopifyDomain = json.data?.shop?.myshopifyDomain;
  return {
    customer: customerSummary,  
    orders,   
    myshopifyDomain: myshopifyDomain ?? "",  
  };
}


export async function reorder(orderId: string, sessionToken: string, shopDomain: string) {
  const result = await fetchWithRetry(
    `${APP_URL}/api/reorder-link`,
    {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionToken}`,
        "x-shop-domain": shopDomain,
      },
      body: JSON.stringify({ orderId }),
    },
  );

  if (!result.ok) {
    const errorData = result.data;
    const errorMsg = errorData?.error?.message || errorData?.message || errorData?.error || 'Unknown error';
    throw new Error(errorMsg);
  }

  return result.data; // { redirectUrl: string }
}