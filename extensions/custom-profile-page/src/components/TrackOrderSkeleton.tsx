import { h } from "preact";
import '@shopify/ui-extensions/preact';
import { DISPLAY_768_GRID, DISPLAY_768_NONE_GRID } from "../constants";

export function TrackOrderSkeleton() {
  const OrderRowSkeleton = () => (
    <s-box padding="base" border="base" borderRadius="large">
      <s-stack gap="base">
        {/* Desktop Skeleton Row */}
        <s-grid gridTemplateColumns="2fr 1fr 1fr 1fr" display={DISPLAY_768_GRID} alignItems="center" gap="base">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-box background="subdued" borderRadius="base" inlineSize="56px" blockSize="56px" border="base" />
            <s-stack gap="small-100">
              <s-box background="subdued" borderRadius="base" inlineSize="80px" blockSize="16px" border="base" />
              <s-box background="subdued" borderRadius="base" inlineSize="50px" blockSize="14px" border="base" />
            </s-stack>
          </s-stack>
          <s-stack gap="small-100">
            <s-box background="subdued" borderRadius="base" inlineSize="100px" blockSize="16px" border="base" />
            <s-box background="subdued" borderRadius="base" inlineSize="70px" blockSize="14px" border="base" />
          </s-stack>
          <s-box background="subdued" borderRadius="base" inlineSize="60px" blockSize="16px" border="base" />
          <s-box background="subdued" borderRadius="base" inlineSize="100px" blockSize="32px" border="base" />
        </s-grid>

        {/* Mobile Skeleton Row */}
        <s-grid gridTemplateColumns="1fr auto" display={DISPLAY_768_NONE_GRID} gap="small">
          <s-stack direction="inline" gap="base">
            <s-box background="subdued" borderRadius="base" inlineSize="52px" blockSize="52px" border="base" />
            <s-stack gap="small-100">
              <s-box background="subdued" borderRadius="base" inlineSize="80px" blockSize="16px" border="base" />
              <s-box background="subdued" borderRadius="base" inlineSize="40px" blockSize="14px" border="base" />
              <s-box background="subdued" borderRadius="base" inlineSize="100px" blockSize="14px" border="base" />
              <s-box background="subdued" borderRadius="base" inlineSize="70px" blockSize="14px" border="base" />
            </s-stack>
          </s-stack>
          <s-stack alignItems="end" gap="small">
            <s-box background="subdued" borderRadius="base" inlineSize="60px" blockSize="16px" border="base" />
            <s-box background="subdued" borderRadius="base" inlineSize="80px" blockSize="32px" border="base" />
          </s-stack>
        </s-grid>
      </s-stack>
    </s-box>
  );

  return (
    <s-page heading="Track Your Orders">
      <s-stack gap="base">
        <s-query-container>
          <s-box padding="large" background="base" border="base" borderRadius="large" inlineSize="100%">
            <s-stack gap="large">
              {/* Desktop Header Skeleton */}
              <s-grid gridTemplateColumns="2fr 1fr 1fr 1fr" display={DISPLAY_768_GRID} alignItems="center" paddingInline="base">
                <s-box background="subdued" borderRadius="base" inlineSize="60px" blockSize="16px" border="base" />
                <s-box background="subdued" borderRadius="base" inlineSize="50px" blockSize="16px" border="base" />
                <s-box background="subdued" borderRadius="base" inlineSize="40px" blockSize="16px" border="base" />
                <s-box background="subdued" borderRadius="base" inlineSize="50px" blockSize="16px" border="base" />
              </s-grid>
              <s-box display={DISPLAY_768_GRID}>
                <s-divider />
              </s-box>

              {/* Rows Skeleton */}
              <OrderRowSkeleton />
              <OrderRowSkeleton />
              <OrderRowSkeleton />
              <OrderRowSkeleton />
            </s-stack>
          </s-box>
        </s-query-container>
        <s-button disabled variant="secondary">Back</s-button>
      </s-stack>
    </s-page>
  );
}
