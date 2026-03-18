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

  const json = (await fetchWithRetry(endpoint, {
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
  })) as GraphQLResponse<{ customer: CustomerDataQueryResponse['customer']; shop: { myshopifyDomain: string } }>;

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

  const ordersNodes = customer.orders?.nodes ?? [];

  const customerSummary: CustomerSummary = {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.emailAddress?.emailAddress ?? null,
    phone: customer.phoneNumber?.phoneNumber ?? null,
  };

  const orders: Order[] = ordersNodes.map((order) => ({
    id: order.id,
    name: order.name,
    processedAt: order.processedAt,
    fulfillmentStatus: order.fulfillmentStatus,
    totalPrice: {
      amount: order.totalPrice.amount,
      currencyCode: order.totalPrice.currencyCode,
    },
    daysTillRunOut: (order as any).daysTillRunOut?.value ?? null,
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
  const res = await fetchWithRetry(
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

  if (!res.ok) {
    throw new Error(`Reorder API failed: ${res.status}`);
  }

  return res.json(); // { redirectUrl: string }
}