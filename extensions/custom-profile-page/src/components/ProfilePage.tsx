import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import "@shopify/ui-extensions/preact";
import navConfig from "../navigation.json";
import { DEFAULT_SETTINGS } from "../constants";
import { type Order, type MissingItem } from "../interface";
import { loadCustomerData } from "../loadCustomerData";
import { fetchReorderResult } from "../reorder.service";
import { fetchSmilePoints, maskPatientId, calculateDaysRemaining, getNumericId } from "../helpers";

interface ProfilePageProps {
  api: any;
}

// Layout constants moved outside component to prevent JSX parser desync with literal '>' characters.
// Using hex escape \x3e for '>' to further isolate the parser from problematic characters.
const LAYOUT_768_2COL = "@container (inline-size \x3e 768px) 1fr auto, 1fr";
const LAYOUT_768_2COL_STACK = "@container (inline-size \x3e 768px) 1fr 1fr, 1fr";
const LAYOUT_768_4COL = "@container (inline-size \x3e 768px) auto 1fr auto, 1fr";
const LAYOUT_768_4COL_BLOCK = "@container (inline-size \x3e 768px) auto 1fr auto, block";
const LAYOUT_600_2COL = "@container (inline-size \x3e 600px) 1fr 1fr, 1fr";
const LAYOUT_600_4COL = "@container (inline-size \x3e 600px) auto 1fr auto 1fr, 1fr";
const LAYOUT_500_3COL = "@container (inline-size \x3e 500px) auto 1fr auto, 1fr";
const SIZE_600_RESP_200 = "@container (inline-size \x3e 600px) 200px, 80px";
const SIZE_600_RESP_100 = "@container (inline-size \x3e 600px) 100px, 80px";
const DISPLAY_768_GRID = "@container (inline-size \x3e 768px) grid, none";
const DISPLAY_768_NONE_GRID = "@container (inline-size \x3e 768px) none, grid";

