import { h } from "preact";
import '@shopify/ui-extensions/preact';
import {
  LAYOUT_768_2COL_STACK,
  LAYOUT_500_3COL,
  LAYOUT_768_2COL,
  SIZE_600_RESP_200,
  SIZE_600_RESP_100
} from "../../constants";

export function ProfileSkeleton() {
  const StatCardSkeleton = ({ hasButton = false }: { hasButton?: boolean }) => (
    <s-grid-item>
      <s-box background="subdued" borderRadius="base" padding="base" blockSize="100%">
        <s-grid gridTemplateColumns={LAYOUT_500_3COL} gap="small" alignItems="center">
          <s-grid-item>
            <s-box 
              background="subdued" 
              borderRadius="large-100" 
              inlineSize="24px" 
              blockSize="24px" 
              border="base"
            />
          </s-grid-item>
          <s-grid-item>
            <s-stack direction="block" gap="small-100">
              <s-box background="subdued" borderRadius="base" inlineSize="80%" maxInlineSize="140px" blockSize="14px" border="base" />
              <s-box background="subdued" borderRadius="base" inlineSize="60%" maxInlineSize="100px" blockSize="12px" border="base" />
            </s-stack>
          </s-grid-item>
          <s-grid-item>
            {hasButton ? (
              <s-box background="subdued" borderRadius="base" inlineSize="100px" blockSize="32px" border="base" />
            ) : (
              <s-box background="subdued" borderRadius="base" inlineSize="60px" blockSize="18px" border="base" />
            )}
          </s-grid-item>
        </s-grid>
      </s-box>
    </s-grid-item>
  );

  const NavCardSkeleton = () => (
    <s-grid-item>
      <s-box background="base" borderRadius="base" padding="base" border="base" blockSize="100%">
        <s-stack direction="block" gap="base">
          <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
            <s-grid-item>
              <s-box background="subdued" borderRadius="base" inlineSize="80%" maxInlineSize="100px" blockSize="20px" border="base" />
            </s-grid-item>
            <s-grid-item>
              <s-box background="subdued" borderRadius="large-100" inlineSize="20px" blockSize="20px" border="base" />
            </s-grid-item>
          </s-grid>
          <s-box background="subdued" borderRadius="base" inlineSize="100%" blockSize="1px" />
          <s-stack direction="block" gap="small">
            <s-box background="subdued" borderRadius="base" inlineSize="70%" maxInlineSize="200px" blockSize="14px" border="base" />
            <s-box background="subdued" borderRadius="base" inlineSize="50%" maxInlineSize="150px" blockSize="14px" border="base" />
            <s-box background="subdued" borderRadius="base" inlineSize="60%" maxInlineSize="180px" blockSize="14px" border="base" />
          </s-stack>
        </s-stack>
      </s-box>
    </s-grid-item>
  );

  return (
    <s-stack direction="block" gap="base">
      {/* 1. Dashboard Banner Skeleton */}
      <s-box background="subdued" borderRadius="base" padding="large" border="base">
        <s-grid gridTemplateColumns={LAYOUT_768_2COL} gap="large" alignItems="center">
          <s-grid-item>
            <s-stack direction="block" gap="small">
              <s-box background="subdued" borderRadius="base" inlineSize="90%" maxInlineSize="200px" blockSize="32px" border="base" />
              <s-box background="subdued" borderRadius="base" inlineSize="70%" maxInlineSize="140px" blockSize="18px" border="base" />
            </s-stack>
          </s-grid-item>
          <s-grid-item>
            <s-box 
              background="subdued" 
              borderRadius="base" 
              inlineSize={SIZE_600_RESP_200} 
              blockSize={SIZE_600_RESP_100} 
              border="base" 
            />
          </s-grid-item>
        </s-grid>
      </s-box>

      {/* 2. Stat Cards Skeleton */}
      <s-grid gridTemplateColumns={LAYOUT_768_2COL_STACK} gap="base">
        <StatCardSkeleton hasButton />
        <StatCardSkeleton hasButton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </s-grid>

      {/* 3. Navigation Sections Skeleton */}
      <s-grid gridTemplateColumns={LAYOUT_768_2COL_STACK} gap="base">
        <NavCardSkeleton />
        <NavCardSkeleton />
        <NavCardSkeleton />
        <NavCardSkeleton />
        <NavCardSkeleton />
        <NavCardSkeleton />
        <NavCardSkeleton />
        <NavCardSkeleton />
      </s-grid>
    </s-stack>
  );
}
