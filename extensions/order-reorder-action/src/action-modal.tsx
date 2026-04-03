import { render } from "preact";
import '@shopify/ui-extensions/preact';
import { useState, useEffect } from "preact/hooks";
import { fetchShopDomain, getSettings } from "./helpers";
import { MissingItem } from './reorder.helpers';
import { fetchReorderResult } from './reorder.service';
import { DashboardSettings } from "./interface";
import { DEFAULT_SETTINGS } from "./constants";

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
      console.log("[ActionModal] Waiting for Shopify API...");
      const interval = setInterval(() => {
        const currentShopify = (globalThis as any).shopify;
        if (currentShopify?.query) {
          console.log("[ActionModal] Shopify API detected!");
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
        console.log("[ActionModal] Fetched settings:", { settings, error });

        if (settings) {
          setDynamicSettings((prev) => {
            const updated = { ...prev, ...settings };
            console.log("[ActionModal] Updating settings state with:", updated);
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
  return (
    /* @ts-ignore */
    <s-customer-account-action heading="Reordering from an older order?">
      <s-section padding="base">
        {/* @ts-ignore */}
        <s-stack direction="block" gap="base">
          <s-text>
            Because we’ve upgraded our website, older orders can’t be reordered directly through the new system. Please add your items to cart manually this time. Going forward, reordering will work smoothly from your account.
          </s-text>
          <s-text>
            Need Help for your Order <s-text type="strong">{olderOrderName}</s-text>? <s-link onClick={handleProceed}>Click here</s-link> and we’ll load your previous order into cart for you.
          </s-text>
        </s-stack>
      </s-section>
    </s-customer-account-action>
  );
}

export default () => {
  // Use Fragment as a wrapper if needed or just render the component
  // Casting document.body to any to avoid potential linting mismatches in this specific environment
  render(<ActionModal />, document.body as any);
};
