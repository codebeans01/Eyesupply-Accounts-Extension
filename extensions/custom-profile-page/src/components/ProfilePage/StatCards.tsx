/** @jsx h */
import { h } from "preact";
import { 
  LAYOUT_768_2COL_STACK
} from "../../constants";
import { calculateDaysRemaining } from "../../helpers";

interface StatCardsProps {
  pointsDisplay: string;
  prescriptionExpiry: string;
  tags: string[];
  ordersCount: number;
}

export function StatCards({
  pointsDisplay,
  prescriptionExpiry,
  tags,
  ordersCount
}: StatCardsProps) {
  const daysLeft = calculateDaysRemaining(prescriptionExpiry);
  // Check for loyalty override: 3+ orders AND 'prescription' tag
  const isLoyalCustomer = ordersCount >= 3 && tags.some(tag => tag.toLowerCase().includes("prescription"));

  const statusLabels = {
    all: `All up to date — ${daysLeft} days left`,
    soon: `Expiring soon — ${daysLeft} days left`,
    expired: `Expired — 0 days left`,
    loyalty: "All up to date"
  };

  const statusText = isLoyalCustomer ? statusLabels.loyalty : 
    daysLeft === null ? "Not provided" : 
    daysLeft >= 60 ? statusLabels.all :
    daysLeft >= 30 ? statusLabels.soon :
    daysLeft > 0 ? statusLabels.soon : statusLabels.expired;

  const tone: "neutral" | "success" | "warning" | "critical" = isLoyalCustomer ? "success" :
    daysLeft === null ? "neutral" : 
    daysLeft >= 60 ? "success" : 
    daysLeft >= 30 ? "warning" : "critical";

  // Format date: "Expires 23 June 2026"
  const formatDate = (dateStr: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      
      const day = date.getDate();
      const monthNames = ["January", "February", "March", "April", "May", "June", 
                          "July", "August", "September", "October", "November", "December"];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      
      return `Expires ${day} ${month} ${year}`;
    } catch (e) {
      return null;
    }
  };

  const formattedExpiry = formatDate(prescriptionExpiry);

  return (
    <s-grid gridTemplateColumns={LAYOUT_768_2COL_STACK} gap="base">
      <s-grid-item>
        <s-box background="subdued" borderRadius="base" padding="base" minInlineSize="100%">
          <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
            <s-grid-item>
              <s-icon type="star" size="base"></s-icon>
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
      <s-grid-item>
        <s-box background="subdued" borderRadius="base" padding="base" minInlineSize="100%">
          <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
            <s-grid-item>
              <s-icon type="calendar" size="base"></s-icon>
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
