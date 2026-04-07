/** @jsx h */
import { h } from "preact";
import { 
  LAYOUT_768_2COL_STACK,
  LAYOUT_500_3COL
} from "../../constants";

interface QuickActionsProps {
  orders: any[];
  recentOrderItemsCount: number;
  daysRemainingDisplay: string;
  reorderLoadingId: string | null;
  onReorder: (id: string, name: string) => void;
  onShowRecentOrderDetails: () => void;
}

export function QuickActions({
  orders,
  recentOrderItemsCount,
  daysRemainingDisplay,
  reorderLoadingId,
  onReorder,
  onShowRecentOrderDetails
}: QuickActionsProps) {
  const firstOrder = orders[0];

  return (
    <s-grid gridTemplateColumns={LAYOUT_768_2COL_STACK} gap="base">
      <s-grid-item>
        <s-box background="subdued" borderRadius="base" padding="base">
          <s-grid gridTemplateColumns={LAYOUT_500_3COL} gap="base" alignItems="center">
            <s-grid-item>
              <s-icon type="cart" size="base"></s-icon>
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
      <s-grid-item>
        <s-box background="subdued" borderRadius="base" padding="base">
          <s-stack direction="block" gap="none">
            <s-text tone="neutral">Days Till Run Out</s-text>
            <s-text type="strong">{daysRemainingDisplay}</s-text>
          </s-stack>
        </s-box>
      </s-grid-item>
    </s-grid>
  );
}
