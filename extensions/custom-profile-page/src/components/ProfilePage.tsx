import { useState, useEffect } from "preact/hooks";
import { Fragment } from "preact";
import "@shopify/ui-extensions/preact";
import navConfig from "../navigation.json";
import { 
  DEFAULT_SETTINGS,
  LAYOUT_768_2COL,
  LAYOUT_768_2COL_STACK,
  LAYOUT_768_4COL,
  LAYOUT_768_4COL_BLOCK,
  LAYOUT_600_2COL,
  LAYOUT_600_4COL,
  LAYOUT_500_3COL,
  SIZE_600_RESP_200,
  SIZE_600_RESP_100,
  DISPLAY_768_GRID,
  DISPLAY_768_NONE_GRID
} from "../constants";
import { type Order, type MissingItem, type DashboardSettings } from "../interface";
import { fetchAdditionalOrders, loadCustomerData } from "../loadCustomerData";
import { fetchReorderResult } from "../reorder.service";
import { fetchCustomOrderStatuses } from "../ongoingOrders.service";
import { fetchSmilePoints, maskPatientId, calculateDaysRemaining, getNumericId } from "../helpers";

const SPage = "s-page";
const SSpinner = "s-spinner";
const SBox = "s-box";
const SStack = "s-stack";
const SText = "s-text";
const SQueryContainer = "s-query-container";
const SBanner = "s-banner";
const SLink = "s-link";
const SGrid = "s-grid";
const SGridItem = "s-grid-item";
const SIcon = "s-icon";
const SImage = "s-image";
const SClickable = "s-clickable";
const SButton = "s-button";
const SHeading = "s-heading";
const SDivider = "s-divider";
const SProductThumbnail = "s-product-thumbnail";
const SModal = "s-modal";
const STextField = "s-text-field";

interface ProfilePageProps {
  api: any;
}

// Layout constants imported from constants.ts to prevent JSX parser desync.

