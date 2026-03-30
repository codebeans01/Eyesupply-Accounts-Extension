import { useState, useEffect } from "preact/hooks";
import navConfig from "../navigation.json";
import { type Order, type MissingItem, type SmilePointsResponse } from "../interface";
import { loadCustomerData } from "../loadCustomerData";
import { fetchReorderResult } from "../reorder.service";
import { getNumericId, fetchSmilePoints, maskPatientId } from "../helpers";

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
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [isAllOrdersModalVisible, setIsAllOrdersModalVisible] = useState(true);
  const [isLineItemsModalVisible, setIsLineItemsModalVisible] = useState(true);

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
        const excludeVariantIds = (settings?.exclude_variant_ids as string) || "";
        
        const { redirectUrl, missingItems: missing } = await fetchReorderResult(
          orderId, 
          currentShopDomain, 
          excludeTrial,
          excludeVariantIds
        );
        
        setReorderRedirectUrl(redirectUrl);
        setMissingItems(missing);

        if (missing.length > 0) {
            // Close any open modals first
            api.ui.overlay.close('all-orders-modal');
            api.ui.overlay.close('order-line-items-modal');

            // Force hide by removing from DOM (most reliable way)
            setIsAllOrdersModalVisible(false);
            setIsLineItemsModalVisible(false);

            // Fallback: close the currently active overlay to ensure UI stability
            api.ui.overlay.close();

             // Explicitly close the popover if a menuId was provided
            if (menuId) {
              api.ui.overlay.close(menuId);
            }
            
            // Brief delay allows the modal closing animation to complete 
            // before the page re-renders with the warning banner.
            setTimeout(() => {
                setShowReorderWarning(true);
                api.toast?.show("Some items are unavailable");

                // Scroll to the newly appeared banner
                // Another tiny delay ensures the banner is rendered in the DOM before scrolling
                setTimeout(() => {
                    api.navigation.navigate('#reorder-warning-banner');
                }, 100);

                // Reset render state so they can be opened again later
                setIsAllOrdersModalVisible(true);
                setIsLineItemsModalVisible(true);
            }, 200);
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
  const externaReorderLink = (settings?.external_reorder_link as string) ?? "";

  const calculateDaysRemaining = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const targetDate = new Date(dateString);
      const now = new Date();
      // Reset time components to compare only dates
      targetDate.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      
      const diffTime = targetDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch (e) {
      return null;
    }
  };

  const daysRemaining = calculateDaysRemaining(customer?.daysTillRunOut);
  const reorderButtonPosition = (settings?.cb_reorder_button_position as string) || "bottom_right";
  const cb_search_enable = (settings?.cb_search_enable as boolean) || false;

  return (
    <s-page id="profile-dashboard" heading="My Dashboard">
      <s-query-container>
      <s-stack gap="base">
        {showReorderWarning && (
          <s-banner 
            id="reorder-warning-banner"
            tone="warning" 
            heading="Reordering from an older order?"
            onDismiss={() => {
              setShowReorderWarning(false);
              setMissingItems([]);
            }}
          >
            <s-stack gap="base">
              <s-text>Because we’ve upgraded our website, older orders can’t be reordered directly through the new system. 
              Please add your items to cart manually this time. Going forward, reordering will work smoothly from your account. </s-text>
              <s-text>Need help? <s-link href={externaReorderLink} target="_blank">Click here</s-link> and we’ll load your previous order into cart for you.</s-text>

              <s-stack direction="inline" gap="small">
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
          <s-grid gridTemplateColumns="@container (inline-size > 600px) 1fr auto, 1fr" alignItems="center" gap="small">
            <s-stack gap="small-100" direction="block">
              <s-heading id="hero-title">Welcome Back</s-heading>
              <s-text id="user-full-name">
                {loading ? "Loading..." : firstName + " " + lastName}
              </s-text>
            </s-stack>
            
            <s-box 
              background="base" 
              borderRadius="base" 
              padding="small" 
              inlineSize="160px"
              blockSize="auto"
              overflow="hidden"
            >
              <s-image
                src={welcomeImageUrl}
                alt="Welcome Back"
                inlineSize="fill"
              />
            </s-box>
          </s-grid>
        </s-banner>

        

        <s-grid 
          id="dashboard-grid" 
          gridTemplateColumns="@container (inline-size > 640px) '1fr 1fr', 1fr" 
          gap="base"
        >
          {/* Card 1: Most Recent Order */}
          <s-box padding="base" background="subdued" borderRadius="base">
            <s-grid gridTemplateColumns="@container (inline-size > 500px) auto 1fr auto, 1fr" alignItems="center" gap="base">
              <s-box background="subdued" padding="small" borderRadius="base" inlineSize="56px" blockSize="56px">
                <s-grid alignItems="center" blockSize="100%">
                  <s-icon type="cart" size="base" tone="info" />
                </s-grid>
              </s-box>
              
              <s-clickable 
                onClick={handleReorderRecent}
                command="--show" 
                commandFor="order-line-items-modal"
                disabled={loading || (orders || []).length === 0}
              >
                <s-stack gap="none">
                  <s-text tone="neutral">Most Recent Order</s-text>
                  <s-text type="strong" tone="info">
                    {loading ? "Loading..." : ((orders || []).length > 0 ? orders[0].name : "No orders")}
                  </s-text>
                  {!loading && (orders || []).length > 0 && orders[0] && (
                    <s-paragraph tone="neutral">
                      {(orders[0].lineItems || []).reduce((acc: number, item: any) => acc + (item.quantity || 0), 0)} items
                    </s-paragraph>
                  )}
                </s-stack>
              </s-clickable>

              <s-stack direction="inline" gap="small" alignItems="center">
                <s-button 
                  variant="primary" 
                  onClick={() => orders?.[0]?.id && handleReorder(orders[0].id)}
                  loading={reorderLoadingId === ((orders || []).length > 0 ? orders[0].id : null)}
                  disabled={loading || (orders || []).length === 0}
                >
                  REORDER
                </s-button>
                <s-button 
                  variant="secondary" 
                  href="shopify://customer-account/orders"
                  disabled={loading || (orders || []).length === 0}
                >
                  <s-stack direction="inline" gap="small-200" alignItems="center">
                    <s-text type="strong">Reorder Past Orders</s-text>
                    <s-icon type="arrow-right" size="small" />
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
                   {loading ? "Loading..." : (daysRemaining !== null ? daysRemaining + " days" : "--")} left of lenses
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
              <s-text type="strong">My Loyality Points</s-text>
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
                      const unfulfilledOrders = (orders || []).filter(o => o.fulfillmentStatus === "UNFULFILLED");
                      dynamicSub = loading ? "Loading..." : unfulfilledOrders.length + " orders";
                    } else if (link.dynamicSub === "loyaltyPoints") {
                      dynamicSub = pointsLoading ? "Loading..." : points !== null ? points + " pts" : "0 pts";
                    } else if (link.dynamicSub === "prescriptionStatus") {
                      dynamicSub = loading ? "Loading..." : (customer?.prescription?.status || "No Active Prescription");
                    } else if (link.dynamicSub === "medicalAidNumber") {
                      dynamicSub = loading ? "Loading..." : (customer?.medicalAidNumber || "Not Available");
                    } else if (link.dynamicSub === "medicalAidPlan") {
                      dynamicSub = loading ? "Loading..." : (customer?.medicalAidPlan || "Not Available");
                    } else if (link.dynamicSub === "medicalAidName") {
                      dynamicSub = loading ? "Loading..." : (customer?.medicalAidName || "Not Available");
                    } else if (link.dynamicSub === "patientIdNumber") {
                      dynamicSub = loading ? "Loading..." : (customer?.patientIdNumber ? maskPatientId(customer.patientIdNumber) : "Not Available");
                    }

                    let href = link.href;
                    const isClickable = (href && href !== "#") || link.command;

                    const isReviewProducts = link.label === "Review Products";
                    const lastOrder = (orders || []).length > 0 ? orders[0] : null;

                    return (
                      <s-stack key={index} gap="small">
                         {isClickable ? (
                           <s-clickable 
                             id={"nav-l-" + index} 
                             href={href} 
                             command={link.command} 
                             commandFor={link.commandFor}
                           >
                             <s-grid gridTemplateColumns="1fr auto" alignItems="center">
                               <s-text tone="info">{link.label}</s-text>
                               <s-stack direction="inline" gap="small-300" alignItems="center">
                                 {dynamicSub && <s-text tone="neutral">{dynamicSub}</s-text>}
                                 {link?.dynamicSub == 'orderStatus' && <s-icon type="arrow-right" size="small" tone="info" />}
                               </s-stack>
                             </s-grid>
                           </s-clickable>
                         ) : (
                           <s-grid gridTemplateColumns="1fr auto" alignItems="center">
                             <s-text tone="neutral">{link.label}</s-text>
                             <s-stack direction="inline" gap="small-200" alignItems="center">
                               {dynamicSub && <s-text tone="neutral">{dynamicSub}</s-text>}
                             </s-stack>
                           </s-grid>
                         )}
                        {isReviewProducts && lastOrder && (
                          <s-stack gap="base" paddingBlockStart="small">
                            {(showAllReviews ? lastOrder.lineItems : lastOrder.lineItems.slice(0, 5)).map((item, idx) => {
                              const reviewTargetText = '#' + (settings?.cb_review_target || "review");
                              const storefrontUrl = item.productHandle ? `https://${currentShopDomain}/products/${item.productHandle}${reviewTargetText}` : null;
                              return (
                                <s-grid key={idx} gridTemplateColumns="1fr auto" alignItems="center" gap="small">
                                  <s-stack gap="none">
                                    <s-text type="strong">{item.name}</s-text>
                                    {item.variantTitle && <s-text tone="neutral">{item.variantTitle}</s-text>}
                                  </s-stack>
                                  {storefrontUrl && (
                                    <s-button variant="secondary" href={storefrontUrl} target="_blank">
                                      <s-text>Review</s-text>
                                    </s-button>
                                  )}
                                </s-grid>
                              );
                            })}
                            {lastOrder.lineItems.length > 5 && (
                              <s-button 
                                variant="secondary" 
                                onClick={() => setShowAllReviews(!showAllReviews)}
                              >
                                {showAllReviews ? "View Less" : `View More (${lastOrder.lineItems.length - 5} more)`}
                              </s-button>
                            )}
                          </s-stack>
                        )}
                      </s-stack>
                    );
                  })}
                </s-stack>
              </s-stack>
            </s-box>
          ))}
        </s-grid>
      </s-stack>
      </s-query-container>

      {isAllOrdersModalVisible && (
        <s-modal id="all-orders-modal" heading="Ongoing Order Status" size="max">
          <s-query-container>
            <s-stack gap="large" alignItems="center">
              
              <s-box padding="large" background="base" border="base" borderRadius="large" inlineSize="100%">
                <s-stack gap="large">
  
                  {/* Header */}
                  <s-grid gridTemplateColumns="2fr 1fr 1fr 1fr" display="@container (inline-size > 768px) grid, none" alignItems="center" paddingInline="base">
                    <s-text type="strong" tone="neutral">Product</s-text>
                    <s-text type="strong" tone="neutral">Status</s-text>
                    <s-text type="strong" tone="neutral">Price</s-text>
                    <s-text type="strong" tone="neutral">Action</s-text>
                  </s-grid>
  
                  <s-box display="@container (inline-size > 768px) block, none">
                    <s-divider />
                  </s-box>
  
                  {(orders || [])
                    .filter(o => o.fulfillmentStatus === "UNFULFILLED")
                    .map((order, index) => {
                      const fulfillmentStatus = order.fulfillmentStatus || 'UNFULFILLED';
                      const displayStatus =
                        fulfillmentStatus.charAt(0) +
                        fulfillmentStatus.slice(1).toLowerCase();
  
                      const totalQuantity = (order.lineItems || []).reduce(
                        (acc, item) => acc + (item.quantity || 0),
                        0
                      );
  
                      const orderPrice =
                        order.totalPrice && api.i18n
                          ? api.i18n.formatCurrency(
                              Number(order.totalPrice.amount),
                              {
                                currency:
                                  order.totalPrice.currencyCode || fallbackCurrency,
                              }
                            ) +
                            " " +
                            (order.totalPrice.currencyCode || fallbackCurrency)
                          : "";
  
                      return (
                        <s-box
                          key={order.id}
                          padding="base"
                          border="base"
                          borderRadius="large"
                        >
                          <s-stack gap="base">
  
                            {/* DESKTOP */}
                            <s-grid
                              gridTemplateColumns="2fr 1fr 1fr 1fr"
                              display="@container (inline-size > 768px) grid, none"
                              alignItems="center"
                              gap="base"
                            >
                              {/* Product */}
                              <s-clickable href={`shopify://customer-account/orders/${getNumericId(order.id)}`}>
                                <s-stack direction="inline" gap="base" alignItems="center">
  
                                  <s-box
                                    borderRadius="base"
                                    overflow="hidden"
                                    inlineSize="56px"
                                    blockSize="56px"
                                  >
                                    {order.lineItems?.[0]?.image ? (
                                      <s-image
                                        src={order.lineItems[0].image.url}
                                        alt={order.lineItems[0].name}
                                      />
                                    ) : (
                                      <s-grid alignItems="center" blockSize="100%">
                                        <s-icon type="image" tone="neutral" />
                                      </s-grid>
                                    )}
                                  </s-box>
  
                                  <s-stack gap="small-100">
                                    <s-text type="strong">{order.name}</s-text>
                                    <s-text tone="neutral">
                                      {totalQuantity} items
                                    </s-text>
                                  </s-stack>
  
                                </s-stack>
                              </s-clickable>
  
                              {/* Status */}
                              <s-stack gap="small-100">
                                <s-text type="strong">{displayStatus}</s-text>
                                <s-text tone="neutral">
                                  {order.processedAt
                                    ? new Date(order.processedAt).toLocaleDateString("en-GB")
                                    : ""}
                                </s-text>
                              </s-stack>
  
                              {/* Price */}
                              <s-text type="strong">{orderPrice}</s-text>
  
                              {/* Action */}
                              <s-button
                                variant="secondary"
                                onClick={() => handleReorder(order.id)}
                                loading={reorderLoadingId === order.id}
                                disabled={reorderLoadingId !== null}
                              >
                                {reorderLoadingId === order.id ? "" : "Reorder"}
                              </s-button>
                            </s-grid>
  
                            {/* MOBILE */}
                            <s-grid
                              gridTemplateColumns="1fr auto"
                              display="@container (inline-size > 768px) none, grid"
                              gap="small"
                            >
                              <s-clickable href={`shopify://customer-account/orders/${getNumericId(order.id)}`}>
                                <s-stack direction="inline" gap="base">
  
                                  <s-box
                                    borderRadius="base"
                                    overflow="hidden"
                                    inlineSize="52px"
                                    blockSize="52px"
                                  >
                                    {order.lineItems?.[0]?.image ? (
                                      <s-image
                                        src={order.lineItems[0].image.url}
                                        alt={order.lineItems[0].name}
                                      />
                                    ) : (
                                      <s-grid alignItems="center" blockSize="100%">
                                        <s-icon type="image" tone="neutral" />
                                      </s-grid>
                                    )}
                                  </s-box>
  
                                  <s-stack gap="small-100">
                                    <s-text type="strong">{order.name}</s-text>
                                    <s-text tone="neutral">
                                      {totalQuantity} items
                                    </s-text>
                                    <s-text>{displayStatus}</s-text>
                                    <s-text tone="neutral">
                                      {order.processedAt
                                        ? new Date(order.processedAt).toLocaleDateString("en-GB")
                                        : ""}
                                    </s-text>
                                  </s-stack>
  
                                </s-stack>
                              </s-clickable>
  
                              <s-stack alignItems="end" gap="small">
                                <s-text type="strong">{orderPrice}</s-text>
                                <s-button
                                  variant="secondary"
                                  onClick={() => handleReorder(order.id)}
                                  loading={reorderLoadingId === order.id}
                                  disabled={reorderLoadingId !== null}
                                >
                                  Reorder
                                </s-button>
                              </s-stack>
                            </s-grid>
  
                          </s-stack>
                        </s-box>
                      );
                    })}
                </s-stack>
              </s-box>
            </s-stack>
          </s-query-container>
        </s-modal>
      )}

      {isLineItemsModalVisible && (
        <s-modal 
          id="order-line-items-modal" 
          heading={`${(selectedOrder?.lineItems || []).reduce((acc: number, item: any) => acc + (item.quantity || 0), 0)} items`}
          size="max"
        >
          <s-query-container>
            <s-stack gap="base">
  
              {/* Search + Button - Responsive */}
              <s-stack gap="base">
                {cb_search_enable && (
                  <s-text-field
                    label="Search"
                    labelAccessibilityVisibility="visible"
                    icon="search"
                    value={searchQuery}
                    onInput={(e: any) => setSearchQuery(e.target.value)}
                  />
                )}
                
                {reorderButtonPosition.startsWith("top") && (
                   <s-box inlineSize="100%">
                    <s-stack direction="inline" justifyContent={reorderButtonPosition.endsWith("right") ? "end" : "start"}>
                      <s-button 
                        variant="primary" 
                        onClick={() => selectedOrder?.id && handleReorder(selectedOrder.id)}
                        loading={reorderLoadingId === selectedOrder?.id}
                        disabled={reorderLoadingId !== null}
                      >
                        {reorderLoadingId === selectedOrder?.id ? "Processing..." : "REORDER NOW"}
                      </s-button>
                    </s-stack>
                  </s-box>
                )}
              </s-stack>
  
  
              <s-divider />
  
              {/* Scrollable Items List */}
              <s-box padding="base">
                <s-stack gap="base">
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
                        <s-stack key={item.id || index} gap="base">
                         
                          <s-grid 
                            gridTemplateColumns="auto 1fr auto" 
                            alignItems="center" 
                            gap="@container (inline-size > 768px) base, small"
                          >
                            {/* Image with quantity badge overlay (Checkout style) */}
                            <s-product-thumbnail 
                              src={item.image?.url ?? ""} 
                              alt={item.name} 
                              totalItems={item.quantity} 
                            />
                            
                            {/* Name + Variant */}
                            <s-stack gap="small-100">
                              <s-text type="strong">{item.name}</s-text>
                              <s-text tone="neutral">
                                {item.variantTitle || 'Default'}
                              </s-text>
                            </s-stack>
  
                            {/* Price */}
                            <s-text type="strong">{itemPrice}</s-text>
                          </s-grid>
                        </s-stack>
                      );
                    })}
                </s-stack>
              </s-box>
              
              {reorderButtonPosition.startsWith("bottom") && (
                <s-stack gap="base" paddingBlockStart="base">
                  <s-divider />
                  <s-box inlineSize="100%">
                    <s-stack direction="inline" justifyContent={reorderButtonPosition.endsWith("right") ? "end" : "start"}>
                      <s-button 
                        variant="primary" 
                        onClick={() => selectedOrder?.id && handleReorder(selectedOrder.id)}
                        loading={reorderLoadingId === selectedOrder?.id}
                        disabled={reorderLoadingId !== null}
                      >
                        {reorderLoadingId === selectedOrder?.id ? "Processing..." : "REORDER NOW"}
                      </s-button>
                    </s-stack>
                  </s-box>
                </s-stack>
              )}
            </s-stack>
          </s-query-container>
        </s-modal>
      )}


    </s-page>
  );
}
