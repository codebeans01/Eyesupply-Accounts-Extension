/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment, render } from "preact";
import '@shopify/ui-extensions/preact';
import { useState, useEffect } from "preact/hooks";
import { fetchShopDomain } from "./helpers";
import { MissingItem } from './reorder.helpers';
import { fetchReorderResult } from './reorder.service';

function ActionModal() {
  const api = (globalThis as any).shopify;
  const [loading, setLoading] = useState(true);
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState(api?.settings?.value ?? {});
  const [olderOrderName, setOlderOrderName] = useState<string | null>(null);
  
  useEffect(() => {
    const unsubscribe = api.settings?.subscribe?.((newSettings: any) => {
      setSettings(newSettings ?? {});
    });
    return () => unsubscribe?.();
  }, [api.settings]);

  useEffect(() => {
    async function runReorder() {
      try {
        const orderId: string = api?.orderId;
        if (!orderId) throw new Error("Order ID not found");

        const shopDomain = await fetchShopDomain();
        const excludeTrial = settings?.exclude_trial_pack === true;

        const result = await fetchReorderResult(
          orderId,
          shopDomain,
          excludeTrial
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
  }, []);

  const handleClose = () => api?.close?.();

  const handleProceed = () => {
    const targetUrl = settings?.external_reorder_link || redirectUrl;
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
  render(<ActionModal />, document.body);
};
