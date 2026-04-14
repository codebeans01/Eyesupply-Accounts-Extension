import { fetchCustomOrderStatusesProxy, getNumericId } from "./helpers";
import { CustomOrderStatusResponse, OrderStatusHistoryItem } from "./interface";

export interface CustomOrderStatusData {
  public_name: string;
  history: OrderStatusHistoryItem[];
}

export interface OngoingOrder {
  id: string;
  name: string;
  createdAt: string;
  email: string;
  totalPrice: string;
  currencyCode: string;
  fulfillmentStatus: string;
  financialStatus: string;
  lineItemsCount: number;
  image: string | null;
  currentStatus: string | null;
}

export interface OngoingOrdersResponse {
  orders: OngoingOrder[];
  authenticated: boolean;
  statuses: any[];
}

/**
 * Fetch real-time statuses from the custom order status API via proxy
 */
export async function fetchCustomOrderStatuses(
  api: any, 
  shopDomain: string, 
  orderIds: string[]
): Promise<Record<string, CustomOrderStatusData>> {
  if (!api || !shopDomain || !orderIds || orderIds.length === 0) {
    console.warn("[Custom-Status] Missing required params:", { hasApi: !!api, shopDomain, orderCount: orderIds?.length });
    return {};
  }

  const numericIds = orderIds.map(id => parseInt(getNumericId(id), 10)).filter(id => !isNaN(id));

  if (numericIds.length === 0) return {};

  try {
    const sessionToken = await api.sessionToken.get();

    const result: CustomOrderStatusResponse | null = await fetchCustomOrderStatusesProxy(sessionToken, shopDomain, numericIds);
  
    if (!result || result.success !== true || !result.orders) {
      console.warn("[Custom-Status] Proxy returned invalid data or null");
      return {};
    }

    const statuses: Record<string, CustomOrderStatusData> = {};
    
    // Extract history and the latest public_name
    Object.entries(result.orders).forEach(([orderId, orderData]) => {
      if (orderData && orderData.history && Array.isArray(orderData.history) && orderData.history.length > 0) {
        // Get the last status from the history array (it's the top one in the requested JSON but let's be sure)
        const history = orderData.history;
        const currentStatus = history[0]; // Assuming latest first based on snippet

        if (currentStatus && currentStatus.public_name) {
          const gid = `gid://shopify/Order/${orderId}`;
          const data = {
            public_name: currentStatus.public_name,
            history: history
          };
          statuses[gid] = data;
          statuses[String(orderId)] = data;
        }
      }
    });

    return statuses;
  } catch (error) {
    console.error("[Custom-Status] Fetch failed through proxy:", error);
    return {};
  }
}