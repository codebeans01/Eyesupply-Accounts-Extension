import { h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import '@shopify/ui-extensions/preact';
import { fetchAdditionalOrders, loadCustomerData } from "../loadCustomerData";
import { fetchCustomOrderStatuses } from "../ongoingOrders.service";
import { fetchReorderResult } from "../reorder.service";
import { getNumericId, getSettings } from "../helpers";
import { type Order, type DashboardSettings, CustomOrderStatusData, ApiProps } from "../interface";
import { DEFAULT_SETTINGS, DISPLAY_768_GRID, DISPLAY_768_NONE_GRID } from "../constants";



export function TrackOrderPage({ api }: ApiProps) {
  const [loading, setLoading] = useState(true);
  const [ongoingOrders, setOngoingOrders] = useState<Order[]>([]);
  const [customStatuses, setCustomStatuses] = useState<Record<string, CustomOrderStatusData>>({});
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const [reorderLoadingId, setReorderLoadingId] = useState<string | null>(null);
  const [dynamicSettings, setDynamicSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);
  const [myshopifyDomain, setMyshopifyDomain] = useState("");

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        // Fetch settings and customer data (for domain)
        const [settingsRes, customerData] = await Promise.all([
          getSettings(api),
          loadCustomerData(api, { ordersLimit: 10 })
        ]);

        if (settingsRes.settings) {
          setDynamicSettings((prev: any) => ({ ...prev, ...settingsRes.settings }));
        }

        const shopDomain = customerData.myshopifyDomain || (globalThis as any).shopify?.config?.shop || "";
        setMyshopifyDomain(shopDomain);

        const data = await fetchAdditionalOrders(10);
        setOngoingOrders(data.orders || []);
        
        const unfulfilledOrderIds = (data.orders || []).map((o: any) => o.id);
        if (unfulfilledOrderIds.length > 0 && shopDomain) {
          try {
            const statuses = await fetchCustomOrderStatuses(api, shopDomain, unfulfilledOrderIds);
            setCustomStatuses(statuses);
          } catch (err) {
            console.warn("Failed to fetch custom statuses", err);
          }
        }
      } catch (err) {
        console.error("Failed to load ongoing orders", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [api]);

  const handleReorder = async (orderId: string, orderName: string) => {
    if (!orderId) return;
    setReorderLoadingId(orderId);
    try {
      const excludeTrial = dynamicSettings?.exclude_trial_pack === true;
      const excludeVariantIds = (dynamicSettings?.exclude_variant_ids as string) || "";
      
      const result = await fetchReorderResult(
        orderId, 
        myshopifyDomain, 
        excludeTrial,
        excludeVariantIds
      );
      
      if (result.missingItems?.length !== 0) {
        api.toast?.show("Some items are unavailable. Redirecting to cart...");
        if (result.redirectUrl) {
          api.navigation.navigate(result.redirectUrl);
        }
      } else if (result.redirectUrl) {
        api.navigation.navigate(result.redirectUrl);
      }
    } catch (err) {
      console.error("Reorder failed", err);
      api.toast?.show((err as Error).message || "Reorder failed");
    } finally {
      setReorderLoadingId(null);
    }
  };

  const toggleHistory = (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleBack = () => {
    if (api.navigation?.navigate) {
      api.navigation.navigate('..');
    }
  };

  if (loading) {
    return (
      <s-page heading="Track Your Orders">
        <s-box padding="base">
          <s-stack gap="base" alignItems="center">
            <s-spinner accessibilityLabel="Loading" />
            <s-text>Loading...</s-text>
          </s-stack>
        </s-box>
      </s-page>
    );
  }

  return (
    <s-page heading="Track Your Orders">
      <s-stack gap="base">
        <s-query-container>
          <s-box padding="large" background="base" border="base" borderRadius="large" inlineSize="100%">
            {ongoingOrders.length !== 0 ? (
              <s-stack gap="large">
                <s-grid gridTemplateColumns={dynamicSettings.cb_hide_track_order_reorder ? "2fr 1.5fr 1fr" : "2fr 1fr 1fr 1fr"} display={DISPLAY_768_GRID} alignItems="center" paddingInline="base">
                  <s-text type="strong" tone="neutral">Product</s-text>
                  <s-text type="strong" tone="neutral">Status</s-text>
                  <s-text type="strong" tone="neutral">Price</s-text>
                  {!dynamicSettings.cb_hide_track_order_reorder && (
                    <s-text type="strong" tone="neutral">Action</s-text>
                  )}
                </s-grid>
                <s-box display={DISPLAY_768_GRID}>
                  <s-divider></s-divider>
                </s-box>
                {ongoingOrders.map((order) => {
                  const fulfillmentStatus = order.fulfillmentStatus || 'UNFULFILLED';
                  const displayStatus = (fulfillmentStatus.charAt(0) + fulfillmentStatus.slice(1).toLowerCase()).replace(/_/g, ' ');
                  const totalQuantity = (order.lineItems || []).reduce((acc, item) => acc + (item.quantity || 0), 0);
                  const orderPrice = order.totalPrice && api.i18n ? api.i18n.formatNumber(Number(order.totalPrice.amount), { precision: 2 }) + " " + order.totalPrice.currencyCode : "";

                  return (
                    <s-box key={order.id} padding="base" border="base" borderRadius="large">
                      <s-stack gap="base">
                        <s-grid gridTemplateColumns={dynamicSettings.cb_hide_track_order_reorder ? "2fr 1.5fr 1fr" : "2fr 1fr 1fr 1fr"} display={DISPLAY_768_GRID} alignItems="center" gap="base">
                          <s-clickable onClick={() => api.navigation.navigate(`shopify://customer-account/orders/${getNumericId(order.id)}`)}>
                            <s-stack direction="inline" gap="base" alignItems="center">
                              <s-box borderRadius="base" overflow="hidden" inlineSize="56px" blockSize="56px">
                                {order.lineItems?.[0]?.image ? (
                                  <s-image src={order.lineItems[0].image.url} alt={order.lineItems[0].name}></s-image>
                                ) : (
                                  <s-grid alignItems="center" blockSize="100%">
                                    <s-icon type="image" tone="neutral"></s-icon>
                                  </s-grid>
                                )}
                              </s-box>
                              <s-stack gap="small-100">
                                <s-text type="strong">{order.name}</s-text>
                                <s-text tone="neutral">{totalQuantity} items</s-text>
                              </s-stack>
                            </s-stack>
                          </s-clickable>
                          <s-stack gap="small-100">
                            <s-text type="strong">{customStatuses[order.id]?.public_name || displayStatus}</s-text>
                            <s-text tone="neutral">{order.processedAt ? new Date(order.processedAt).toLocaleDateString("en-GB") : ""}</s-text>
                          </s-stack>
                          <s-text type="strong">{orderPrice}</s-text>
                          {!dynamicSettings.cb_hide_track_order_reorder && (
                            <s-button 
                              variant="secondary" 
                              onClick={() => handleReorder(order.id, order.name)} 
                              loading={reorderLoadingId === order.id} 
                              disabled={reorderLoadingId !== null}
                            >
                              Reorder
                            </s-button>
                          )}
                        </s-grid>

                        {/* Accordion History for Desktop */}
                        {customStatuses[order.id]?.history && customStatuses[order.id].history.length > 0 && (
                          <s-stack gap="small-100">
                            <s-clickable onClick={() => toggleHistory(order.id)}>
                              <s-stack direction="inline" gap="small-100" alignItems="center">
                                <s-text tone="neutral" type="small">{expandedOrderIds.has(order.id) ? "Hide Status History" : "View Status History"}</s-text>
                                <s-icon type={expandedOrderIds.has(order.id) ? "chevron-up" : "chevron-down"} tone="neutral"></s-icon>
                              </s-stack>
                            </s-clickable>
                            
                            {expandedOrderIds.has(order.id) && (
                              <s-box paddingBlockStart="small" paddingInlineStart="base">
                                <s-stack gap="small">
                                  {customStatuses[order.id].history.map((item, idx) => (
                                    <s-box key={idx} padding="base" background="subdued" borderRadius="base" border="base">
                                      <s-stack gap="small-100">
                                        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                                          <s-text type="strong" tone={item.status_id === 3 ? "success" : "neutral"}>{item.public_name}</s-text>
                                          <s-text tone="neutral" type="small">{item.changed_at ? new Date(item.changed_at).toLocaleString('en-GB') : ""}</s-text>
                                        </s-stack>
                                        {item.public_notes && (
                                          <s-text tone="neutral">{item.public_notes}</s-text>
                                        )}
                                      </s-stack>
                                    </s-box>
                                  ))}
                                </s-stack>
                              </s-box>
                            )}
                          </s-stack>
                        )}

                        <s-grid gridTemplateColumns="1fr auto" display={DISPLAY_768_NONE_GRID} gap="small">
                          <s-clickable onClick={() => api.navigation.navigate(`shopify://customer-account/orders/${getNumericId(order.id)}`)}>
                            <s-stack direction="inline" gap="base">
                              <s-box borderRadius="base" overflow="hidden" inlineSize="52px" blockSize="52px">
                                {order.lineItems?.[0]?.image ? (
                                  <s-image src={order.lineItems[0].image.url} alt={order.lineItems[0].name}></s-image>
                                ) : (
                                  <s-grid alignItems="center" blockSize="100%">
                                    <s-icon type="image" tone="neutral"></s-icon>
                                  </s-grid>
                                )}
                              </s-box>
                              <s-stack gap="small-100">
                                <s-text type="strong">{order.name}</s-text>
                                <s-text tone="neutral">{totalQuantity} items</s-text>
                                <s-text>{customStatuses[order.id]?.public_name || displayStatus}</s-text>
                                <s-text tone="neutral">{order.processedAt ? new Date(order.processedAt).toLocaleDateString("en-GB") : ""}</s-text>
                              </s-stack>
                            </s-stack>
                          </s-clickable>
                          <s-stack alignItems="end" gap="small">
                            <s-text type="strong">{orderPrice}</s-text>
                            {!dynamicSettings.cb_hide_track_order_reorder && (
                              <s-button 
                                variant="secondary" 
                                onClick={() => handleReorder(order.id, order.name)} 
                                loading={reorderLoadingId === order.id} 
                                disabled={reorderLoadingId !== null}
                              >
                                Reorder
                              </s-button>
                            )}
                          </s-stack>
                        </s-grid>

                        {/* Accordion History for Mobile */}
                        {customStatuses[order.id]?.history && customStatuses[order.id].history.length > 0 && (
                          <s-stack gap="small-100" display={DISPLAY_768_NONE_GRID}>
                             <s-clickable onClick={() => toggleHistory(order.id)}>
                              <s-stack direction="inline" gap="small-100" alignItems="center">
                                <s-text tone="neutral" type="small">{expandedOrderIds.has(order.id) ? "Hide Status History" : "View Status History"}</s-text>
                                <s-icon type={expandedOrderIds.has(order.id) ? "chevron-up" : "chevron-down"} tone="neutral"></s-icon>
                              </s-stack>
                            </s-clickable>
                            {expandedOrderIds.has(order.id) && (
                              <s-box paddingBlockStart="small">
                                <s-stack gap="small">
                                  {customStatuses[order.id].history.map((item, idx) => (
                                    <s-box key={idx} padding="base" background="subdued" borderRadius="base" border="base">
                                      <s-stack gap="small-100">
                                        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                                          <s-text type="strong" tone={item.status_id === 3 ? "success" : "neutral"}>{item.public_name}</s-text>
                                          <s-text tone="neutral" type="small">{item.changed_at ? new Date(item.changed_at).toLocaleString('en-GB') : ""}</s-text>
                                        </s-stack>
                                        {item.public_notes && (
                                          <s-text tone="neutral">{item.public_notes}</s-text>
                                        )}
                                      </s-stack>
                                    </s-box>
                                  ))}
                                </s-stack>
                              </s-box>
                            )}
                          </s-stack>
                        )}
                      </s-stack>
                    </s-box>
                  );
                })}
              </s-stack>
            ) : (
              <s-stack padding="base" direction="inline" alignItems="center" justifyContent="center">
                <s-text tone="neutral">{dynamicSettings.cb_fallback_no_ongoing_orders || "No ongoing orders found."}</s-text>
              </s-stack>
            )}
          </s-box>
        </s-query-container>
        <s-button onClick={handleBack} variant="secondary">Back</s-button>
      </s-stack>
    </s-page>
  );
}