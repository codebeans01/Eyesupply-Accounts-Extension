import { h } from "preact";
import { renderReorderBannerDescription } from "../DashboardUtils";
import { 
  LAYOUT_768_2COL,
  SIZE_600_RESP_200
} from "../../constants";
import { DashboardBannerProps } from "../../interface";

export function DashboardBanner({
  bannerEnabled,
  bannerTitle,
  bannerSubtitle,
  bannerImageUrl,
  showReorderWarning,
  reorderBannerHeading,
  reorderBannerDescription,
  olderOrderName,
  api,
  externalReorderLink
}: DashboardBannerProps) {
  return (
    <s-stack direction="block" gap="base">
      {showReorderWarning && (
        <s-banner 
          id="reorder-warning"
          tone="critical"
          heading={reorderBannerHeading}
        >
          {renderReorderBannerDescription(reorderBannerDescription || "", olderOrderName, api, externalReorderLink)}
        </s-banner>
      )}

      {bannerEnabled && (
        <s-box background="subdued" borderRadius="base" padding="base">
          <s-grid gridTemplateColumns={LAYOUT_768_2COL} gap="base" alignItems="center">
            <s-grid-item>
              <s-stack direction="block" gap="none" padding="small">
                <s-stack direction="block" gap="base">
                  {bannerTitle.split(/<br\s*\/?>/gi).map((line, i) => (
                    i === 0 ? (
                      <s-heading key={i}>{line || "\u00A0"}</s-heading>
                    ) : (
                      <s-text key={i} type="strong" tone="neutral">{line || "\u00A0"}</s-text>
                    )
                  ))}
                </s-stack>
                {bannerSubtitle && (
                  <s-stack direction="block" gap="base">
                    {bannerSubtitle.split(/<br\s*\/?>/gi).map((line, i) => (
                      <s-text key={i} tone="neutral">{line || "\u00A0"}</s-text>
                    ))}
                  </s-stack>
                )}
              </s-stack>
            </s-grid-item>
            <s-grid-item>
              <s-stack direction="block" alignItems="center">
                <s-box 
                  inlineSize={SIZE_600_RESP_200}  
                  borderRadius="large" 
                  overflow="hidden"
                >
                  <s-image 
                    src={bannerImageUrl} 
                    alt="Welcome" 
                    loading="lazy" 
                    aspectRatio="16/9"
                  ></s-image>
                </s-box>
              </s-stack>
            </s-grid-item>
          </s-grid>
        </s-box>
      )}
    </s-stack>
  );
}
