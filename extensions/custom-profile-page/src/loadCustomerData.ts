import { CUSTOMER_DATA_QUERY, GET_PRESCRIPTIONS_PAGINATED } from "./graphql-query";
import { API_VERSION, fetchWithRetry, APP_URL } from "./helpers";
import { CustomerDataQueryResponse, CustomerSummary, GraphQLResponse, LoadCustomerDataParams, LoadCustomerDataResult, Order, Prescription, PageInfo } from "./interface";

// Helper to parse a single prescription node
const parsePrescriptionNode = (ref: any): Prescription => {
  const gids: string[] = [];
  const imageFieldKeys = ["image_pdf_url", "prescription_file", "file", "imagePdfUrl", "prescriptionFile"];
  
  imageFieldKeys.forEach(key => {
    // Try field object (from fragment alias)
    const f = (ref as any)[key];
    if (f) {
      // Check for direct value starting with http (not common for file fields)
      if (typeof f === 'object' && f.value && f.value.startsWith("http")) gids.push(f.value);
      else if (typeof f === 'string' && f.startsWith("http")) gids.push(f);
      
      // Check for reference object (from our updated query)
      if (f.reference?.url) gids.push(f.reference.url);
      else if (f.reference?.image?.url) gids.push(f.reference.image.url);
      
      // Check for references nodes (if it was a list)
      if (f.references?.nodes) {
        f.references.nodes.forEach((n: any) => {
          const url = n.url || n.image?.url;
          if (url) gids.push(url);
        });
      }
    }
  });

  return {
    id: ref.id,
    handle: ref.handle || "",
    status: ref.status?.value || "Active",
    expiry_date: ref.expiryDate?.value || undefined,
    image_urls: gids.length > 0 ? Array.from(new Set(gids)) : undefined,
  };
};