export function ProfilePage({ api }: ProfilePageProps) {



  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ongoingOrders, setOngoingOrders] = useState<Order[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [myshopifyDomain, setMyshopifyDomain] = useState("");
  const [points, setPoints] = useState<number | null>(null);
  const [reorderLoadingId, setReorderLoadingId] = useState<string | null>(null);
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [reorderRedirectUrl, setReorderRedirectUrl] = useState<string | null>(null);
  const [showReorderWarning, setShowReorderWarning] = useState(false);
  const [olderOrderName, setOlderOrderName] = useState<string | null>(null);
  const [dynamicSettings, setDynamicSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isReviewsModalVisible, setIsReviewsModalVisible] = useState(false);
  const [isAllOrdersModalVisible, setIsAllOrdersModalVisible] = useState(true);
  const [isLineItemsModalVisible, setIsLineItemsModalVisible] = useState(true);
  const [isPointsLoading, setIsPointsLoading] = useState(false);
  const [customStatuses, setCustomStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    async function init() {
      setError(null);
      setLoading(true);
      try {
        const data = await loadCustomerData(api, {
          ordersLimit: 5,
          lineItemsLimit: 250,
        });

        const additionalOrders = await fetchAdditionalOrders(10);

        if (data.customer) {
          setCustomer(data.customer);
          setOrders(data.orders || []);
          setOngoingOrders(additionalOrders.orders || []);
          if (data.myshopifyDomain) setMyshopifyDomain(data.myshopifyDomain);
         
          // Fetch custom order statuses for unfulfilled orders
          const unfulfilledOrderIds = additionalOrders.orders.map((o: any) => o.id);

          if (unfulfilledOrderIds.length > 0) {
            fetchCustomOrderStatuses(api, data.myshopifyDomain, unfulfilledOrderIds).then(statuses => {
              setCustomStatuses(statuses);
            }).catch(err => {
              console.warn("Failed to fetch custom statuses", err);
            });
          }
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
            setDynamicSettings((prev: any) => ({ ...prev, ...parsed }));
          } catch (parseError) {
            console.error("Failed to parse dynamic settings JSON", parseError);
          }
        }
      } catch (e) {
        console.error("Failed to fetch dynamic settings", e);
      }
    }
    getDynamicSettings();
  }, [api]);

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
      case "orderStatus": return (ongoingOrders.length !== 0) ? `${ongoingOrders.length} orders` : "0 orders";
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
      .filter(function(li: any) {
        if (!li.productId) return false;
        const nameLower = (li.name || "").toLowerCase();
        const skuLower = (li.sku || "").toLowerCase();
        if (nameLower.includes("trial pack") || skuLower.includes("trial")) return false;
        return true;
      })
      .map(function(li: any) { 
        return [li.variantId || li.productId, li];
      })
  ).values()) as any[];

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
  

  const reorderButtonPosition = dynamicSettings?.cb_reorder_button_position || DEFAULT_SETTINGS.cb_reorder_button_position;

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

  const lineItemsCount = (selectedOrder?.lineItems || []).reduce(function(acc: number, item: any) { 
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
      <SPage heading="Loading Dashboard">
        <SBox padding="base">
          <SStack direction="block" alignItems="center" gap="base">
            <SSpinner size="base"></SSpinner>
            <SText>{"Loading..."}</SText>
          </SStack>
        </SBox>
      </SPage>
    );
  }

  return (
    <SPage heading="My Dashboard">
      <SQueryContainer>
        <SStack direction="block" gap="base">
          {showReorderWarning && (
            <SBanner 
              id="reorder-warning"
              tone="warning"
              heading="Reordering from an older order?"
            >
              <SStack direction="block" gap="small">
                <SText>{"Because we’ve upgraded our website, older orders can’t be reordered directly through the new system. Please add your items to cart manually this time. Going forward, reordering will work smoothly from your account. "}</SText>
                <SStack direction="inline" gap="none">
                  <SText>{"Need Help For your Order "}<SText type="strong">{olderOrderName}</SText></SText>
                  {externalReorderLink && (
                    <SText>
                      You can <SLink onClick={function() { api.navigation.navigate(externalReorderLink); }}>{"Click here"}</SLink> and we’ll load your previous order into cart for you. 
                    </SText>
                  )}
                </SStack>
              </SStack>
            </SBanner>
          )}

          {bannerEnabled && (
            <SBox background="subdued" borderRadius="base" padding="base">
              <SGrid gridTemplateColumns={LAYOUT_768_2COL} gap="base" alignItems="center">
                <SGridItem>
                  <SStack direction="inline" gap="small" padding="small" alignItems="center">
                    <SIcon type="info" size="small" tone="neutral"></SIcon>
                    <SStack direction="block" gap="small">
                      <SHeading>{bannerTitle}</SHeading>
                      <SText tone="neutral">{bannerSubtitle}</SText>
                    </SStack>
                  </SStack>
                </SGridItem>
                <SGridItem>
                  <SStack direction="block" alignItems="center">
                    <SBox 
                      inlineSize={SIZE_600_RESP_200}  
                      blockSize={SIZE_600_RESP_100}
                      borderRadius="base" 
                      overflow="hidden"
                    >
                      <SImage 
                        src={bannerImageUrl} 
                        alt="Welcome" 
                        loading="lazy" 
                        objectFit="cover"
                      ></SImage>
                    </SBox>
                  </SStack>
                </SGridItem>
              </SGrid>
            </SBox>
          )}

          <SGrid gridTemplateColumns={LAYOUT_768_2COL_STACK} gap="base">
            <SGridItem>
              <SBox background="subdued" borderRadius="base" padding="base">
                <SGrid gridTemplateColumns={LAYOUT_500_3COL} gap="base" alignItems="center">
                  <SGridItem>
                    <SIcon type="cart" size="base"></SIcon>
                  </SGridItem>
                  <SGridItem>
                    <SClickable 
                      onClick={function() { setSelectedOrder(orders[0]); }}
                      command="--show" 
                      commandFor="order-line-items-modal"
                    >
                      <SStack direction="block" gap="none">
                        <SText tone="neutral">{"Most Recent Order"}</SText>
                        <SText type="strong" tone="info">{orders[0]?.name || "#1111"}</SText>
                        <SText tone="neutral">{recentOrderItemsCount + " items"}</SText>
                      </SStack>
                    </SClickable>
                  </SGridItem>
                  <SGridItem>
                    <SStack direction="inline" gap="small" alignItems="center">
                      <SButton 
                        variant="primary" 
                        loading={reorderLoadingId === (orders[0]?.id || "none")}
                        onClick={function() { handleReorder(orders[0]?.id, orders[0]?.name || ""); }}
                      >
                        {"REORDER"}
                      </SButton>
                      <SButton 
                        variant="secondary" 
                        href="shopify://customer-account/orders"
                      >
                        <SStack direction="inline" gap="small-200" alignItems="center">
                          <SText type="strong">{"Reorder Past Orders"}</SText>
                          <SIcon type="arrow-right" size="small"></SIcon>
                        </SStack>
                      </SButton>
                    </SStack>
                  </SGridItem>
                </SGrid>
              </SBox>
            </SGridItem>
            <SGridItem>
              <SBox background="subdued" borderRadius="base" padding="base">
                <SGrid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
                  <SGridItem>
                    <SStack direction="block" gap="none">
                      <SText tone="neutral">{"Days Till Run Out"}</SText>
                      <SText type="strong">{daysRemainingDisplay}</SText>
                    </SStack>
                  </SGridItem>
                  <SGridItem>
                    <SIcon type="info" size="base"></SIcon>
                  </SGridItem>
                </SGrid>
              </SBox>
            </SGridItem>
          </SGrid>

          <SGrid gridTemplateColumns={LAYOUT_768_2COL_STACK} gap="base">
            <SGridItem>
              <SBox background="subdued" borderRadius="base" padding="base">
                <SGrid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
                  <SGridItem>
                    <SIcon type="star" size="base"></SIcon>
                  </SGridItem>
                  <SGridItem>
                    <SText type="strong">{"My Loyalty Points"}</SText>
                  </SGridItem>
                  <SGridItem>
                    <SText type="strong">{pointsDisplay}</SText>
                  </SGridItem>
                </SGrid>
              </SBox>
            </SGridItem>
            <SGridItem>
              <SBox background="subdued" borderRadius="base" padding="base">
                <SGrid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
                  <SGridItem>
                    <SIcon type="calendar" size="base"></SIcon>
                  </SGridItem>
                  <SGridItem>
                    <SText type="strong">{"Prescription Expiry"}</SText>
                  </SGridItem>
                  <SGridItem>
                    <SText type="strong">{customer?.prescription?.expiry_date || "2027-03-09"}</SText>
                  </SGridItem>
                </SGrid>
              </SBox>
            </SGridItem>
          </SGrid>

          <SGrid gridTemplateColumns={LAYOUT_768_2COL_STACK} gap="base">
            {(sections || []).map(function(section, sIdx) {
              return (
              <SBox key={sIdx} id={"section-" + sIdx} padding="base" background="base" borderRadius="base" border="base">
                <SStack gap="base">
                  <SGrid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                    <SGridItem>
                      <SHeading>{section.title}</SHeading>
                    </SGridItem>
                    <SGridItem>
                      <SIcon type={section.icon} size="base"></SIcon>
                    </SGridItem>
                  </SGrid>
                    
                  <SStack gap="small">
                    {(section.links || []).map(function(link, lIdx) {
                      const dynamicSub = link.dynamicSub ? resolveDynamicValue(link.dynamicSub) : "";
                      const href = link.href || "";
                      const isClickable = (href && href !== "#") || link.command;
                      return (
                        <SStack key={lIdx} gap="small-100">
                          <SGrid gridTemplateColumns="1fr auto" alignItems="center">
                            <SStack direction="inline" gap="small" alignItems="center">
                            {isClickable ? (
                                <SClickable 
                                  id={"nav-l-" + lIdx} 
                                  href={href} 
                                  command={link.command} 
                                  commandFor={link.commandFor}
                                >
                              <SText tone="custom" >{link.label}</SText>
                              </SClickable>
                              ) : (
                                <SText tone="info" >{link.label}</SText>
                              )}
                            </SStack>
                            <SStack direction="inline" gap="small" alignItems="center" justifyContent="end">
                             {(dynamicSub && link?.dynamicSub === 'orderStatus') ? (
                               <SClickable 
                                  id={"nav-l-" + lIdx} 
                                  href={href} 
                                  command={link.command} 
                                  commandFor={link.commandFor}
                                >
                                  <SStack direction="inline" gap="small-300" alignItems="center">
                                    <SText tone="custom">{dynamicSub}</SText>
                                    <SIcon type="arrow-right" size="small" tone="custom"></SIcon>
                                  </SStack>
                                </SClickable>
                              ) : (
                                dynamicSub ? <SText tone="neutral">{dynamicSub}</SText> : null
                              )}
                            </SStack>
                          </SGrid>
                        </SStack>
                      );
                    })}
                  </SStack>

                  {section.id === 'reviews' && reviewProducts.length !== 0 && (
                    <SStack direction="block" gap="none">
                      <SDivider></SDivider>
                      {reviewProducts.map(function(prod, pIdx) {
                        return (
                        <SBox key={pIdx} padding="small">
                          <SGrid gridTemplateColumns={LAYOUT_768_4COL_BLOCK} gap="small" alignItems="center">
                            <SGridItem>
                              {prod.image?.url ? 
                                <SProductThumbnail src={prod.image?.url} alt={prod.name} size="base" totalItems={prod?.quantity}></SProductThumbnail> : 
                                <SIcon type="image" size="large-100"></SIcon>}
                            </SGridItem>
                            <SGridItem>
                              <SStack direction="block" gap="none">
                                <SText type="strong">{prod.name}</SText>
                                {prod.variantTitle && <SText tone="neutral">{prod.variantTitle}</SText>}
                              </SStack>
                            </SGridItem>
                            <SGridItem>
                              <SButton
                                variant="secondary"
                                href={prod.productHandle && storefrontBase ? `${storefrontBase}/products/${prod.productHandle}${reviewTarget}` : undefined}
                                target="_blank"
                              >
                                {"Review"}
                              </SButton>
                            </SGridItem>
                          </SGrid>
                          {((pIdx + 1) !== reviewProducts.length) && (
                            <SStack gap="small">
                              <SDivider></SDivider>
                            </SStack>
                          )}
                        </SBox>
                        );
                      })}
                      {((allReviewProducts.length - REVIEW_PAGE_SIZE) !== 0) && (
                        <SBox padding="small">
                          <SDivider></SDivider>
                          <SStack direction="block" alignItems="center" paddingBlock="small">
                            <SButton 
                              variant="secondary" 
                              command="--show" 
                              commandFor="reviews-modal"
                            >
                                {"View More (" + remainingReviewCount + " more)"}
                            </SButton>
                          </SStack>
                        </SBox>
                      )}
                    </SStack>
                  )}
                </SStack> 
              </SBox>      
            );
            })}
          </SGrid>
        </SStack>
      </SQueryContainer>
      
      {isAllOrdersModalVisible && ( 
        <SModal id="all-orders-modal" heading="Ongoing Order Status" size="max">
          <SQueryContainer>
            <SStack gap="large" alignItems="center">
              <SBox padding="large" background="base" border="base" borderRadius="large" inlineSize="100%">
                {ongoingOrders.length !== 0 ? (
                <SStack gap="large">
                  <SGrid gridTemplateColumns="2fr 1fr 1fr 1fr" display={DISPLAY_768_GRID} alignItems="center" paddingInline="base">
                    <SText type="strong" tone="neutral">{"Product"}</SText>
                    <SText type="strong" tone="neutral">{"Status"}</SText>
                    <SText type="strong" tone="neutral">{"Price"}</SText>
                    <SText type="strong" tone="neutral">{"Action"}</SText>
                  </SGrid>
                  <SBox display={DISPLAY_768_GRID}>
                    <SDivider></SDivider>
                  </SBox>
                  {(ongoingOrders || [])
                    .map(function(order) {
                      const fulfillmentStatus = order.fulfillmentStatus || 'UNFULFILLED';
                      const displayStatus = (fulfillmentStatus.charAt(0) + fulfillmentStatus.slice(1).toLowerCase()).replace(/_/g, ' ');
                      const totalQuantity = (order.lineItems || []).reduce(function(acc, item) { return acc + (item.quantity || 0); }, 0);
                      const orderPrice = order.totalPrice && api.i18n ? api.i18n.formatNumber(Number(order.totalPrice.amount), { precision: 2 }) + " " + order.totalPrice.currencyCode : "";

                      return (
                        <SBox key={order.id} padding="base" border="base" borderRadius="large">
                          <SStack gap="base">
                            <SGrid gridTemplateColumns="2fr 1fr 1fr 1fr" display={DISPLAY_768_GRID} alignItems="center" gap="base">
                              <SClickable onClick={function() { api.navigation.navigate(`shopify://customer-account/orders/${getNumericId(order.id)}`); }}>
                                <SStack direction="inline" gap="base" alignItems="center">
                                  <SBox borderRadius="base" overflow="hidden" inlineSize="56px" blockSize="56px">
                                    {order.lineItems?.[0]?.image ? (
                                      <SImage src={order.lineItems[0].image.url} alt={order.lineItems[0].name}></SImage>
                                    ) : (
                                      <SGrid alignItems="center" blockSize="100%"><SIcon type="image" tone="neutral"></SIcon></SGrid>
                                    )}
                                  </SBox>
                                  <SStack gap="small-100">
                                    <SText type="strong">{order.name}</SText>
                                    <SText tone="neutral">{totalQuantity} {"items"}</SText>
                                  </SStack>
                                </SStack>
                              </SClickable>
                              <SStack gap="small-100">
                                <SText type="strong">{customStatuses[order.id] || displayStatus}</SText>
                                <SText tone="neutral">{order.processedAt ? new Date(order.processedAt).toLocaleDateString("en-GB") : ""}</SText>
                              </SStack>
                              <SText type="strong">{orderPrice}</SText>
                              <SButton variant="secondary" onClick={function() { handleReorder(order.id, order.name, 'all-orders-modal'); }} loading={reorderLoadingId === order.id} disabled={reorderLoadingId !== null}>
                                {"Reorder"}
                              </SButton>
                            </SGrid>

                            <SGrid gridTemplateColumns="1fr auto" display={DISPLAY_768_NONE_GRID} gap="small">
                              <SClickable onClick={function() { api.navigation.navigate(`shopify://customer-account/orders/${getNumericId(order.id)}`); }}>
                                <SStack direction="inline" gap="base">
                                  <SBox borderRadius="base" overflow="hidden" inlineSize="52px" blockSize="52px">
                                    {order.lineItems?.[0]?.image ? (
                                      <SImage src={order.lineItems[0].image.url} alt={order.lineItems[0].name}></SImage>
                                    ) : (
                                      <SGrid alignItems="center" blockSize="100%"><SIcon type="image" tone="neutral"></SIcon></SGrid>
                                    )}
                                  </SBox>
                                  <SStack gap="small-100">
                                    <SText type="strong">{order.name}</SText>
                                    <SText tone="neutral">{totalQuantity} {"items"}</SText>
                                    <SText>{customStatuses[order.id] || displayStatus}</SText>
                                    <SText tone="neutral">{order.processedAt ? new Date(order.processedAt).toLocaleDateString("en-GB") : ""}</SText>
                                  </SStack>
                                </SStack>
                              </SClickable>
                              <SStack alignItems="end" gap="small">
                                <SText type="strong">{orderPrice}</SText>
                                <SButton variant="secondary" onClick={function() { handleReorder(order.id, order.name, 'all-orders-modal'); }} loading={reorderLoadingId === order.id} disabled={reorderLoadingId !== null}>
                                  {"Reorder"}
                                </SButton>
                              </SStack>
                            </SGrid>
                          </SStack>
                        </SBox>
                      );
                    })}
                </SStack>
                ) : (
                  <SStack padding="base" direction="inline" alignItems="center" justifyContent="center">
                    <SText>No orders found.</SText>
                  </SStack>
                )}
              </SBox>
            </SStack>
          </SQueryContainer>
        </SModal>
      )}

      {isLineItemsModalVisible && (
        <SModal id="order-line-items-modal" heading={lineItemsCount + " items"} size="max">
          <SQueryContainer>
            <SStack gap="base">
              {cbSearchEnabled && (
                <STextField
                  label="Search"
                  icon="search"
                  value={searchQuery}
                  onInput={function(e) { setSearchQuery(e.target.value); }}
                ></STextField>
              )}
              {showTopReorder && (
                <SBox>
                  <SStack direction="inline" justifyContent={reorderButtonPosition.includes("right") ? "end" : "start"}>
                    <SButton variant="primary" onClick={function() { if (selectedOrder?.id) handleReorder(selectedOrder.id, selectedOrder.name, 'order-line-items-modal'); }} loading={reorderLoadingId === selectedOrder?.id} disabled={reorderLoadingId !== null}>
                      {"REORDER NOW"}
                    </SButton>
                  </SStack>
                </SBox>
              )}

              <SDivider></SDivider>
               {selectedOrder?.lineItems.length !== 0 ? (
              <SBox padding="base">
                <SStack gap="base">
                  {(selectedOrder?.lineItems || [])
                    .filter(function(item) { return !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()); })
                    .map(function(item, index) {
                      const amount = Number(item.totalPrice?.amount || 0);
                      const currency = item.totalPrice?.currencyCode || "";
                      const itemPrice = (amount !== 0 && api.i18n) ? api.i18n.formatNumber(amount, { precision: 2 }) + " " + currency : "";
                      return (
                        <SGrid key={index} gridTemplateColumns="auto 1fr auto" alignItems="center" gap="base">
                          <SProductThumbnail src={item.image?.url ?? ""} alt={item.name} totalItems={item.quantity}></SProductThumbnail>
                          <SStack gap="small-100">
                            <SText type="strong">{item.name}</SText>
                            <SText tone="neutral">{item.variantTitle || 'Default'}</SText>
                          </SStack>
                          <SText type="strong">{itemPrice}</SText>
                        </SGrid>
                      );
                    })}
                </SStack>
              </SBox>
              ) : (
                <SStack padding="base" direction="inline" alignItems="center" justifyContent="center">
                  <SText>No items found.</SText>
                </SStack>
              )}

              {showBottomReorder && (
                <SStack gap="base">
                  <SDivider></SDivider>
                  <SBox inlineSize="100%">
                    <SStack direction="inline" justifyContent={reorderButtonPosition.includes('right') ? 'end' : 'start'}>
                      <SButton variant="primary" onClick={function() { if (selectedOrder?.id) handleReorder(selectedOrder.id, selectedOrder.name, 'order-line-items-modal'); }} loading={reorderLoadingId === selectedOrder?.id} disabled={reorderLoadingId !== null}>
                        {"REORDER NOW"}
                      </SButton>
                    </SStack>
                  </SBox>
                </SStack>
              )}
            </SStack>
          </SQueryContainer>
        </SModal>
      )}

      <SModal id="reviews-modal" heading="Review Your Products" size="max">
          <SQueryContainer>
            <SStack gap="base">
              <SBox padding="base">
                <SStack gap="base">
                  {allReviewProducts.map(function(prod, pIdx) {
                    const isLastItem = (pIdx + 1) === allReviewProducts.length;
                    return (
                    <SStack key={pIdx} gap="base">
                      <SGrid gridTemplateColumns={LAYOUT_768_4COL} alignItems="center" gap="base">
                        <SProductThumbnail src={prod.image?.url || ""} alt={prod.name} size="base" totalItems={prod?.quantity}></SProductThumbnail>
                        <SStack direction="block" gap="none">
                          <SText type="strong">{prod.name}</SText>
                          {prod.variantTitle && <SText tone="neutral">{prod.variantTitle}</SText>}
                        </SStack>
                        <SButton
                          variant="secondary"
                          href={prod.productHandle && storefrontBase ? `${storefrontBase}/products/${prod.productHandle}${reviewTarget}` : undefined}
                          target="_blank"
                        >
                          {"Review"}
                        </SButton>
                      </SGrid>
                      {!isLastItem && <SDivider></SDivider>}
                    </SStack>
                    );
                  })}
                </SStack>
              </SBox>
            </SStack>
          </SQueryContainer>
        </SModal>
    </SPage>
  );
}
