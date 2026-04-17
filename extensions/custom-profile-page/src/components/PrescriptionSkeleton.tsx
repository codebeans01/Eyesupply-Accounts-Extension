import { h } from "preact";
import '@shopify/ui-extensions/preact';

const MOBILE_ONLY_LABEL = "@container (inline-size > 400px) none, auto";
const DESKTOP_ONLY_HEADER = "@container (inline-size > 400px) auto, none";
const RESPONSIVE_GRID = "@container (inline-size > 400px) 1fr 1fr 1.2fr 1.8fr, 1fr";
const RESPONSIVE_PADDING = "@container (inline-size > 400px) none, base";

export function PrescriptionSkeleton() {
  const RowSkeleton = () => (
    <>
      <s-grid 
        gridTemplateColumns={RESPONSIVE_GRID} 
        gap="base" 
        alignItems="center"
        paddingBlock={RESPONSIVE_PADDING}
      >
        {/* ID Column */}
        <s-stack gap="small-200">
           <s-box display={MOBILE_ONLY_LABEL}>
             <s-box background="subdued" borderRadius="base" inlineSize="40px" blockSize="14px" border="base" />
           </s-box>
           <s-box background="subdued" borderRadius="base" inlineSize="140px" maxInlineSize="80%" blockSize="16px" border="base" />
        </s-stack>

        {/* Expiry Date Column */}
        <s-stack gap="small-200">
           <s-box display={MOBILE_ONLY_LABEL}>
             <s-box background="subdued" borderRadius="base" inlineSize="80px" blockSize="14px" border="base" />
           </s-box>
           <s-box background="subdued" borderRadius="base" inlineSize="100px" maxInlineSize="60%" blockSize="14px" border="base" />
        </s-stack>

        {/* Status Column */}
        <s-stack gap="small-200">
           <s-box display={MOBILE_ONLY_LABEL}>
              <s-box background="subdued" borderRadius="base" inlineSize="60px" blockSize="14px" border="base" />
           </s-box>
           <s-box background="subdued" borderRadius="large-100" inlineSize="80px" blockSize="24px" border="base" />
        </s-stack>

        {/* Documents Column */}
        <s-stack gap="small-200">
           <s-box display={MOBILE_ONLY_LABEL}>
              <s-box background="subdued" borderRadius="base" inlineSize="80px" blockSize="14px" border="base" />
           </s-box>
           <s-stack direction="inline" gap="small-500" alignItems="center">
              <s-box background="subdued" borderRadius="small" inlineSize="24px" blockSize="24px" border="base" />
              <s-box background="subdued" borderRadius="base" inlineSize="120px" maxInlineSize="70%" blockSize="14px" border="base" />
           </s-stack>
        </s-stack>
      </s-grid>
      <s-divider />
    </>
  );

  return (
    <s-page heading="My Prescriptions">
      <s-stack gap="base">
        <s-query-container>
          <s-box padding="base" background="base" borderRadius="base" border="base">
            <s-stack gap="base">
              {/* Header Skeleton */}
              <s-grid 
                gridTemplateColumns="1fr 1fr 1.2fr 1.8fr" 
                gap="base" 
                alignItems="center"
                display={DESKTOP_ONLY_HEADER}
              >
                <s-box background="subdued" borderRadius="base" inlineSize="40px" blockSize="16px" border="base" />
                <s-box background="subdued" borderRadius="base" inlineSize="80px" blockSize="16px" border="base" />
                <s-box background="subdued" borderRadius="base" inlineSize="60px" blockSize="16px" border="base" />
                <s-box background="subdued" borderRadius="base" inlineSize="80px" blockSize="16px" border="base" />
              </s-grid>
              <s-box display={DESKTOP_ONLY_HEADER}>
                <s-divider />
              </s-box>

              {/* Rows Skeleton */}
              <RowSkeleton />
              <RowSkeleton />
              <RowSkeleton />
              <RowSkeleton />
              <RowSkeleton />
            </s-stack>
          </s-box>
        </s-query-container>

        <s-button disabled variant="secondary">Back</s-button>
      </s-stack>
    </s-page>
  );
}
