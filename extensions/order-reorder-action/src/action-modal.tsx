import { render } from "preact";
import '@shopify/ui-extensions/preact';
import { useState, useEffect } from "preact/hooks";
import { fetchShopDomain, getSettings } from "./helpers";
import { MissingItem } from './reorder.helpers';
import { fetchReorderResult } from './reorder.service';
import { DashboardSettings } from "./interface";
import { DEFAULT_SETTINGS } from "./constants";
import { h } from "preact";

const SCustomerAccountAction = (props: any) => h("s-customer-account-action", props);
const SSection = (props: any) => h("s-section", props);
const SStack = (props: any) => h("s-stack", props);
const SText = (props: any) => h("s-text", props);
const SLink = (props: any) => h("s-link", props);

const ReorderBannerDescription = ({ text, olderOrderName, onProceed }: any) => {
  if (!text) return null;
  const paragraphs = text.split(/<br\s*\/?>/i);
  return h(SStack, { direction: "block", gap: "small" },
    paragraphs.map((p: string, idx: number) => {
      let parts = [p] as (string | any)[];
      
      // Handle {{order_id}}
      parts = parts.flatMap((part) => {
        if (typeof part !== 'string') return [part];
        const segments = part.split("{{order_id}}");
        const res = [] as (string | any)[];
        segments.forEach((seg, i) => {
          if (seg) res.push(seg);
          if (i < segments.length - 1) {
            res.push(h(SText, { type: "strong" }, olderOrderName || ""));
          }
        });
        return res;
      });

      // Handle {{click_here}}
      parts = parts.flatMap((part) => {
        if (typeof part !== 'string') return [part];
        const segments = part.split("{{click_here}}");
        const res = [] as (string | any)[];
        segments.forEach((seg, i) => {
          if (seg) res.push(seg);
          if (i < segments.length - 1) {
            res.push(h(SLink, { onClick: onProceed }, "Click here"));
          }
        });
        return res;
      });

      return h(SText, { key: idx }, parts);
    })
  );
};

function ActionModal() {
  const [api, setApi] = useState((globalThis as any).shopify);
  const [loading, setLoading] = useState(true);
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [olderOrderName, setOlderOrderName] = useState<string | null>(null);
  const [dynamicSettings, setDynamicSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // Poll for Shopify API if not immediately available
  useEffect(() => {
    if (!api) {
      const interval = setInterval(() => {
        const currentShopify = (globalThis as any).shopify;
        if (currentShopify?.query) {
          setApi(currentShopify);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [api]);

  useEffect(() => {
    async function loadSettings() {
      try {
        if (!api || !api.query) {
          console.warn("[ActionModal] Shopify API not ready yet");
          return;
        }

        const { settings, error } = await getSettings(api);
        if (settings) {
          setDynamicSettings((prev) => {
            const updated = { ...prev, ...settings };
            return updated;
          });
        } else if (error) {
          console.error("[ActionModal] Settings load failed:", error);
        }
      } catch (e) {
        console.error("[ActionModal] Failed to fetch dynamic settings", e);
      } finally {
        setIsSettingsLoaded(true);
      }
    }
    loadSettings();
  }, [api]);

  useEffect(() => {
    if (!isSettingsLoaded) return;

    async function runReorder() {
      try {
        const orderId: string = api?.orderId;
        if (!orderId) throw new Error("Order ID not found");

        const shopDomain = await fetchShopDomain();
        const excludeTrial = true;
        const excludeVariantIds = (dynamicSettings?.exclude_variant_ids as string) || "";
        const result = await fetchReorderResult(
          orderId, 
          shopDomain, 
          excludeTrial,
          excludeVariantIds
        );

        const url = result?.redirectUrl ?? null;
        const missing = result?.missingItems ?? [];
        const orderName = result?.orderName ?? null;

        setRedirectUrl(url);
        setMissingItems(missing);
        setOlderOrderName(orderName);
        setLoading(false);

        // Auto-redirect ONLY if no missing items exist
        if ((!missing || missing.length === 0) && url) {
          if (api?.navigation?.navigate) {
            api.navigation.navigate(url);
            // Brief delay before closing to allow navigation to start
            setTimeout(() => api?.close?.(), 3000);
          }
        }

      } catch (err: any) {
        console.error("[ActionModal] Reorder error:", err);
        setError(err?.message ?? "Failed to process reorder");
        setLoading(false);
      }
    }

    runReorder();
  }, [isSettingsLoaded, api]);

  const handleClose = () => api?.close?.();

  const handleProceed = () => {
    const targetUrl = dynamicSettings?.external_reorder_link || redirectUrl;
    if (targetUrl && api?.navigation?.navigate) {
      api.navigation.navigate(targetUrl);
      setTimeout(() => api?.close?.(), 3000);
    }
  };

  if (loading) {
    return (
      /* @ts-ignore */
      <s-customer-account-action heading="Reorder">
        <s-section>
          <s-text>Checking product availability...</s-text>
        </s-section>
      </s-customer-account-action>
    );
  }

  if (error) {
    return (
      /* @ts-ignore */
      <s-customer-account-action heading="Error">
        <s-section padding="base">
          <s-text tone="critical">{error}</s-text>
        </s-section>
        <s-button slot="primary-action" onClick={handleClose}>Close</s-button>
      </s-customer-account-action>
    );
  }

  // Case 1: All items available OR we have a redirect but no UI needed for missing items
  if (redirectUrl && (!missingItems || missingItems.length === 0)) {
    return (
      /* @ts-ignore */
      <s-customer-account-action heading="Success">
        <s-section padding="base">
          {/* @ts-ignore */}
          <s-stack direction="block" gap="base">
            <s-text>All items are available and ready to reorder!</s-text>
            <s-text>Click below to go to your cart if you aren't redirected automatically.</s-text>
          </s-stack>
        </s-section>
        <s-button slot="primary-action" onClick={handleProceed}>
          Go to Cart
        </s-button>
        <s-button slot="secondary-actions" onClick={handleClose}>
          Cancel
        </s-button>
      </s-customer-account-action>
    );
  }

  // Case 2: Missing items exist (Upgrade/Availability mismatch)
  return h(SCustomerAccountAction, { 
      heading: dynamicSettings?.cb_reorder_banner_heading || "Reordering from an older order?" 
    },
    h(SSection, { padding: "base" },
      h(ReorderBannerDescription, {
        text: dynamicSettings?.cb_reorder_banner_description || "",
        olderOrderName: olderOrderName,
        onProceed: handleProceed
      })
    )
  );
}

export default () => {
  // Use Fragment as a wrapper if needed or just render the component
  // Casting document.body to any to avoid potential linting mismatches in this specific environment
  render(<ActionModal />, document.body as any);
};