export async function loadCustomerData(
  params: LoadCustomerDataParams = {},
): Promise<LoadCustomerDataResult> {
  const {
    ordersLimit = 5,
    lineItemsLimit = 10,
  } = params;

  const endpoint = `shopify://customer-account/api/${API_VERSION}/graphql`;

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

  const prescriptionsNodesGids: string[] = [];
  const prescriptionMetafields = customer.metafields?.filter(mf => 
    mf && (mf.namespace === "custom") && 
    ["customer_prescription", "prescription", "prescriptions"].includes(mf.key)
  ) || [];
  
  for (const mf of prescriptionMetafields) {
    if (mf.value) {
      if (mf.type === 'metaobject_reference') {
        if (mf.value.startsWith('gid://')) prescriptionsNodesGids.push(mf.value);
      } else if (mf.type === 'list.metaobject_reference') {
        try {
          const parsed = JSON.parse(mf.value);
          if (Array.isArray(parsed)) {
            parsed.forEach((v: any) => {
              if (typeof v === 'string' && v.startsWith('gid://')) prescriptionsNodesGids.push(v);
            });
          }
        } catch (e) {}
      }
    }
  }

  const uniqueGids = Array.from(new Set(prescriptionsNodesGids));
  let prescriptions: Prescription[] = [];
  const prescriptionPageInfo = prescriptionMetafields.find(mf => mf.references?.pageInfo)?.references?.pageInfo;

  if (uniqueGids.length > 0) {
    try {
      const api = (globalThis as any).shopify;
      const sessionToken = await api.sessionToken.get();
      
      const backendResponse = await fetchWithRetry(`${APP_URL}/api/prescription?ids=${encodeURIComponent(uniqueGids.join(','))}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (backendResponse.ok) {
        prescriptions = backendResponse.data.prescriptions || [];
      }
    } catch (err) {
      console.error('[loadCustomerData] Backend fetch error for prescriptions:', err);
    }
  }

  const latestPrescription = prescriptions.length > 0 ? prescriptions[0] : null;

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
    prescription: latestPrescription,
    prescriptions: prescriptions,
    prescriptionPageInfo: prescriptionPageInfo,
  };

  const orders: Order[] = (customer.orders?.nodes ?? []).map((order: any) => ({
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
      order.lineItems?.nodes?.map((li: any) => ({
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

export async function loadPrescriptions(limit: number = 10): Promise<{ prescriptions: Prescription[], prescriptionPageInfo?: PageInfo }> {
  const endpoint = `shopify://customer-account/api/${API_VERSION}/graphql`;

  const result = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: GET_PRESCRIPTIONS_PAGINATED,
      variables: {
        first: limit,
      },
    }),
  });

  const json = result.data as GraphQLResponse<{ customer: { metafields: any[] } }>;
  const customer = json.data?.customer;

  if (!customer || !customer.metafields || customer.metafields.length === 0) {
    return { prescriptions: [] };
  }

  // Extract GIDs from metafield values
  const gids: string[] = [];
  customer.metafields.forEach(mf => {
    if (!mf || !mf.value) return;
    
    // Check if it's a single reference or a list
    if (mf.type === 'metaobject_reference') {
      if (mf.value.startsWith('gid://')) gids.push(mf.value);
    } else if (mf.type === 'list.metaobject_reference') {
      try {
        const parsed = JSON.parse(mf.value);
        if (Array.isArray(parsed)) {
          parsed.forEach(v => {
            if (typeof v === 'string' && v.startsWith('gid://')) gids.push(v);
          });
        }
      } catch (e) {
        console.error('[loadPrescriptions] Failed to parse list.metaobject_reference value:', mf.value);
      }
    }
  });

  const uniqueGids = Array.from(new Set(gids));
  console.log('[loadPrescriptions] Found unique GIDs:', uniqueGids.length);
  
  if (uniqueGids.length === 0) {
    return { prescriptions: [] };
  }

  // Fetch details from backend
  try {
    const api = (globalThis as any).shopify;
    const sessionToken = await api.sessionToken.get();
    
    const backendResponse = await fetchWithRetry(`${APP_URL}/api/prescription?ids=${encodeURIComponent(uniqueGids.join(','))}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!backendResponse.ok) {
        throw new Error(`Backend returned status ${backendResponse.status}`);
    }

    const data = backendResponse.data;
    const prescriptions = data.prescriptions || [];
    
    // Get pageInfo from the first list metafield that has it (if any)
    const prescriptionPageInfo = customer.metafields.find(mf => mf?.references?.pageInfo)?.references?.pageInfo;

    return {
      prescriptions,
      prescriptionPageInfo,
    };
  } catch (err) {
    console.error('[loadPrescriptions] Backend fetch error:', err);
    throw err;
  }
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

  return result.data;
}

export async function fetchAdditionalPrescriptions(cursor: string, limit: number = 10): Promise<{ prescriptions: Prescription[], pageInfo: PageInfo }> {
  const endpoint = `shopify://customer-account/api/${API_VERSION}/graphql`;

  const result = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: GET_PRESCRIPTIONS_PAGINATED,
      variables: {
        first: limit,
        after: cursor,
      },
    }),
  });

  const json = result.data as GraphQLResponse<{ customer: { metafields: any[] } }>;
  const metafields = json.data?.customer?.metafields;
  if (!metafields || metafields.length === 0) {
    return { prescriptions: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }

  // Extract GIDs from the first available list metafield
  const gids: string[] = [];
  metafields.forEach(mf => {
    if (!mf || !mf.value) return;
    if (mf.type === 'metaobject_reference') {
      if (mf.value.startsWith('gid://')) gids.push(mf.value);
    } else if (mf.type === 'list.metaobject_reference') {
      try {
        const parsed = JSON.parse(mf.value);
        if (Array.isArray(parsed)) {
          parsed.forEach(v => {
            if (typeof v === 'string' && v.startsWith('gid://')) gids.push(v);
          });
        }
      } catch (e) {}
    }
  });

  const uniqueGids = Array.from(new Set(gids));
  const pageInfo = metafields.find(mf => mf?.references?.pageInfo)?.references?.pageInfo || { hasNextPage: false, endCursor: null };

  if (uniqueGids.length === 0) {
    return { prescriptions: [], pageInfo };
  }

  // Fetch details from backend
  try {
    const api = (globalThis as any).shopify;
    const sessionToken = await api.sessionToken.get();
    
    const backendResponse = await fetchWithRetry(`${APP_URL}/api/prescription?ids=${encodeURIComponent(uniqueGids.join(','))}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!backendResponse.ok) throw new Error(`Backend returned status ${backendResponse.status}`);

    return {
      prescriptions: backendResponse.data.prescriptions || [],
      pageInfo,
    };
  } catch (err) {
    console.error('[fetchAdditionalPrescriptions] Backend fetch error:', err);
    throw err;
  }
}