export function ProfilePage({ api }: ProfilePageProps) {



  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [myshopifyDomain, setMyshopifyDomain] = useState("");
  const [points, setPoints] = useState(null);
  const [reorderLoadingId, setReorderLoadingId] = useState(null);
  const [missingItems, setMissingItems] = useState([]);
  const [reorderRedirectUrl, setReorderRedirectUrl] = useState(null);
  const [showReorderWarning, setShowReorderWarning] = useState(false);
  const [olderOrderName, setOlderOrderName] = useState(null);
  const [dynamicSettings, setDynamicSettings] = useState(DEFAULT_SETTINGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isReviewsModalVisible, setIsReviewsModalVisible] = useState(false);
  const [isAllOrdersModalVisible, setIsAllOrdersModalVisible] = useState(true);
  const [isLineItemsModalVisible, setIsLineItemsModalVisible] = useState(true);
  const [isPointsLoading, setIsPointsLoading] = useState(false);

  useEffect(() => {
    async function init() {
      setError(null);
      setLoading(true);
      try {
        const data = await loadCustomerData(api, {
          ordersLimit: 5,
          lineItemsLimit: 250,
        });

        if (data.customer) {
          setCustomer(data.customer);
          setOrders(data.orders || []);
          if (data.myshopifyDomain) setMyshopifyDomain(data.myshopifyDomain);
        }
      } catch (err) {
        console.error("Initialization failed", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function getPoints() {
      if (!customer?.email || !myshopifyDomain) return;
      setIsPointsLoading(true);
      try {
        const sessionToken = await api.sessionToken.get();
        const pointsData = await fetchSmilePoints(sessionToken, myshopifyDomain, customer.email);
         
        if (pointsData?.customer) {
          setPoints(pointsData.customer.points_balance || 0);
        }
      } catch (e) {
        console.warn("Failed to fetch points", e);
      } finally {
        setIsPointsLoading(false);
      }
    }
    getPoints();
  }, [customer?.id, customer?.email, myshopifyDomain, api.sessionToken]);

  useEffect(() => {
    async function getDynamicSettings() {
      try {
        const response = await api.query(
          `query {
            shop {
              metafield(namespace: "eyesupply_dashboard", key: "settings") {
                value
              }
            }
          }`
        );
        const metafieldValue = response?.data?.shop?.metafield?.value;
        if (metafieldValue) {
          try {
            const parsed = JSON.parse(metafieldValue);
            
            setDynamicSettings({ ...DEFAULT_SETTINGS, ...parsed });
          } catch (parseError) {
            console.error("Failed to parse dynamic settings JSON", parseError);
            setDynamicSettings(DEFAULT_SETTINGS);
          }
        }
      } catch (e) {
        console.error("Failed to fetch dynamic settings", e);
      }
    }
 
    getDynamicSettings();
  }, []);

  function resolve(text: string) {
    if (!text) return "";
    let resolved = text;
    resolved = resolved.replace(/\{\{customer\.first_name\}\}/g, customer?.firstName || "");
    resolved = resolved.replace(/\{\{customer\.last_name\}\}/g, customer?.lastName || "");
    resolved = resolved.replace(/\{\{customer\.points\}\}/g, points !== null ? points.toString() : "...");
    resolved = resolved.replace(/\{\{customer\.medical_aid_number\}\}/g, customer?.medicalAidNumber || "Not provided");
    const rawPatientId = customer?.patientIdNumber || "";
    const maskedId = maskPatientId(rawPatientId);
    resolved = resolved.replace(/\{\{customer\.patient_id\}\}/g, maskedId || "Not provided");
    
    // Days till run out conversion
    const daysRemaining = calculateDaysRemaining(customer?.daysTillRunOut);
    resolved = resolved.replace(/\{\{customer\.days_till_run_out\}\}/g, daysRemaining !== null ? daysRemaining.toString() : "...");
    
    const lastOrder = (orders.length !== 0) ? orders[0] : null;
    resolved = resolved.replace(/\{\{last_order_name\}\}/g, lastOrder?.name || "No orders yet");

    return resolved;
  }

  function resolveDynamicValue(key: string) {
    if (!key) return "";
    switch (key) {
      case "orderStatus": return (orders.length !== 0) ? `${orders.length} orders` : "0 orders";
      case "prescriptionStatus": return customer?.prescription?.status || "Completed"; 
      case "medicalAidNumber": return customer?.medicalAidNumber || "123456789";
      case "medicalAidPlan": return customer?.medicalAidPlan || "Plan";
      case "medicalAidName": return customer?.medicalAidName || "Medical Aid Name";
      case "patientIdNumber": return customer?.patientIdNumber ? maskPatientId(customer.patientIdNumber) : "2501015091000";
      case "loyaltyPoints": return isPointsLoading ? "..." : (points !== null ? points.toString() : "0");
      case "daysRemaining": {
        const days = calculateDaysRemaining(customer?.daysTillRunOut);
        return days !== null ? `${days} days` : "0 days";
      }
      default: return "";
    }
  }

  async function handleReorder(orderId: string, orderName: string, menuId?: string) {
    if (!orderId) return;

    setReorderLoadingId(orderId);
    setError(null);
    setShowReorderWarning(false);
    setReorderRedirectUrl(null);
    setMissingItems([]);

    try {
      const excludeTrial = dynamicSettings?.exclude_trial_pack === true;
      const excludeVariantIds = (dynamicSettings?.exclude_variant_ids as string) || "";
      
      const result = await fetchReorderResult(
        orderId, 
        myshopifyDomain, 
        excludeTrial,
        excludeVariantIds
      );
      
      setReorderRedirectUrl(result.redirectUrl);
      setMissingItems(result.missingItems);

      if (result.missingItems?.length !== 0) {
        api.ui.overlay.close('all-orders-modal');
        api.ui.overlay.close('order-line-items-modal');

        setIsAllOrdersModalVisible(false);
        setIsLineItemsModalVisible(false);
        setOlderOrderName(orderName);

        api.ui.overlay.close();

        if (menuId) {
          api.ui.overlay.close(menuId);
        }

        setTimeout(() => {
            setShowReorderWarning(true);
            api.toast?.show("Some items are unavailable");

            setTimeout(() => {
                api.navigation.navigate('#reorder-warning-banner');
            }, 100);
            setIsAllOrdersModalVisible(true);
            setIsLineItemsModalVisible(true);
        }, 200);
      } else if (result.redirectUrl) {
        api.navigation.navigate(result.redirectUrl);
      }
    } catch (err) {
      console.error("Reorder failed", err);
      api.toast?.show((err as Error).message || "Reorder failed");
    } finally {
      setReorderLoadingId(null);
    }
  }

  const lastOrder = (orders.length !== 0) ? orders[0] : null;
  const allReviewProducts = Array.from(new Map(
    (lastOrder?.lineItems || [])
      .filter(function(li) {
        if (!li.productId) return false;
        const nameLower = (li.name || "").toLowerCase();
        const skuLower = (li.sku || "").toLowerCase();
        if (nameLower.includes("trial pack") || skuLower.includes("trial")) return false;
        return true;
      })
      .map(function(li) { 
        return [li.variantId || li.productId, li];
      })
  ).values());

  const REVIEW_PAGE_SIZE = 5;
  const reviewProducts = allReviewProducts.slice(0, REVIEW_PAGE_SIZE);
  const remainingReviewCount = Math.max(0, allReviewProducts.length - REVIEW_PAGE_SIZE);

  const welcomeImageUrl = (dynamicSettings?.cb_welcome_image_url as string) || DEFAULT_SETTINGS.cb_welcome_image_url;
  const externalReorderLink = (dynamicSettings?.external_reorder_link as string) || DEFAULT_SETTINGS.external_reorder_link;
  const cbSearchEnabled = (dynamicSettings?.cb_search_enable as boolean) ?? DEFAULT_SETTINGS.cb_search_enable;
  const bannerEnabled = (dynamicSettings?.cb_banner_enabled as boolean) ?? true;
  const bannerTitle = resolve((dynamicSettings?.cb_banner_title as string) || "Welcome Back");
  const bannerSubtitle = resolve((dynamicSettings?.cb_banner_subtitle as string) || "{{customer.first_name}} {{customer.last_name}}");
  const bannerImageUrl = (dynamicSettings?.cb_banner_image_url as string) || welcomeImageUrl;
  const storefrontBase = myshopifyDomain ? `https://${myshopifyDomain}` : "";
  const reviewTarget = '#' + (dynamicSettings?.cb_review_target as string || DEFAULT_SETTINGS.cb_review_target);
  const showDefaultNav = dynamicSettings?.cb_show_default_nav !== false;
  
  // LOG FOR DEBUGGING 6 VS 8 SECTIONS
  useEffect(function() {
    console.log("sections count (full):", navConfig.sections?.length);
    console.log("cb_show_default_nav setting:", dynamicSettings?.cb_show_default_nav);
    console.log("showDefaultNav (effective):", showDefaultNav);
  }, [showDefaultNav, dynamicSettings]);

  const reorderButtonPosition = dynamicSettings?.cb_reorder_button_position || DEFAULT_SETTINGS.cb_reorder_button_position;

  // const filteredSections = (navConfig.sections || []).filter(function(section) {
  //     if (!showDefaultNav && (section.id === 'orders' || section.id === 'support')) return false;
  //     return true;
  // });
  const filteredSections = navConfig.sections || [];
  const sections = filteredSections.map(function(section) {
    const dynamicSection = dynamicSettings?.sections?.[section.id];
    if (!dynamicSection) return section;
    return {
      ...section,
      title: dynamicSection.title || section.title,
      links: (section.links || []).map(function(link, idx) {
        const dynamicLink = dynamicSection.links?.[idx];
        if (!dynamicLink) return link;
        return {
          ...link,
          label: dynamicLink.label || link.label,
          href: dynamicLink.href || link.href
        };
      })
    };
  });

  const lineItemsCount = (selectedOrder?.lineItems || []).reduce(function(acc, item) { 
    return acc + (item.quantity || 0); 
  }, 0);

  const showTopReorder = !!lineItemsCount && reorderButtonPosition.startsWith("top");
  const showBottomReorder = !!lineItemsCount && reorderButtonPosition.startsWith("bottom");

  const recentOrderItemsCount = (orders[0]?.lineItems || []).reduce(function(acc, li) { return acc + (li.quantity || 0); }, 0);
  const daysRemainingVal = calculateDaysRemaining(customer?.daysTillRunOut);
  const daysRemainingDisplay = (daysRemainingVal ?? "0") + " days left of lenses";
  const pointsDisplay = isPointsLoading ? "..." : (points !== null ? points + " pts" : "0 pts");

  if (loading) {
    return (
      <s-page heading="Loading Dashboard">
        <s-box padding="base">
          <s-stack direction="block" alignItems="center" gap="base">
            <s-spinner size="base"></s-spinner>
            <s-text>{"Loading..."}</s-text>
          </s-stack>
        </s-box>
      </s-page>
    );
  }

  return (
    <s-page heading="My Dashboard">
      <s-query-container>
        <s-stack direction="block" gap="base">
          {showReorderWarning && (
            <s-banner 
              id="reorder-warning"
              tone="warning"
              heading="Reordering from an older order?"
            >
              <s-stack direction="block" gap="small">
                <s-text>{"Because we’ve upgraded our website, older orders can’t be reordered directly through the new system. Please add your items to cart manually this time. Going forward, reordering will work smoothly from your account. "}</s-text>
                <s-stack direction="inline" gap="none">
                  <s-text>{"Need Help For your Order "}<s-text type="strong">{olderOrderName}</s-text></s-text>
                  {externalReorderLink && (
                    <s-text>
                      You can <s-link onClick={function() { api.navigation.navigate(externalReorderLink); }}>{"Click here"}</s-link> and we’ll load your previous order into cart for you. 
                    </s-text>
                  )}
                </s-stack>
              </s-stack>
            </s-banner>
          )}

          {bannerEnabled && (
            <s-box background="subdued" borderRadius="base" padding="base">
              <s-grid gridTemplateColumns={LAYOUT_768_2COL} gap="base" alignItems="center">
                <s-grid-item>
                  <s-stack direction="inline" gap="small" padding="small" alignItems="center">
                    <s-icon type="info" size="small" tone="neutral"></s-icon>
                    <s-stack direction="block" gap="small">
                      <s-heading>{bannerTitle}</s-heading>
                      <s-text tone="neutral">{bannerSubtitle}</s-text>
                    </s-stack>
                  </s-stack>
                </s-grid-item>
                <s-grid-item>
                  <s-stack direction="block" alignItems="center">
                    <s-box 
                      inlineSize={SIZE_600_RESP_200}  
                      blockSize={SIZE_600_RESP_100}
                      borderRadius="base" 
                      overflow="hidden"
                    >
                      <s-image 
                        src={bannerImageUrl} 
                        alt="Welcome" 
                        loading="lazy" 
                        objectFit="cover"
                      ></s-image>
                    </s-box>
                  </s-stack>
                </s-grid-item>
              </s-grid>
            </s-box>
          )}

          <s-grid gridTemplateColumns={LAYOUT_768_2COL_STACK} gap="base">
            <s-grid-item>
              <s-box background="subdued" borderRadius="base" padding="base">
                <s-grid gridTemplateColumns={LAYOUT_500_3COL} gap="base" alignItems="center">
                  <s-grid-item>
                    <s-icon type="cart" size="base"></s-icon>
                  </s-grid-item>
                  <s-grid-item>
                    <s-clickable 
                      onClick={function() { setSelectedOrder(orders[0]); }}
                      command="--show" 
                      commandFor="order-line-items-modal"
                    >
                      <s-stack direction="block" gap="none">
                        <s-text tone="neutral">{"Most Recent Order"}</s-text>
                        <s-text type="strong" tone="info">{orders[0]?.name || "#1111"}</s-text>
                        <s-text tone="neutral">{recentOrderItemsCount + " items"}</s-text>
                      </s-stack>
                    </s-clickable>
                  </s-grid-item>
                  <s-grid-item>
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <s-button 
                        variant="primary" 
                        loading={reorderLoadingId === (orders[0]?.id || "none")}
                        onClick={function() { handleReorder(orders[0]?.id, orders[0]?.name || ""); }}
                      >
                        {"REORDER"}
                      </s-button>
                      <s-button 
                        variant="secondary" 
                        href="shopify://customer-account/orders"
                      >
                        <s-stack direction="inline" gap="small-200" alignItems="center">
                          <s-text type="strong">{"Reorder Past Orders"}</s-text>
                          <s-icon type="arrow-right" size="small"></s-icon>
                        </s-stack>
                      </s-button>
                    </s-stack>
                  </s-grid-item>
                </s-grid>
              </s-box>
            </s-grid-item>
            <s-grid-item>
              <s-box background="subdued" borderRadius="base" padding="base">
                <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
                  <s-grid-item>
                    <s-stack direction="block" gap="none">
                      <s-text tone="neutral">{"Days Till Run Out"}</s-text>
                      <s-text type="strong">{daysRemainingDisplay}</s-text>
                    </s-stack>
                  </s-grid-item>
                  <s-grid-item>
                    <s-icon type="info" size="base"></s-icon>
                  </s-grid-item>
                </s-grid>
              </s-box>
            </s-grid-item>
          </s-grid>

          <s-grid gridTemplateColumns={LAYOUT_768_2COL_STACK} gap="base">
            <s-grid-item>
              <s-box background="subdued" borderRadius="base" padding="base">
                <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
                  <s-grid-item>
                    <s-icon type="star" size="base"></s-icon>
                  </s-grid-item>
                  <s-grid-item>
                    <s-text type="strong">{"My Loyalty Points"}</s-text>
                  </s-grid-item>
                  <s-grid-item>
                    <s-text type="strong">{pointsDisplay}</s-text>
                  </s-grid-item>
                </s-grid>
              </s-box>
            </s-grid-item>
            <s-grid-item>
              <s-box background="subdued" borderRadius="base" padding="base">
                <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
                  <s-grid-item>
                    <s-icon type="calendar" size="base"></s-icon>
                  </s-grid-item>
                  <s-grid-item>
                    <s-text type="strong">{"Prescription Expiry"}</s-text>
                  </s-grid-item>
                  <s-grid-item>
                    <s-text type="strong">{customer?.prescription?.expiry_date || "2027-03-09"}</s-text>
                  </s-grid-item>
                </s-grid>
              </s-box>
            </s-grid-item>
          </s-grid>

          <s-grid gridTemplateColumns={LAYOUT_768_2COL_STACK} gap="base">
            {(sections || []).map(function(section, sIdx) {
              return (
              <s-box key={sIdx} id={"section-" + sIdx} padding="base" background="base" borderRadius="base" border="base">
                <s-stack gap="base">
                  <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                    <s-grid-item>
                      <s-heading>{section.title}</s-heading>
                    </s-grid-item>
                    <s-grid-item>
                      <s-icon type={section.icon} size="base"></s-icon>
                    </s-grid-item>
                  </s-grid>
                    
                  <s-stack gap="small">
                    {(section.links || []).map(function(link, lIdx) {
                      const dynamicSub = link.dynamicSub ? resolveDynamicValue(link.dynamicSub) : "";
                      const href = link.href || "";
                      const isClickable = (href && href !== "#") || link.command;
                      return (
                        <s-stack key={lIdx} gap="small-100">
                          {isClickable ? (
                            <s-clickable 
                              id={"nav-l-" + lIdx} 
                              href={href} 
                              command={link.command} 
                              commandFor={link.commandFor}
                            >
                              <s-grid gridTemplateColumns="1fr auto" alignItems="center">
                                <s-text tone="info">{link.label}</s-text>
                                <s-stack direction="inline" gap="small-300" alignItems="center">
                                  {dynamicSub && <s-text tone="neutral">{dynamicSub}</s-text>}
                                  {link?.dynamicSub === 'orderStatus' && <s-icon type="arrow-right" size="small" tone="info"></s-icon>}
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
                        </s-stack>
                      );
                    })}
                  </s-stack>

                  {section.id === 'reviews' && reviewProducts.length !== 0 && (
                    <s-stack direction="block" gap="none">
                      <s-divider></s-divider>
                      {reviewProducts.map(function(prod, pIdx) {
                        return (
                        <s-box key={pIdx} padding="small">
                          <s-grid gridTemplateColumns={LAYOUT_768_4COL_BLOCK} gap="small" alignItems="center">
                            <s-grid-item>
                              {prod.image?.url ? 
                                <s-product-thumbnail src={prod.image?.url} alt={prod.name} size="base" totalItems={prod?.quantity}></s-product-thumbnail> : 
                                <s-icon type="image" size="large-100"></s-icon>}
                            </s-grid-item>
                            <s-grid-item>
                              <s-stack direction="block" gap="none">
                                <s-text type="strong">{prod.name}</s-text>
                                {prod.variantTitle && <s-text tone="neutral">{prod.variantTitle}</s-text>}
                              </s-stack>
                            </s-grid-item>
                            <s-grid-item>
                              <s-button
                                variant="secondary"
                                href={prod.productHandle && storefrontBase ? `${storefrontBase}/products/${prod.productHandle}${reviewTarget}` : undefined}
                                target="_blank"
                              >
                                {"Review"}
                              </s-button>
                            </s-grid-item>
                          </s-grid>
                          {((pIdx + 1) !== reviewProducts.length) && (
                            <s-stack gap="small">
                              <s-divider></s-divider>
                            </s-stack>
                          )}
                        </s-box>
                        );
                      })}
                      {((allReviewProducts.length - REVIEW_PAGE_SIZE) !== 0) && (
                        <s-box padding="small">
                          <s-divider></s-divider>
                          <s-stack direction="block" alignItems="center" paddingBlock="small">
                            <s-button 
                              variant="secondary" 
                              command="--show" 
                              commandFor="reviews-modal"
                            >
                                {"View More (" + remainingReviewCount + " more)"}
                            </s-button>
                          </s-stack>
                        </s-box>
                      )}
                    </s-stack>
                  )}
                </s-stack> 
              </s-box>      
            );
            })}
          </s-grid>
        </s-stack>
      </s-query-container>
      
      {isAllOrdersModalVisible && ( 
        <s-modal id="all-orders-modal" heading="Ongoing Order Status" size="max">
          <s-query-container>
            <s-stack gap="large" alignItems="center">
              <s-box padding="large" background="base" border="base" borderRadius="large" inlineSize="100%">
                {orders.length > 0 ? (
                <s-stack gap="large">
                  <s-grid gridTemplateColumns="2fr 1fr 1fr 1fr" display={DISPLAY_768_GRID} alignItems="center" paddingInline="base">
                    <s-text type="strong" tone="neutral">{"Product"}</s-text>
                    <s-text type="strong" tone="neutral">{"Status"}</s-text>
                    <s-text type="strong" tone="neutral">{"Price"}</s-text>
                    <s-text type="strong" tone="neutral">{"Action"}</s-text>
                  </s-grid>
                  <s-box display={DISPLAY_768_GRID}>
                    <s-divider></s-divider>
                  </s-box>
                  {(orders || [])
                    .filter(function(o) { return o.fulfillmentStatus === "UNFULFILLED"; })
                    .map(function(order) {
                      const fulfillmentStatus = order.fulfillmentStatus || 'UNFULFILLED';
                      const displayStatus = fulfillmentStatus.charAt(0) + fulfillmentStatus.slice(1).toLowerCase();
                      const totalQuantity = (order.lineItems || []).reduce(function(acc, item) { return acc + (item.quantity || 0); }, 0);
                      const orderPrice = order.totalPrice && api.i18n ? api.i18n.formatNumber(Number(order.totalPrice.amount), { precision: 2 }) + " " + order.totalPrice.currencyCode : "";

                      return (
                        <s-box key={order.id} padding="base" border="base" borderRadius="large">
                          <s-stack gap="base">
                            <s-grid gridTemplateColumns="2fr 1fr 1fr 1fr" display={DISPLAY_768_GRID} alignItems="center" gap="base">
                              <s-clickable onClick={function() { api.navigation.navigate(`shopify://customer-account/orders/${getNumericId(order.id)}`); }}>
                                <s-stack direction="inline" gap="base" alignItems="center">
                                  <s-box borderRadius="base" overflow="hidden" inlineSize="56px" blockSize="56px">
                                    {order.lineItems?.[0]?.image ? (
                                      <s-image src={order.lineItems[0].image.url} alt={order.lineItems[0].name}></s-image>
                                    ) : (
                                      <s-grid alignItems="center" blockSize="100%"><s-icon type="image" tone="neutral"></s-icon></s-grid>
                                    )}
                                  </s-box>
                                  <s-stack gap="small-100">
                                    <s-text type="strong">{order.name}</s-text>
                                    <s-text tone="neutral">{totalQuantity} {"items"}</s-text>
                                  </s-stack>
                                </s-stack>
                              </s-clickable>
                              <s-stack gap="small-100">
                                <s-text type="strong">{displayStatus}</s-text>
                                <s-text tone="neutral">{order.processedAt ? new Date(order.processedAt).toLocaleDateString("en-GB") : ""}</s-text>
                              </s-stack>
                              <s-text type="strong">{orderPrice}</s-text>
                              <s-button variant="secondary" onClick={function() { handleReorder(order.id, order.name, 'all-orders-modal'); }} loading={reorderLoadingId === order.id} disabled={reorderLoadingId !== null}>
                                {"Reorder"}
                              </s-button>
                            </s-grid>

                            <s-grid gridTemplateColumns="1fr auto" display={DISPLAY_768_NONE_GRID} gap="small">
                              <s-clickable onClick={function() { api.navigation.navigate(`shopify://customer-account/orders/${getNumericId(order.id)}`); }}>
                                <s-stack direction="inline" gap="base">
                                  <s-box borderRadius="base" overflow="hidden" inlineSize="52px" blockSize="52px">
                                    {order.lineItems?.[0]?.image ? (
                                      <s-image src={order.lineItems[0].image.url} alt={order.lineItems[0].name}></s-image>
                                    ) : (
                                      <s-grid alignItems="center" blockSize="100%"><s-icon type="image" tone="neutral"></s-icon></s-grid>
                                    )}
                                  </s-box>
                                  <s-stack gap="small-100">
                                    <s-text type="strong">{order.name}</s-text>
                                    <s-text tone="neutral">{totalQuantity} {"items"}</s-text>
                                    <s-text>{displayStatus}</s-text>
                                    <s-text tone="neutral">{order.processedAt ? new Date(order.processedAt).toLocaleDateString("en-GB") : ""}</s-text>
                                  </s-stack>
                                </s-stack>
                              </s-clickable>
                              <s-stack alignItems="end" gap="small">
                                <s-text type="strong">{orderPrice}</s-text>
                                <s-button variant="secondary" onClick={function() { handleReorder(order.id, order.name, 'all-orders-modal'); }} loading={reorderLoadingId === order.id} disabled={reorderLoadingId !== null}>
                                  {"Reorder"}
                                </s-button>
                              </s-stack>
                            </s-grid>
                          </s-stack>
                        </s-box>
                      );
                    })}
                </s-stack>
                ) : (
                  <s-stack padding="base" direction="inline" alignItems="center" justifyContent="center">
                    <s-text>No orders found.</s-text>
                  </s-stack>
                )}
              </s-box>
            </s-stack>
          </s-query-container>
        </s-modal>
      )}

      {isLineItemsModalVisible && (
        <s-modal id="order-line-items-modal" heading={lineItemsCount + " items"} size="max">
          <s-query-container>
            <s-stack gap="base">
              {cbSearchEnabled && (
                <s-text-field
                  label="Search"
                  icon="search"
                  value={searchQuery}
                  onInput={function(e) { setSearchQuery(e.target.value); }}
                ></s-text-field>
              )}
              {showTopReorder && (
                <s-box>
                  <s-stack direction="inline" justifyContent={reorderButtonPosition.includes("right") ? "end" : "start"}>
                    <s-button variant="primary" onClick={function() { if (selectedOrder?.id) handleReorder(selectedOrder.id, selectedOrder.name, 'order-line-items-modal'); }} loading={reorderLoadingId === selectedOrder?.id} disabled={reorderLoadingId !== null}>
                      {"REORDER NOW"}
                    </s-button>
                  </s-stack>
                </s-box>
              )}

              <s-divider></s-divider>
               {selectedOrder?.lineItems.length > 0 ? (
              <s-box padding="base">
                <s-stack gap="base">
                  {(selectedOrder?.lineItems || [])
                    .filter(function(item) { return !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()); })
                    .map(function(item, index) {
                      const amount = Number(item.totalPrice?.amount || 0);
                      const currency = item.totalPrice?.currencyCode || "";
                      const itemPrice = (amount > 0 && api.i18n) ? api.i18n.formatNumber(amount, { precision: 2 }) + " " + currency : "";
                      return (
                        <s-grid key={index} gridTemplateColumns="auto 1fr auto" alignItems="center" gap="base">
                          <s-product-thumbnail src={item.image?.url ?? ""} alt={item.name} totalItems={item.quantity}></s-product-thumbnail>
                          <s-stack gap="small-100">
                            <s-text type="strong">{item.name}</s-text>
                            <s-text tone="neutral">{item.variantTitle || 'Default'}</s-text>
                          </s-stack>
                          <s-text type="strong">{itemPrice}</s-text>
                        </s-grid>
                      );
                    })}
                </s-stack>
              </s-box>
              ) : (
                <s-stack padding="base" direction="inline" alignItems="center" justifyContent="center">
                  <s-text>No items found.</s-text>
                </s-stack>
              )}

              {showBottomReorder && (
                <s-stack gap="base">
                  <s-divider></s-divider>
                  <s-box inlineSize="100%">
                    <s-stack direction="inline" justifyContent={reorderButtonPosition.includes('right') ? 'end' : 'start'}>
                      <s-button variant="primary" onClick={function() { if (selectedOrder?.id) handleReorder(selectedOrder.id, selectedOrder.name, 'order-line-items-modal'); }} loading={reorderLoadingId === selectedOrder?.id} disabled={reorderLoadingId !== null}>
                        {"REORDER NOW"}
                      </s-button>
                    </s-stack>
                  </s-box>
                </s-stack>
              )}
            </s-stack>
          </s-query-container>
        </s-modal>
      )}

      <s-modal id="reviews-modal" heading="Review Your Products" size="max">
          <s-query-container>
            <s-stack gap="base">
              <s-box padding="base">
                <s-stack gap="base">
                  {allReviewProducts.map(function(prod, pIdx) {
                    const isLastItem = (pIdx + 1) === allReviewProducts.length;
                    return (
                    <s-stack key={pIdx} gap="base">
                      <s-grid gridTemplateColumns={LAYOUT_768_4COL} alignItems="center" gap="base">
                        <s-product-thumbnail src={prod.image?.url || ""} alt={prod.name} size="base" totalItems={prod?.quantity}></s-product-thumbnail>
                        <s-stack direction="block" gap="none">
                          <s-text type="strong">{prod.name}</s-text>
                          {prod.variantTitle && <s-text tone="neutral">{prod.variantTitle}</s-text>}
                        </s-stack>
                        <s-button
                          variant="secondary"
                          href={prod.productHandle && storefrontBase ? `${storefrontBase}/products/${prod.productHandle}${reviewTarget}` : undefined}
                          target="_blank"
                        >
                          {"Review"}
                        </s-button>
                      </s-grid>
                      {!isLastItem && <s-divider></s-divider>}
                    </s-stack>
                    );
                  })}
                </s-stack>
              </s-box>
            </s-stack>
          </s-query-container>
        </s-modal>
    </s-page>
  );
}
