/** @jsx h */
import { h } from "preact";
import '@shopify/ui-extensions/preact';
import { 
  LAYOUT_768_2COL,
  LAYOUT_768_2COL_STACK,
  LAYOUT_500_3COL,
  SIZE_600_RESP_200,
  SIZE_600_RESP_100
} from "../../constants";

export function ProfileSkeleton() {
  return (
    <s-stack direction="block" gap="base">
      
      {/* Banner Skeleton */}
      <s-box background="subdued" borderRadius="base" padding="base">
        <s-grid gridTemplateColumns={LAYOUT_768_2COL} gap="base" alignItems="center">
          <s-grid-item>
            <s-stack direction="inline" gap="small" padding="small" alignItems="center">
              <s-box background="subdued" inlineSize="24px" blockSize="24px" borderRadius="full" border="base"></s-box>
              <s-stack direction="block" gap="small">
                <s-box background="subdued" inlineSize="150px" blockSize="24px" borderRadius="base"></s-box>
                <s-box background="subdued" inlineSize="100px" blockSize="16px" borderRadius="base"></s-box>
              </s-stack>
            </s-stack>
          </s-grid-item>
          <s-grid-item>
            <s-stack direction="block" alignItems="center">
              <s-box 
                inlineSize={SIZE_600_RESP_200}  
                blockSize={SIZE_600_RESP_100}
                borderRadius="base" 
                background="subdued"
                border="base"
              />
            </s-stack>
          </s-grid-item>
        </s-grid>
      </s-box>

      {/* Quick Actions Skeleton */}
      <s-grid gridTemplateColumns={LAYOUT_768_2COL_STACK} gap="base">
        <s-grid-item>
          <s-box background="subdued" borderRadius="base" padding="base">
            <s-grid gridTemplateColumns={LAYOUT_500_3COL} gap="base" alignItems="center">
              <s-grid-item>
                <s-box background="subdued" inlineSize="24px" blockSize="24px" borderRadius="full"></s-box>
              </s-grid-item>
              <s-grid-item>
                <s-stack direction="block" gap="none">
                  <s-box background="subdued" inlineSize="100px" blockSize="16px" borderRadius="base" marginBlockEnd="small-100"></s-box>
                  <s-box background="subdued" inlineSize="60px" blockSize="20px" borderRadius="base"></s-box>
                </s-stack>
              </s-grid-item>
              <s-grid-item>
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-box background="subdued" inlineSize="80px" blockSize="36px" borderRadius="base"></s-box>
                  <s-box background="subdued" inlineSize="120px" blockSize="36px" borderRadius="base"></s-box>
                </s-stack>
              </s-grid-item>
            </s-grid>
          </s-box>
        </s-grid-item>
        <s-grid-item>
          <s-box background="subdued" borderRadius="base" padding="base">
            <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
              <s-grid-item>
                <s-stack direction="block" gap="none">
                  <s-box background="subdued" inlineSize="120px" blockSize="16px" borderRadius="base" marginBlockEnd="small-100"></s-box>
                  <s-box background="subdued" inlineSize="80px" blockSize="20px" borderRadius="base"></s-box>
                </s-stack>
              </s-grid-item>
              <s-grid-item>
                <s-box background="subdued" inlineSize="24px" blockSize="24px" borderRadius="full"></s-box>
              </s-grid-item>
            </s-grid>
          </s-box>
        </s-grid-item>
      </s-grid>

      {/* Stat Cards Skeleton */}
      <s-grid gridTemplateColumns={LAYOUT_768_2COL_STACK} gap="base">
        <s-grid-item>
          <s-box background="subdued" borderRadius="base" padding="base">
            <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
              <s-grid-item>
                <s-box background="subdued" inlineSize="24px" blockSize="24px" borderRadius="full"></s-box>
              </s-grid-item>
              <s-grid-item>
                <s-box background="subdued" inlineSize="120px" blockSize="20px" borderRadius="base"></s-box>
              </s-grid-item>
              <s-grid-item>
                <s-box background="subdued" inlineSize="50px" blockSize="20px" borderRadius="base"></s-box>
              </s-grid-item>
            </s-grid>
          </s-box>
        </s-grid-item>
        <s-grid-item>
          <s-box background="subdued" borderRadius="base" padding="base">
            <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
              <s-grid-item>
                <s-box background="subdued" inlineSize="24px" blockSize="24px" borderRadius="full"></s-box>
              </s-grid-item>
              <s-grid-item>
                <s-box background="subdued" inlineSize="120px" blockSize="20px" borderRadius="base"></s-box>
              </s-grid-item>
              <s-grid-item>
                <s-box background="subdued" inlineSize="80px" blockSize="20px" borderRadius="base"></s-box>
              </s-grid-item>
            </s-grid>
          </s-box>
        </s-grid-item>
      </s-grid>

      {/* Navigation Sections Skeleton */}
      <s-grid gridTemplateColumns={LAYOUT_768_2COL_STACK} gap="base">
        {[1, 2, 3, 4].map((i) => (
          <s-box key={i} padding="base" background="base" borderRadius="base" border="base">
            <s-stack gap="base">
              <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                <s-grid-item>
                  <s-box background="subdued" inlineSize="100px" blockSize="24px" borderRadius="base"></s-box>
                </s-grid-item>
                <s-grid-item>
                  <s-box background="subdued" inlineSize="24px" blockSize="24px" borderRadius="full"></s-box>
                </s-grid-item>
              </s-grid>
              <s-stack gap="small">
                {[1, 2, 3].map((j) => (
                  <s-grid key={j} gridTemplateColumns="1fr auto" alignItems="center">
                    <s-box background="subdued" inlineSize="80px" blockSize="16px" borderRadius="base"></s-box>
                    <s-box background="subdued" inlineSize="40px" blockSize="16px" borderRadius="base"></s-box>
                  </s-grid>
                ))}
              </s-stack>
            </s-stack>
          </s-box>
        ))}
      </s-grid>

    </s-stack>
  );
}
