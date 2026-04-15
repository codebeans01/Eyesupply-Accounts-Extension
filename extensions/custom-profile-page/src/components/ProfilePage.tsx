/** @jsx h */
import { h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import '@shopify/ui-extensions/preact';
import navConfig from "../navigation.json";
import { 
  DEFAULT_SETTINGS,
  REVIEW_PAGE_SIZE
} from "../constants";
import { type Order, type MissingItem, type DashboardSettings, type NavLink } from "../interface";
import { loadCustomerData, fetchAdditionalOrders } from "../loadCustomerData";
import { fetchReorderResult } from "../reorder.service";
import { fetchCustomOrderStatuses } from "../ongoingOrders.service";
import { fetchSmilePoints, maskPatientId, calculateDaysRemaining, getNumericId, getSettings, formatDateString, getPrescriptionStatus } from "../helpers";

// Sub-components
import { DashboardBanner } from "./ProfilePage/DashboardBanner";
import { StatCards } from "./ProfilePage/StatCards";
import { NavigationSections } from "./ProfilePage/NavigationSections";
import { Modals } from "./ProfilePage/Modals";
import { ProfileSkeleton } from "./ProfilePage/ProfileSkeleton";

interface ProfilePageProps {
  api: any;
}

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
  const [isPointsLoading, setIsPointsLoading] = useState(false);
  const [customStatuses, setCustomStatuses] = useState<Record<string, string>>({});
  const [isLineItemsModalVisible, setIsLineItemsModalVisible] = useState(true);
  const [isAllOrdersModalVisible, setIsAllOrdersModalVisible] = useState(true);

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
         
          const unfulfilledOrderIds = (additionalOrders.orders || []).map((o: any) => o.id);

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
  }, [api]);

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
        const { settings, error } = await getSettings(api);
        if (settings) {
          setDynamicSettings((prev: any) => ({ ...prev, ...settings }));
        } else if (error) {
          console.error("Settings load failed:", error);
          setError(new Error(error));
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
    resolved = resolved.replace(/\{\{customer\.points\}\}/g, points !== null ? new Intl.NumberFormat().format(points) : "...");
    resolved = resolved.replace(/\{\{customer\.medical_aid_number\}\}/g, customer?.medicalAidNumber || "Not provided");
    const rawPatientId = customer?.patientIdNumber || "";
    const maskedId = maskPatientId(rawPatientId);
    resolved = resolved.replace(/\{\{customer\.patient_id\}\}/g, maskedId || "Not provided");
    
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
      case "medicalAidNumber": return customer?.medicalAidNumber || "Not provided";
      case "medicalAidPlan": return customer?.medicalAidPlan || "Plan";
      case "medicalAidName": return customer?.medicalAidName || "Medical Aid Name";
      case "patientIdNumber": return customer?.patientIdNumber ? maskPatientId(customer.patientIdNumber) : "Not provided";
      case "loyaltyPoints": return isPointsLoading ? "..." : (points !== null ? new Intl.NumberFormat().format(points) + " points" : "0 points");
      case "daysRemaining": {
        const days = calculateDaysRemaining(customer?.daysTillRunOut);
        return days !== null ? `${days} days` : "0 days";
      }
      case "prescriptionExpiryDate": {
        return formatDateString(customer?.prescription?.expiry_date) || "Not provided";
      }
      case "prescriptionExpiryStatus": {
        const { text } = getPrescriptionStatus(
          customer?.prescription?.expiry_date,
          orders?.length || 0,
          customer?.tags || []
        );
        return text;
      }
      default: return "";
    }
  }

  function resolveDynamicTone(key: string): "neutral" | "success" | "warning" | "critical" | "info" | "custom" {
    if (!key) return "neutral";
    switch (key) {
      case "prescriptionExpiryStatus": {
        const { tone } = getPrescriptionStatus(
          customer?.prescription?.expiry_date,
          orders?.length || 0,
          customer?.tags || []
        );
        return tone;
      }
      case "loyaltyPoints": return "info";
      case "orderStatus": return "custom";
      default: return "neutral";
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
        if (menuId) {
          api.ui.overlay.close(menuId);
        }
        setOlderOrderName(orderName);
        setShowReorderWarning(true);

        setIsLineItemsModalVisible(false);
        setIsAllOrdersModalVisible(false);

        setTimeout(() => {
            setShowReorderWarning(true);
            api.toast?.show("Some items are unavailable");

            setTimeout(() => {
                api.navigation.navigate('#reorder-warning');
            }, 100);
            setIsLineItemsModalVisible(true);
            setIsAllOrdersModalVisible(true);
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

  // Prep derived data for components
  const excludeVariantIdsRaw = (dynamicSettings?.exclude_variant_ids as string) || "";
  const excludeNumericIds = excludeVariantIdsRaw.split(',').map(id => {
    const trimmed = id.trim();
    return trimmed.includes('/') ? getNumericId(trimmed) : trimmed;
  }).filter(id => id !== "");

  const lastOrder = (orders.length !== 0) ? orders[0] : null;

  const allReviewProducts = Array.from(new Map(
    (lastOrder?.lineItems || [])
      .filter(li => {
        if (!li.productId) return false;
        const nameLower = (li.name || "").toLowerCase();
        const skuLower = (li.sku || "").toLowerCase();
        if (nameLower.includes("trial pack") || skuLower.includes("trial")) return false;
        
        const vId = li.variantId || "";
        const pId = li.productId || "";
        const numericVId = vId.includes('/') ? getNumericId(vId) : vId;
        const numericPId = pId.includes('/') ? getNumericId(pId) : pId;

        return !excludeNumericIds.includes(numericVId) && !excludeNumericIds.includes(numericPId);
      })
      .map(li => [li.variantId || li.productId, li])
  ).values()) as any[];

  const reviewProducts = allReviewProducts.slice(0, REVIEW_PAGE_SIZE);
  const remainingReviewCount = Math.max(0, allReviewProducts.length - REVIEW_PAGE_SIZE);

  const welcomeImageUrl = (dynamicSettings?.cb_welcome_image_url as string) || DEFAULT_SETTINGS.cb_welcome_image_url;
  const externalReorderLink = (dynamicSettings?.external_reorder_link as string) || DEFAULT_SETTINGS.external_reorder_link;
  const cbSearchEnabled = (dynamicSettings?.cb_search_enable as boolean) ?? DEFAULT_SETTINGS.cb_search_enable;
  const bannerEnabled = (dynamicSettings?.cb_banner_enabled as boolean) ?? true;
  const showReviewProducts = (dynamicSettings?.cb_show_review_products as boolean) ?? DEFAULT_SETTINGS.cb_show_review_products;
  const rewardsIconUrl = (dynamicSettings?.cb_rewards_icon_url as string) || DEFAULT_SETTINGS.cb_rewards_icon_url;
  const reviewSubheading = (dynamicSettings?.cb_review_subheading as string) || DEFAULT_SETTINGS.cb_review_subheading;
  const recentOrderIconUrl = (dynamicSettings?.cb_recent_order_icon_url as string) || DEFAULT_SETTINGS.cb_recent_order_icon_url;
  const rewardsCardIconUrl = (dynamicSettings?.cb_rewards_card_icon_url as string) || DEFAULT_SETTINGS.cb_rewards_card_icon_url;
  const prescriptionIconUrl = (dynamicSettings?.cb_prescription_icon_url as string) || DEFAULT_SETTINGS.cb_prescription_icon_url;
  const daysRunOutIconUrl = (dynamicSettings?.cb_days_run_out_icon_url as string) || DEFAULT_SETTINGS.cb_days_run_out_icon_url;

  // Stat Card Settings
  const statRecentOrderTitle = (dynamicSettings?.cb_stat_recent_order_title as string) || "Most Recent Order";
  const statReorderBtnLabel = (dynamicSettings?.cb_stat_reorder_btn_label as string) || "REORDER";
  const statPastOrdersBtnLabel = (dynamicSettings?.cb_stat_past_orders_btn_label as string) || "Reorder Past Orders";
  const statShowReorderBtn = (dynamicSettings?.cb_stat_show_reorder_btn as boolean) ?? true;
  const statShowPastOrdersBtn = (dynamicSettings?.cb_stat_show_past_orders_btn as boolean) ?? true;
  const statShowReorderNowBtn = (dynamicSettings?.cb_stat_show_reorder_now_btn as boolean) ?? true;
  const statCoveredUntilText = (dynamicSettings?.cb_stat_covered_until_text as string) || "You’re covered until";
  const statDaysRemainingText = (dynamicSettings?.cb_stat_days_remaining_text as string) || "days remaining";
  const statReorderNowBtnLabel = (dynamicSettings?.cb_stat_reorder_now_btn_label as string) || "Reorder now";
  const statLoyaltyTitle = (dynamicSettings?.cb_stat_loyalty_title as string) || "My Loyalty Points";
  const statLoyaltyLinkText = (dynamicSettings?.cb_stat_loyalty_link_text as string) || "Earn & Redeem";
  const statPrescriptionTitle = (dynamicSettings?.cb_stat_prescription_title as string) || "Prescription Expiry";
  const rewardsPageUrl = (dynamicSettings?.cb_rewards_page_url as string) || "/pages/rewards";
  const bannerTitle = resolve((dynamicSettings?.cb_banner_title as string) || "Welcome Back");
  const bannerSubtitle = resolve((dynamicSettings?.cb_banner_subtitle as string) || "{{customer.first_name}} {{customer.last_name}}");
  const bannerImageUrl = (dynamicSettings?.cb_banner_image_url as string) || welcomeImageUrl;
  const storefrontBase = myshopifyDomain ? `https://${myshopifyDomain}` : "";
  const reviewTarget = '#' + (dynamicSettings?.cb_review_target as string || DEFAULT_SETTINGS.cb_review_target);
  
  const reorderButtonPosition = dynamicSettings?.cb_reorder_button_position || DEFAULT_SETTINGS.cb_reorder_button_position;

  const normalizeId = (id: string) => (id || "").toLowerCase().replace(/_/g, '-');
  const sectionOrderRaw = dynamicSettings?.section_order;
  const sectionOrder = (Array.isArray(sectionOrderRaw) ? sectionOrderRaw : (typeof sectionOrderRaw === 'string' ? sectionOrderRaw.split(',') : []))
    .map((id:String) => normalizeId(id.trim()))
    .filter(Boolean);

  const filteredSections = navConfig.sections || [];
  let sections = filteredSections.map(section => {
    const dynamicSection = dynamicSettings?.sections?.[section.id];
    const sectionIconUrl = dynamicSettings[`cb_${section.id}_icon_url` as keyof DashboardSettings] as string;
    
    return {
      ...section,
      iconUrl: sectionIconUrl,
      title: dynamicSection?.title || section.title,
      links: ((section.links as NavLink[]) || []).map((link, idx) => {
        const dynamicLink = dynamicSection?.links?.[idx];
        if (!dynamicLink) return link;

        // If action is explicitly set in dynamic settings, it should take precedence
        const action = dynamicLink.action || link.action;
        const isModal = action === 'modal';

        return {
          ...link,
          label: dynamicLink.label || link.label,
          href: dynamicLink.href || link.href,
          action: action,
          // Only use static command if no dynamic action is set, or if dynamic action IS modal
          command: isModal ? (dynamicLink.command || link.command) : (dynamicLink.action ? undefined : link.command),
          commandFor: isModal ? (dynamicLink.commandFor || link.commandFor) : (dynamicLink.action ? undefined : link.commandFor)
        };
      })
    };
  });

  // Apply dynamic reordering if provided from backend (Normalized)
  if (sectionOrder.length > 0) {
    sections = [...sections].sort((a, b) => {
      const indexA = sectionOrder.indexOf(normalizeId(a.id));
      const indexB = sectionOrder.indexOf(normalizeId(b.id));
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }


  const lineItemsCount = (selectedOrder?.lineItems || []).reduce((acc, item) => acc + (item.quantity || 0), 0);
  const showTopReorder = !!lineItemsCount && reorderButtonPosition.startsWith("top");
  const showBottomReorder = !!lineItemsCount && reorderButtonPosition.startsWith("bottom");
  const recentOrderItemsCount = (orders[0]?.lineItems || []).reduce((acc, li) => acc + (li.quantity || 0), 0);
  const daysRemainingVal = calculateDaysRemaining(customer?.daysTillRunOut);
  const daysRemainingDisplay = (daysRemainingVal ?? "0") + " days left of lenses";
  const pointsDisplay = isPointsLoading ? "..." : (points !== null ? new Intl.NumberFormat().format(points) + " pts" : "0 pts");

  if (loading) {
    return (
      <s-page heading="My Dashboard">
        <s-query-container>
          <ProfileSkeleton />
        </s-query-container>
      </s-page>
    );
  }

  return (
    <s-page heading="My Dashboard">
      <s-query-container>
        <s-stack direction="block" gap="base">
          
          <DashboardBanner 
            bannerEnabled={bannerEnabled}
            bannerTitle={bannerTitle}
            bannerSubtitle={bannerSubtitle}
            bannerImageUrl={bannerImageUrl}
            showReorderWarning={showReorderWarning}
            reorderBannerHeading={dynamicSettings?.cb_reorder_banner_heading}
            reorderBannerDescription={dynamicSettings?.cb_reorder_banner_description}
            olderOrderName={olderOrderName}
            api={api}
            externalReorderLink={externalReorderLink}
          />

          <StatCards 
            orders={orders}
            recentOrderItemsCount={recentOrderItemsCount}
            daysRemaining={daysRemainingVal}
            reorderLoadingId={reorderLoadingId}
            onReorder={handleReorder}
            onShowRecentOrderDetails={() => setSelectedOrder(orders[0])}
            pointsDisplay={pointsDisplay}
            prescriptionExpiry={customer?.prescription?.expiry_date || ""}
            tags={customer?.tags || []}
            ordersCount={orders?.length || 0}
            recentOrderIconUrl={recentOrderIconUrl}
            rewardsCardIconUrl={rewardsCardIconUrl}
            prescriptionIconUrl={prescriptionIconUrl}
            daysRunOutIconUrl={daysRunOutIconUrl}
            statRecentOrderTitle={statRecentOrderTitle}
            statReorderBtnLabel={statReorderBtnLabel}
            statPastOrdersBtnLabel={statPastOrdersBtnLabel}
            statShowReorderBtn={statShowReorderBtn}
            statShowPastOrdersBtn={statShowPastOrdersBtn}
            statShowReorderNowBtn={statShowReorderNowBtn}
            statCoveredUntilText={statCoveredUntilText}
            statDaysRemainingText={statDaysRemainingText}
            statReorderNowBtnLabel={statReorderNowBtnLabel}
            statLoyaltyTitle={statLoyaltyTitle}
            statLoyaltyLinkText={statLoyaltyLinkText}
            statPrescriptionTitle={statPrescriptionTitle}
            rewardsPageUrl={rewardsPageUrl}
          />

          <NavigationSections 
            sections={sections}
             resolveDynamicValue={resolveDynamicValue}
            resolveDynamicTone={resolveDynamicTone}
            reviewProducts={reviewProducts}
            allReviewProductsCount={allReviewProducts.length}
            REVIEW_PAGE_SIZE={REVIEW_PAGE_SIZE}
            remainingReviewCount={remainingReviewCount}
            storefrontBase={storefrontBase}
            reviewTarget={reviewTarget}
            onReorder={handleReorder}
            reorderLoadingId={reorderLoadingId}
            lastOrder={lastOrder}
            showReviewProducts={showReviewProducts}
            reviewSubheading={reviewSubheading}
          />
        </s-stack>
      </s-query-container>
      
      <Modals 
        ongoingOrders={ongoingOrders}
        customStatuses={customStatuses}
        reorderLoadingId={reorderLoadingId}
        onReorder={handleReorder}
        api={api}
        selectedOrder={selectedOrder}
        lineItemsCount={lineItemsCount}
        cbSearchEnabled={cbSearchEnabled}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showTopReorder={showTopReorder}
        showBottomReorder={showBottomReorder}
        reorderButtonPosition={reorderButtonPosition}
        allReviewProducts={allReviewProducts}
        storefrontBase={storefrontBase}
        reviewTarget={reviewTarget}
        isLineItemsModalVisible={isLineItemsModalVisible}
        isAllOrdersModalVisible={isAllOrdersModalVisible}
        customer={customer}
      />
    </s-page>
  );
}