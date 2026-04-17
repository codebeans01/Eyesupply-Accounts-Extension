import { h } from "preact";
import { 
  LAYOUT_768_2COL_STACK,
  LAYOUT_500_3COL
} from "../../constants";
import { formatDateString, getPrescriptionStatus } from "../../helpers";
import { StatCardsProps } from "../../interface";

export function StatCards({
  orders,
  recentOrderItemsCount,
  daysRemaining,
  reorderLoadingId,
  onReorder,
  onShowRecentOrderDetails,
  pointsDisplay,
  prescriptionExpiry,
  tags,
  ordersCount,
  recentOrderIconUrl,
  rewardsCardIconUrl,
  prescriptionIconUrl,
  daysRunOutIconUrl,
  statRecentOrderTitle = "Most Recent Order",
  statReorderBtnLabel = "REORDER",
  statPastOrdersBtnLabel = "Reorder Past Orders",
  statShowReorderBtn = true,
  statShowPastOrdersBtn = true,
  statShowReorderNowBtn = true,
  statCoveredUntilText = "You’re covered until",
  statDaysRemainingText = "days remaining",
  statReorderNowBtnLabel = "Reorder now",
  statLoyaltyTitle = "My Loyalty Points",
  statLoyaltyLinkText = "Earn & Redeem",
  statPrescriptionTitle = "Prescription Expiry",
  rewardsPageUrl = "/pages/rewards",
  fallbackNotProvided,
  fallback0Points,
  fallback0Days,
  fallbackNoOrders,
  fallback0Orders,
  fallbackPrescriptionCompleted,
  points
}: StatCardsProps) {
  const firstOrder = orders[0];
  const { text: statusText, tone } = getPrescriptionStatus(prescriptionExpiry, ordersCount, tags, fallbackPrescriptionCompleted);

  const formattedExpiry = formatDateString(prescriptionExpiry);
  
  const getCoveredUntilDate = (days?: number | null) => {
    if (days === null || days === undefined) return "";
    const date = new Date();
    date.setDate(date.getDate() + days);
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  const coveredUntil = getCoveredUntilDate(daysRemaining);

  return (
    <s-grid gridTemplateColumns={LAYOUT_768_2COL_STACK} gap="base">
      {/* 1. Most Recent Order */}
      <s-grid-item>
        <s-box background="subdued" borderRadius="base" padding="base" blockSize="100%">
          <s-grid gridTemplateColumns={LAYOUT_500_3COL} gap="small" alignItems="center">
            <s-grid-item>
              <s-box inlineSize="24px" blockSize="24px">
                {recentOrderIconUrl ? (
                  <s-image src={recentOrderIconUrl} alt="Recent Order"></s-image>
                ) : (
                  <s-icon type="cart"></s-icon>
                )}
              </s-box>
            </s-grid-item>
            <s-grid-item>
              <s-clickable 
                onClick={onShowRecentOrderDetails}
                command="--show" 
                commandFor="order-line-items-modal"
              >
                <s-stack direction="block" gap="none">
                  <s-text tone="neutral">{statRecentOrderTitle}</s-text>
                  <s-text type="strong" tone="info">{firstOrder?.name || fallbackNoOrders}</s-text>
                  <s-text tone="neutral">{(recentOrderItemsCount || 0) > 0 ? recentOrderItemsCount + " items" : fallback0Orders}</s-text>
                </s-stack>
              </s-clickable>
            </s-grid-item>
            <s-grid-item>
              <s-stack direction="inline" gap="small" alignItems="center">
                {statShowReorderBtn && (
                  <s-button 
                    variant="primary" 
                    loading={reorderLoadingId === (firstOrder?.id || "none")}
                    onClick={() => onReorder(firstOrder?.id, firstOrder?.name || "")}
                  >
                    {statReorderBtnLabel}
                  </s-button>
                )}
                {statShowPastOrdersBtn && (
                  <s-button 
                    variant="secondary" 
                    href="shopify://customer-account/orders"
                  >
                    <s-stack direction="inline" gap="small-200" alignItems="center">
                      <s-text type="strong">{statPastOrdersBtnLabel}</s-text>
                      <s-icon type="arrow-right" size="small"></s-icon>
                    </s-stack>
                  </s-button>
                )}
              </s-stack>
            </s-grid-item>
          </s-grid>
        </s-box>
      </s-grid-item>

      {/* 2. Days Till Run Out */}
      <s-grid-item>
        <s-box background="subdued" borderRadius="base" padding="base" blockSize="100%">
          <s-grid gridTemplateColumns={LAYOUT_500_3COL} gap="small" alignItems="center">
            <s-grid-item>
              <s-box inlineSize="24px" blockSize="24px">
                {daysRunOutIconUrl ? (
                  <s-image src={daysRunOutIconUrl} alt="Days Till Run Out"></s-image>
                ) : (
                  <s-icon type="calendar"></s-icon>
                )}
              </s-box>
            </s-grid-item>
            <s-grid-item>
              <s-stack direction="block" gap="none">
                <s-text type="strong">{statCoveredUntilText} {coveredUntil || "..."}</s-text>
                <s-text tone="neutral">
                  {daysRemaining 
                    ? `${daysRemaining} ${statDaysRemainingText}` 
                    : (fallback0Days || `0 ${statDaysRemainingText}`)}
                </s-text>
              </s-stack>
            </s-grid-item>
            <s-grid-item>
              {statShowReorderNowBtn && (
                <s-button 
                  variant="primary" 
                  loading={reorderLoadingId === (firstOrder?.id || "none")}
                  onClick={() => onReorder(firstOrder?.id, firstOrder?.name || "")}
                >
                  {statReorderNowBtnLabel}
                </s-button>
              )}
            </s-grid-item>
          </s-grid>
        </s-box>
      </s-grid-item>

      {/* 3. Rewards / Loyalty Points */}
      <s-grid-item>
        <s-box background="subdued" borderRadius="base" padding="base" blockSize="100%">
          <s-grid gridTemplateColumns="auto 1fr auto" gap="small" alignItems="center">
            <s-grid-item>
              <s-box inlineSize="24px" blockSize="24px">
                {rewardsCardIconUrl ? (
                  <s-image src={rewardsCardIconUrl} alt="Rewards"></s-image>
                ) : (
                  <s-icon type="star"></s-icon>
                )}
              </s-box>
            </s-grid-item>
            <s-grid-item>
              <s-stack direction="block" gap="small">
                <s-text type="strong">{statLoyaltyTitle}</s-text>
                <s-clickable href={rewardsPageUrl}>
                  <s-text tone="custom">{statLoyaltyLinkText}</s-text> 
                </s-clickable>
              </s-stack>
            </s-grid-item>
            <s-grid-item>
              <s-heading>{points ? pointsDisplay : (fallback0Points || pointsDisplay)}</s-heading>
            </s-grid-item>
          </s-grid>
        </s-box>
      </s-grid-item>

      {/* 4. Prescription */}
      <s-grid-item>
        <s-box background="subdued" borderRadius="base" padding="base" blockSize="100%">
          <s-grid gridTemplateColumns="auto 1fr auto" gap="small" alignItems="center">
            <s-grid-item>
              <s-box inlineSize="24px" blockSize="24px">
                {prescriptionIconUrl ? (
                  <s-image src={prescriptionIconUrl} alt="Prescription"></s-image>
                ) : (
                  <s-icon type="calendar"></s-icon>
                )}
              </s-box>
            </s-grid-item>
            <s-grid-item>
              <s-stack direction="block" gap="small">
                <s-text type="strong">{statPrescriptionTitle}</s-text>
                {formattedExpiry && (
                  <s-text tone="neutral">{formattedExpiry}</s-text>
                )}
              </s-stack>
            </s-grid-item>
            <s-grid-item>
              <s-text type="strong" tone={tone}>{statusText}</s-text>
            </s-grid-item>
          </s-grid>
        </s-box>
      </s-grid-item>
    </s-grid>
  );
}

