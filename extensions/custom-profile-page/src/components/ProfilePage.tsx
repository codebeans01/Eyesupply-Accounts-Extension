import { useState, useEffect } from "preact/hooks";
import navConfig from "../navigation.json";
import { type Order, type MissingItem, type SmilePointsResponse } from "../interface";
import { loadCustomerData } from "../loadCustomerData";
import { fetchReorderResult } from "../reorder.service";
import { getNumericId, fetchSmilePoints } from "../helpers";

interface ProfilePageProps {
  api: any;
  shopDomain: string;
}

export function ProfilePage({ api, shopDomain }: ProfilePageProps) {
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [settings, setSettings] = useState(api?.settings?.value ?? {});
  const [myshopifyDomain, setMyshopifyDomain] = useState<string>(shopDomain);
  const [points, setPoints] = useState<number | null>(null);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [reorderLoadingId, setReorderLoadingId] = useState<string | null>(null);
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [reorderRedirectUrl, setReorderRedirectUrl] = useState<string | null>(null);
  const [showReorderWarning, setShowReorderWarning] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // The sandbox environment restricts window access. 
  // We use Shopify's native @container syntax instead of local state for responsiveness.

  if (!api) {
    return null;
  }
  
  const limit = 5;
  const currentShopDomain = myshopifyDomain || shopDomain;
  const fallbackCurrency = (settings?.currency as string) || 'USD';

  useEffect(() => {
    async function init() {
      setError(null);
      setLoading(true);
      try {
        const data = await loadCustomerData({
          ordersLimit: limit,
          lineItemsLimit: 250,
        });

        if (data.customer) {
          setCustomer(data.customer);
        }
        setOrders(data.orders || []);
        if (data.myshopifyDomain) {
          setMyshopifyDomain(data.myshopifyDomain);
        }
      } catch (err) {
        console.error("Failed to fetch customer data", err);
        setError(err as Error);
        api.toast?.show((err as Error).message || "Failed to load customer data");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [api]);

  useEffect(() => {
    async function getPoints() {
        if (!currentShopDomain) return;
        setPointsLoading(true);
        try {
            const sessionToken = await api.sessionToken.get();
            const data = await fetchSmilePoints(sessionToken, currentShopDomain) as SmilePointsResponse;
            if (data?.customer) {
                setPoints(data.customer.points_balance);
            }
        } catch (err) {
            console.error("Failed to fetch points", err);
        } finally {
            setPointsLoading(false);
        }
    }
    getPoints();
  }, [api, currentShopDomain]);

  useEffect(() => {
    const unsubscribe = api.settings?.subscribe?.((newSettings: any) => {
      setSettings(newSettings ?? {});
    });
    return () => unsubscribe?.();
  }, [api.settings]);

  const handleReorder = async (orderId: string, menuId?: string) => {
    if (!currentShopDomain || !orderId) return;
    
   

    setReorderLoadingId(orderId);
    setError(null);
    setShowReorderWarning(false);
    setReorderRedirectUrl(null);
    setMissingItems([]);

    try {
        const excludeTrial = settings?.exclude_trial_pack === true;
        const { redirectUrl, missingItems: missing } = await fetchReorderResult(orderId, currentShopDomain, excludeTrial);
        
        setReorderRedirectUrl(redirectUrl);
        setMissingItems(missing);

        if (missing.length > 0) {
            // Close any open modals first
            api.ui.overlay.close('all-orders-modal');
            api.ui.overlay.close('order-line-items-modal');

             // Explicitly close the popover if a menuId was provided
            if (menuId) {
              api.ui.overlay.close(menuId);
            }
            
            setShowReorderWarning(true);
            api.toast?.show("Some items are unavailable");
        } else if (redirectUrl) {
            api.navigation.navigate(redirectUrl);
        }
    } catch (err) {
        console.error("Reorder failed", err);
        api.toast?.show((err as Error).message || "Reorder failed");
    } finally {
        setReorderLoadingId(null);
    }
  };

  const handleReorderRecent = () => {
    if (orders && orders.length > 0) {
      setSelectedOrder(orders[0]);
    }
  };

  const handleCloseOrderModal = () => {
    setSelectedOrder(null);
    setSearchQuery("");
  };

  const firstName = customer?.firstName || "User";
  const lastName = customer?.lastName || "";
  const welcomeImageUrl = (settings?.cb_welcome_image_url as string) ?? "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_100x100.png";

  return (
    <s-page id="profile-dashboard" heading="My Dashboard">
      <s-query-container>
      <s-stack gap="base">
        {showReorderWarning && (
          <s-banner 
            tone="warning" 
            heading="Some products are unavailable"
            onDismiss={() => {
              setShowReorderWarning(false);
              setMissingItems([]);
            }}
          >
            <s-stack gap="base">
              <s-text>The following items from your previous order are currently out of stock and could not be added to your cart:</s-text>
              <s-stack gap="small">
                {(missingItems || []).map((item, idx) => (
                  <s-text key={idx} type="strong">• {item.name}</s-text>
                ))}
              </s-stack>
              <s-stack direction="inline" gap="small">
                {reorderRedirectUrl && (
                  <s-button
                    variant="primary"
                    onClick={() => {
                      if (reorderRedirectUrl) {
                        api.navigation.navigate(reorderRedirectUrl);
                        setShowReorderWarning(false);
                      }
                    }}
                  >
                    Proceed to Cart
                  </s-button>
                )}
                <s-button
                  variant="secondary"
                  onClick={() => {
                    setShowReorderWarning(false);
                  }}
                >
                  Dismiss
                </s-button>
              </s-stack>
            </s-stack>
          </s-banner>
        )}
        <s-banner tone="info" id="hero-banner">
          <s-grid gridTemplateColumns="@container (inline-size > 600px) '1fr auto', 1fr" alignItems="center" gap="base">
            <s-stack gap="small-200" direction="block">
              <s-heading id="hero-title">Welcome Back</s-heading>
              <s-text id="user-full-name" type="strong">
                {loading ? "Loading..." : firstName + " " + lastName}
              </s-text>
            </s-stack>
            <s-box background="base" borderRadius="base" padding="large" inlineSize="@container (inline-size > 600px) 120px, 80px">
              <s-image
                src={welcomeImageUrl}
                alt="Welcome Back"
                inlineSize="fill"
              />
            </s-box>
          </s-grid>
        </s-banner>

        {loading ? (
             <s-box padding="base" background="base" borderRadius="base">
                <s-stack gap="base">
                    <s-heading>Orders</s-heading>
                    {[1, 2, 3].map((i) => (
                        <s-box key={i} border="base" padding="base" borderRadius="large">
                            <s-grid gridTemplateColumns="@container (inline-size > 768px) 'auto 1fr 1fr auto auto', 'auto 1fr auto'" alignItems="center" gap="base">
                                <s-box background="subdued" blockSize="50px" inlineSize="50px" borderRadius="base" />
                                <s-stack gap="small-100">
                                    <s-box background="subdued" blockSize="15px" inlineSize="60px" />
                                    <s-box background="subdued" blockSize="12px" inlineSize="40px" />
                                </s-stack>
                                <s-stack gap="small-100">
                                    <s-box background="subdued" blockSize="15px" inlineSize="80px" />
                                    <s-box background="subdued" blockSize="12px" inlineSize="50px" />
                                </s-stack>
                                <s-box background="subdued" blockSize="15px" inlineSize="80px" />
                                <s-icon type="menu-horizontal" tone="neutral" />
                            </s-grid>
                        </s-box>
                    ))}
                </s-stack>
            </s-box>
        ) : (orders || []).length > 0 ? (
            <s-box padding="base" background="base" borderRadius="base">
                <s-stack gap="base">
                    <s-grid gridTemplateColumns="1fr auto" alignItems="center">
                        <s-heading>Orders</s-heading>
                        <s-button variant="secondary">
                            <s-icon type="filter" tone="neutral" />
                        </s-button>
                    </s-grid>
                    {(orders || []).slice(0, 3).map((order) => {
                        const fulfillmentStatus = order.fulfillmentStatus || 'Confirmed';
                        const displayStatus = fulfillmentStatus.charAt(0) + fulfillmentStatus.slice(1).toLowerCase();
                        const totalQty = (order.lineItems || []).reduce((acc: number, item: any) => acc + (item.quantity || 0), 0);
                        const orderPrice = (order.totalPrice && api.i18n) ? api.i18n.formatCurrency(Number(order.totalPrice.amount), {
                            currency: order.totalPrice.currencyCode || fallbackCurrency,
                        }) + " " + (order.totalPrice.currencyCode || fallbackCurrency) : "";
                        const triggerId = "trigger-" + getNumericId(order.id);
                        const menuId = "menu-" + getNumericId(order.id);
                        
                        return (
                            <s-box key={order.id} padding="base" background="base" borderRadius="large" border="base">
                                <s-grid gridTemplateColumns="@container (inline-size > 768px) 'auto 1fr 1fr auto auto', 'auto 1fr auto'" alignItems="center" gap="base">
                                    <s-box borderRadius="base" overflow="hidden" inlineSize="50px" blockSize="50px">
                                        {order.lineItems?.[0]?.image ? (
                                            <s-image src={order.lineItems[0].image.url} alt={order.lineItems[0].name} />
                                        ) : (
                                            <s-grid alignItems="center" blockSize="100%">
                                                <s-icon type="image" tone="neutral" />
                                            </s-grid>
                                        )}
                                    </s-box>
                                    
                                    <s-stack gap="small-100">
                                        <s-text type="strong">{order.name || ""}</s-text>
                                        <s-paragraph tone="neutral">
                                            {totalQty} items
                                        </s-paragraph>
                                    </s-stack>
                                    
                                    <s-stack gap="small-100">
                                        <s-text type="strong">{displayStatus}</s-text>
                                        <s-paragraph tone="neutral">
                                            {order.processedAt ? new Date(order.processedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ""}
                                        </s-paragraph>
                                    </s-stack>
                
                                    <s-text type="strong">
                                        {orderPrice}
                                    </s-text>
                
                                    <s-box>
                                         <s-button id={triggerId} variant="secondary" command="--toggle" commandFor={menuId}>
                                            <s-icon type="menu-horizontal" tone="neutral" />
                                        </s-button>
                                        <s-popover id={menuId}>
                                            <s-stack padding="base" gap="small">
                                                 <s-button variant="secondary" href={"shopify://customer-account/orders/" + getNumericId(order.id)}>View Order</s-button>
                                                 <s-button variant="secondary" command="--hide" commandFor={menuId} onClick={() => handleReorder(order.id, menuId)} loading={reorderLoadingId === order.id} disabled={reorderLoadingId !== null}>
                                                     {reorderLoadingId === order.id ? "" : "Reorder"}
                                                 </s-button>
                                            </s-stack>
                                        </s-popover>
                                    </s-box>
                                </s-grid>
                            </s-box>
                        );
                    })}
                </s-stack>
            </s-box>
        ) : null}

        <s-grid 
          id="dashboard-grid" 
          gridTemplateColumns="@container (inline-size > 640px) '1fr 1fr', 1fr" 
          gap="base"
        >
          {/* Card 1: Most Recent Order */}
          <s-box padding="base" background="subdued" borderRadius="base">
            <s-grid gridTemplateColumns="auto 1fr auto" alignItems="center" gap="base">
              <s-box background="subdued" padding="small" borderRadius="base" inlineSize="56px" blockSize="56px">
                <s-grid alignItems="center" blockSize="100%">
                  <s-icon type="cart" size="base" tone="neutral" />
                </s-grid>
              </s-box>
              <s-stack gap="small-200">
                <s-text tone="neutral">Most Recent Order</s-text>
                <s-text type="strong">{loading ? "Loading..." : ((orders || []).length > 0 ? orders[0].name : "No orders")}</s-text>
                {!loading && (orders || []).length > 0 && orders[0] && (
                  <s-text tone="neutral">
                    {(orders[0].lineItems || []).reduce((acc: number, item: any) => acc + (item.quantity || 0), 0)} items
                  </s-text>
                )}
              </s-stack>
              <s-stack direction="inline" gap="base" alignItems="center">
                <s-button 
                  variant="primary" 
                  onClick={handleReorderRecent}
                  command="--show" 
                  commandFor="order-line-items-modal"
                  
                  disabled={loading || (orders || []).length === 0}
                >
                  REORDER
                </s-button>
                <s-button 
                  variant="secondary" 
                  onClick={() => orders?.[0]?.id && handleReorder(orders[0].id)}
                  disabled={loading || (orders || []).length === 0}
                  loading={reorderLoadingId === ((orders || []).length > 0 ? orders[0].id : null)}
                >
                  <s-stack direction="inline" gap="small-200" alignItems="center">
                    <s-text tone="info" type="strong">Reorder Past Orders</s-text>
                    <s-icon type="arrow-right" size="small" tone="info" />
                  </s-stack>
                </s-button>
              </s-stack>
            </s-grid>
          </s-box>

          {/* Card 2: Days Till Run Out */}
          <s-box padding="base" background="subdued" borderRadius="base">
             <s-grid gridTemplateColumns="1fr" alignItems="center" blockSize="100%">
              <s-stack gap="small-200">
                 <s-text tone="neutral">Days Till Run Out</s-text>
                 <s-text type="strong">
                   {loading ? "Loading..." : (customer?.daysTillRunOut ? customer.daysTillRunOut + " days" : "--")} left of lenses
                 </s-text>
              </s-stack>
            </s-grid>
          </s-box>

          {/* Card 3: Loyalty Points */}
          <s-box padding="base" background="subdued" borderRadius="base">
            <s-grid gridTemplateColumns="auto 1fr auto" alignItems="center" gap="base">
              <s-box background="subdued" padding="small" borderRadius="base" inlineSize="56px" blockSize="56px">
                 <s-grid alignItems="center" blockSize="100%">
                  <s-icon type="star" size="base" tone="neutral" />
                </s-grid>
              </s-box>
              <s-text type="strong">Loyalty Points</s-text>
              <s-text type="strong">
                {pointsLoading ? "Loading..." : (points !== null ? points + " pts" : "0 pts")}
              </s-text>
            </s-grid>
          </s-box>

          {/* Card 4: Prescription Expiry */}
          <s-box padding="base" background="subdued" borderRadius="base">
            <s-grid gridTemplateColumns="auto 1fr auto" alignItems="center" gap="base">
               <s-box background="subdued" padding="small" borderRadius="base" inlineSize="56px" blockSize="56px">
                 <s-grid alignItems="center" blockSize="100%">
                  <s-icon type="calendar" size="base" tone="neutral" />
                </s-grid>
              </s-box>
              <s-text type="strong">Prescription Expiry</s-text>
              <s-text type="strong">
                {loading ? "Loading..." : (customer?.prescription?.expiry_date || "Not Available")}
              </s-text>
            </s-grid>
          </s-box>
        </s-grid>

        <s-modal
          id="all-orders-modal"
          heading="REORDER"
        >
          <s-stack gap="base" alignItems="center">
            <s-box padding="base" background="base" border="base" borderRadius="large" inlineSize="100%">
              <s-stack gap="base">
                {(orders || []).map((order, index) => {
                  const fulfillmentStatus = order.fulfillmentStatus || 'Confirmed';
                  const displayStatus = fulfillmentStatus.charAt(0) + fulfillmentStatus.slice(1).toLowerCase();
                  const totalQuantity = (order.lineItems || []).reduce((acc: number, item: any) => acc + (item.quantity || 0), 0);
                  const orderPrice = (order.totalPrice && api.i18n) ? api.i18n.formatCurrency(Number(order.totalPrice.amount), {
                    currency: order.totalPrice.currencyCode || fallbackCurrency,
                  }) + " " + (order.totalPrice.currencyCode || fallbackCurrency) : "";
                  const mTriggerId = "modal-trigger-" + getNumericId(order.id);
                  const mMenuId = "modal-menu-" + getNumericId(order.id);
                  
                  return (
                    <s-stack key={order.id} gap="base">
                      {index > 0 && <s-divider />}
                      <s-grid gridTemplateColumns="auto 1fr 1fr auto auto" alignItems="center" gap="base">
                        <s-box borderRadius="base" overflow="hidden" inlineSize="50px" blockSize="50px">
                           {order.lineItems?.[0]?.image ? (
                              <s-image src={order.lineItems[0].image.url} alt={order.lineItems[0].name} />
                            ) : (
                              <s-grid alignItems="center" blockSize="100%">
                                <s-icon type="image" tone="neutral" />
                              </s-grid>
                            )}
                        </s-box>

                        <s-stack gap="small-100">
                           <s-text type="strong">{order.name}</s-text>
                           <s-text tone="neutral">{totalQuantity} items</s-text>
                        </s-stack>

                        <s-stack gap="small-100">
                          <s-text type="strong">{displayStatus}</s-text>
                          <s-text tone="neutral">
                            {order.processedAt ? new Date(order.processedAt).toLocaleDateString('en-GB') : ""}
                          </s-text>
                        </s-stack>

                        <s-text type="strong">
                          {orderPrice}
                        </s-text>

                        <s-box>
                           <s-button id={mTriggerId} variant="secondary" command="--toggle" commandFor={mMenuId}>
                              <s-icon type="menu-horizontal" tone="neutral" />
                          </s-button>
                          <s-popover id={mMenuId}>
                              <s-stack padding="base" gap="small">
                                   <s-button variant="secondary" onClick={() => handleReorder(order.id)} loading={reorderLoadingId === order.id} disabled={reorderLoadingId !== null}>
                                       {reorderLoadingId === order.id ? "" : "Reorder"}
                                   </s-button>
                              </s-stack>
                          </s-popover>
                        </s-box>
                      </s-grid>
                    </s-stack>
                  );
                })}
              </s-stack>
            </s-box>
          </s-stack>
          <s-button
            slot="secondary-action"
            variant="secondary"
            command="--hide"
            commandFor="all-orders-modal"
          >
            Close
          </s-button>
        </s-modal>

        <s-modal 
          id="order-line-items-modal" 
          heading={`${(selectedOrder?.lineItems || []).length} items`}
          size="large"
        >
          <s-stack gap="base">
            <s-stack padding="base" direction="block" gap="small">
              <s-text-field
                label="Search"
                labelAccessibilityVisibility="hidden"
                placeholder="Search"
                icon="search"
                value={searchQuery}
                onInput={(e: any) => setSearchQuery(e.target.value)}
              />
               <s-button 
                variant="primary" 
                inlineSize="fill"
                onClick={() => selectedOrder?.id && handleReorder(selectedOrder.id)}
                loading={reorderLoadingId === selectedOrder?.id}
                disabled={reorderLoadingId !== null}
              >
                {reorderLoadingId === selectedOrder?.id ? "Processing..." : "REORDER NOW"}
              </s-button>
            </s-stack>

            <s-box blockSize="400px" overflow="auto">
              <s-stack gap="base" padding="base">
                {(selectedOrder?.lineItems || [])
                  .filter(item => 
                    !searchQuery || 
                    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (item.variantTitle && item.variantTitle.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .map((item, index) => {
                    const itemPrice = (item.totalPrice && api.i18n) ? api.i18n.formatCurrency(Number(item.totalPrice.amount), {
                      currency: item.totalPrice.currencyCode || fallbackCurrency,
                    }) : "";
                    
                    return (
                      <s-grid key={item.id || index} gridTemplateColumns="auto 1fr auto" alignItems="center" gap="base">
                        <s-box inlineSize="64px" blockSize="64px">
                          <s-product-thumbnail
                            src={item.image?.url}
                            alt={item.name}
                            totalItems={item.quantity}
                            size="base"
                          />
                        </s-box>
                        
                        <s-stack gap="small-100">
                          <s-text type="strong">{item.name}</s-text>
                          <s-text tone="neutral" type="small">
                            {item.variantTitle || 'Default'}
                          </s-text>
                        </s-stack>

                        <s-text type="strong">
                          {itemPrice}
                        </s-text>
                      </s-grid>
                    );
                  })}
              </s-stack>
            </s-box>

          </s-stack>
        </s-modal>



        <s-grid 
          id="nav-grid" 
          gridTemplateColumns="@container (inline-size > 640px) '1fr 1fr', 1fr" 
          gap="base"
        >
          {(navConfig.sections || []).map((navSection: any) => (
            <s-box key={navSection.id} id={"section-" + navSection.id} padding="base" background="base" borderRadius="base" border="base">
              <s-stack gap="base">
                <s-grid gridTemplateColumns="1fr auto">
                  <s-heading id={"heading-" + navSection.id}>{navSection.title}</s-heading>
                  <s-icon type="image" tone="neutral" />
                </s-grid>
                <s-stack gap="small">
                  {(navSection.links || []).map((link: any, index: number) => {
                    let dynamicSub = link.sub;
                    if (link.dynamicSub === "orderStatus") {
                      dynamicSub = loading ? "Loading..." : (orders || []).length + " orders";
                    } else if (link.dynamicSub === "lastOrderName") {
                      dynamicSub = "Pending";
                    } else if (link.dynamicSub === "loyaltyPoints") {
                      dynamicSub = pointsLoading ? "Loading..." : points !== null ? points + " pts" : "0 pts";
                    }

                    let href = link.href;
                    const isClickable = href && href !== "#";

                    return (
                      <s-grid key={index} gridTemplateColumns="1fr auto" alignItems="center">
                         {isClickable ? (
                           <s-clickable id={"nav-l-" + index} href={href}>
                             <s-text tone="info">{link.label}</s-text>
                           </s-clickable>
                         ) : (
                           <s-text tone="neutral">{link.label}</s-text>
                         )}
                         {dynamicSub && <s-text tone="neutral">{dynamicSub}</s-text>}
                      </s-grid>
                    );
                  })}
                </s-stack>
              </s-stack>
            </s-box>
          ))}
        </s-grid>
      </s-stack>
      </s-query-container>
    </s-page>
  );
}
