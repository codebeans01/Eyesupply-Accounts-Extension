/** @jsx h */
import { h } from "preact";
import { 
  LAYOUT_768_2COL_STACK,
  LAYOUT_500_3COL
} from "../../constants";
import { calculateDaysRemaining, formatDateString, getPrescriptionStatus } from "../../helpers";

interface StatCardsProps {
  // From original QuickActions
  orders: any[];
  recentOrderItemsCount: number;
  daysRemaining: number | null;
  reorderLoadingId: string | null;
  onReorder: (id: string, name: string) => void;
  onShowRecentOrderDetails: () => void;
  // From original StatCards
  pointsDisplay: string;
  prescriptionExpiry: string;
  tags: string[];
  ordersCount: number;
  recentOrderIconUrl?: string;
  rewardsCardIconUrl?: string;
  prescriptionIconUrl?: string;
  daysRunOutIconUrl?: string;
}

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
  daysRunOutIconUrl
}: StatCardsProps) {
  const firstOrder = orders[0];
  const { text: statusText, tone } = getPrescriptionStatus(prescriptionExpiry, ordersCount, tags);

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
          <s-grid gridTemplateColumns={LAYOUT_500_3COL} gap="base" alignItems="center">
            <s-grid-item>
              {recentOrderIconUrl ? (
                <s-box inlineSize="24px" blockSize="24px">
                  <s-image src={recentOrderIconUrl} alt="Recent Order"></s-image>
                </s-box>
              ) : (
                <s-icon type="cart" size="base"></s-icon>
              )}
            </s-grid-item>
            <s-grid-item>
              <s-clickable 
                onClick={onShowRecentOrderDetails}
                command="--show" 
                commandFor="order-line-items-modal"
              >
                <s-stack direction="block" gap="none">
                  <s-text tone="neutral">Most Recent Order</s-text>
                  <s-text type="strong" tone="info">{firstOrder?.name || "#1111"}</s-text>
                  <s-text tone="neutral">{recentOrderItemsCount + " items"}</s-text>
                </s-stack>
              </s-clickable>
            </s-grid-item>
            <s-grid-item>
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-button 
                  variant="primary" 
                  loading={reorderLoadingId === (firstOrder?.id || "none")}
                  onClick={() => onReorder(firstOrder?.id, firstOrder?.name || "")}
                >
                  REORDER
                </s-button>
                <s-button 
                  variant="secondary" 
                  href="shopify://customer-account/orders"
                >
                  <s-stack direction="inline" gap="small-200" alignItems="center">
                    <s-text type="strong">Reorder Past Orders</s-text>
                    <s-icon type="arrow-right" size="small"></s-icon>
                  </s-stack>
                </s-button>
              </s-stack>
            </s-grid-item>
          </s-grid>
        </s-box>
      </s-grid-item>

      {/* 2. Days Till Run Out */}
      <s-grid-item>
        <s-box background="subdued" borderRadius="base" padding="base" blockSize="100%">
          <s-grid gridTemplateColumns={LAYOUT_500_3COL} gap="base" alignItems="center">
            <s-grid-item>
              {daysRunOutIconUrl ? (
                <s-box inlineSize="24px" blockSize="24px">
                  <s-image src={daysRunOutIconUrl} alt="Days Till Run Out"></s-image>
                </s-box>
              ) : (
                <s-icon type="calendar" size="base"></s-icon>
              )}
            </s-grid-item>
            <s-grid-item>
              <s-stack direction="block" gap="none">
                <s-text type="strong">You’re covered until {coveredUntil || "..."}</s-text>
                <s-text tone="neutral">{daysRemaining ?? "0"} days remaining</s-text>
              </s-stack>
            </s-grid-item>
            <s-grid-item>
              <s-button 
                variant="primary" 
                loading={reorderLoadingId === (firstOrder?.id || "none")}
                onClick={() => onReorder(firstOrder?.id, firstOrder?.name || "")}
              >
                Reorder now
              </s-button>
            </s-grid-item>
          </s-grid>
        </s-box>
      </s-grid-item>

      {/* 3. Rewards / Loyalty Points */}
      <s-grid-item>
        <s-box background="subdued" borderRadius="base" padding="base" blockSize="100%">
          <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
            <s-grid-item>
              {rewardsCardIconUrl ? (
                <s-box inlineSize="24px" blockSize="24px">
                  <s-image src={rewardsCardIconUrl} alt="Rewards"></s-image>
                </s-box>
              ) : (
                <s-icon type="star" size="base"></s-icon>
              )}
            </s-grid-item>
            <s-grid-item>
              <s-text type="strong">My Loyalty Points</s-text>
            </s-grid-item>
            <s-grid-item>
              <s-text type="strong">{pointsDisplay}</s-text>
            </s-grid-item>
          </s-grid>
        </s-box>
      </s-grid-item>

      {/* 4. Prescription */}
      <s-grid-item>
        <s-box background="subdued" borderRadius="base" padding="base" blockSize="100%">
          <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
            <s-grid-item>
              {prescriptionIconUrl ? (
                <s-box inlineSize="24px" blockSize="24px">
                  <s-image src={prescriptionIconUrl} alt="Prescription"></s-image>
                </s-box>
              ) : (
                <s-icon type="calendar" size="base"></s-icon>
              )}
            </s-grid-item>
            <s-grid-item>
              <s-stack direction="block" gap="small">
                <s-text type="strong">Prescription Expiry</s-text>
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

