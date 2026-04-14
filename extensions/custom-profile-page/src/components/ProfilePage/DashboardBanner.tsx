import { h } from "preact";
import { renderReorderBannerDescription } from "../DashboardUtils";
import { 
  LAYOUT_768_2COL,
  SIZE_600_RESP_200,
  SIZE_600_RESP_100
} from "../../constants";

interface DashboardBannerProps {
  bannerEnabled: boolean;
  bannerTitle: string;
  bannerSubtitle: string;
  bannerImageUrl: string;
  showReorderWarning: boolean;
  reorderBannerHeading?: string;
  reorderBannerDescription?: string;
  olderOrderName: string | null;
  api: any;
  externalReorderLink: string | null;
}

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
              <s-stack direction="block" gap="small" padding="small">
                <s-heading>{bannerTitle}</s-heading>
                <s-text tone="neutral">{bannerSubtitle}</s-text>
              </s-stack>
            </s-grid-item>
            <s-grid-item>
              <s-stack direction="block" alignItems="center">
                <s-box 
                  inlineSize={SIZE_600_RESP_200}  
                  blockSize={SIZE_600_RESP_100}
                  borderRadius="large" 
                  overflow="hidden"
                >
                  <s-image 
                    src={bannerImageUrl} 
                    alt="Welcome" 
                    loading="lazy" 
                    objectFit="cover"
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
