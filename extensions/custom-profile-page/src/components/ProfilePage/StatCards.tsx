/** @jsx h */
import { h } from "preact";
import { 
  LAYOUT_768_2COL_STACK
} from "../../constants";

interface StatCardsProps {
  pointsDisplay: string;
  prescriptionExpiry: string;
}

export function StatCards({
  pointsDisplay,
  prescriptionExpiry
}: StatCardsProps) {
  return (
    <s-grid gridTemplateColumns={LAYOUT_768_2COL_STACK} gap="base">
      <s-grid-item>
        <s-box background="subdued" borderRadius="base" padding="base">
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
        <s-box background="subdued" borderRadius="base" padding="base">
          <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
            <s-grid-item>
              <s-icon type="calendar" size="base"></s-icon>
            </s-grid-item>
            <s-grid-item>
              <s-text type="strong">Prescription Expiry</s-text>
            </s-grid-item>
            <s-grid-item>
              <s-text type="strong">{prescriptionExpiry}</s-text>
            </s-grid-item>
          </s-grid>
        </s-box>
      </s-grid-item>
    </s-grid>
  );
}
