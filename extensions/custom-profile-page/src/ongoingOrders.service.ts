import { fetchCustomOrderStatusesProxy, getNumericId } from "./helpers";
import { CustomOrderStatusResponse } from "./interface";

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
): Promise<Record<string, string>> {
  if (!api || !shopDomain || !orderIds || orderIds.length === 0) {
    console.warn("[Custom-Status] Missing required params:", { hasApi: !!api, shopDomain, orderCount: orderIds?.length });
    return {};
  }

  const numericIds = orderIds.map(id => parseInt(getNumericId(id), 10)).filter(id => !isNaN(id));

  if (numericIds.length === 0) return {};

  try {
    const sessionToken = await api.sessionToken.get();

    const result: CustomOrderStatusResponse | null = await fetchCustomOrderStatusesProxy(sessionToken, shopDomain, numericIds);
    console.log('[Extension] Status proxy replied with data:', result);
    if (!result || result.success !== true || !result.orders) {
      console.warn("[Custom-Status] Proxy returned invalid data or null");
      return {};
    }

    const statuses: Record<string, string> = {};
    
    // Use the last history item's public_name as the status
    Object.entries(result.orders).forEach(([orderId, orderData]) => {
      if (orderData && orderData.history && Array.isArray(orderData.history) && orderData.history.length > 0) {
        // Get the last status from the history array
        const lastStatus = orderData.history[orderData.history.length - 1];
        if (lastStatus && lastStatus.public_name) {
          // We use both GID and numeric ID as keys for flexibility
          const gid = `gid://shopify/Order/${orderId}`;
          statuses[gid] = lastStatus.public_name;
          statuses[String(orderId)] = lastStatus.public_name;
        }
      }
    });

    return statuses;
  } catch (error) {
    console.error("[Custom-Status] Fetch failed through proxy:", error);
    return {};
  }
}