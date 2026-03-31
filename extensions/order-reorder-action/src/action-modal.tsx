import '@shopify/ui-extensions/preact';
import { render, h } from "preact";
import { useState, useEffect } from "preact/hooks";
import { reorder, fetchShopDomain } from "./helpers";
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
  
  const translate = api.i18n.translate;
  
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

        const { redirectUrl: url, missingItems: missing, orderName } = await fetchReorderResult(
          orderId,
          shopDomain,
          excludeTrial
        );

        setRedirectUrl(url);
        setMissingItems(missing);
        setOlderOrderName(orderName ?? null);
        setLoading(false);

        if (!missing.length && url) {
          if (api?.navigation?.navigate) {
            api.navigation.navigate(url);
          } else {
            window.location.href = url;
          }
          
          setTimeout(() => api?.close?.(), 5000);
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

  const externalLink = settings?.external_reorder_link;

  const handleProceed = () => {
    const targetUrl = externalLink || redirectUrl;
    if (targetUrl) {
      if (api?.navigation?.navigate) {
        api.navigation.navigate(targetUrl);
      } else {
        window.location.href = targetUrl;
      }
      setTimeout(() => api?.close?.(), 5000);
    }
  };

  if (loading) {
    return (
      <s-customer-account-action heading="Reorder">
        <s-section>
          <s-text>Checking product availability...</s-text>
        </s-section>
      </s-customer-account-action>
    );
  }

  if (error) {
    return (
      <s-customer-account-action heading="Error">
        <s-section padding="base">
          <s-text tone="critical">{error}</s-text>
        </s-section>
        <s-button slot="primary-action" onClick={handleClose}>Close</s-button>
      </s-customer-account-action>
    );
  }

  if (redirectUrl && (!missingItems || missingItems.length === 0)) {
    return (
      <s-customer-account-action heading="Success">
        <s-section padding="base">
          <s-text>All items are available and ready to reorder!</s-text>
          <s-text>Click below to go to your cart if you aren't redirected automatically.</s-text>
        </s-section>
        <s-button slot="primary-action" onClick={() => {
          if (api?.navigation?.navigate) {
            api.navigation.navigate(redirectUrl);
          } else {
            window.location.href = redirectUrl;
          }
          setTimeout(() => handleClose(), 5000);
        }}>
          Go to Cart
        </s-button>
        <s-button slot="secondary-actions" onClick={handleClose}>
          Cancel
        </s-button>
      </s-customer-account-action>
    );
  }

  return (
    <s-customer-account-action heading="Reordering from an older order?">
      <s-box padding="none" padding-block-start="base">
        <s-stack direction="block" gap="base" padding-block-end="base">
          <s-text>
            Because we’ve upgraded our website, older orders can’t be reordered directly through the new system. Please add your items to cart manually this time. Going forward, reordering will work smoothly from your account.
          </s-text>
          <s-box padding-block-start="base">
            <s-text>
              Need Help For your Order{" "}
              <s-text id="order-id" type="strong">{olderOrderName}</s-text>
              {" "}
              <s-link onClick={handleProceed}>
                Click here
              </s-link>
              {" "}and we'll load your previous order into cart for you.
            </s-text>
          </s-box>
        </s-stack>
      </s-box>
    </s-customer-account-action>
  );
}

export default () => {
  render(<ActionModal />, document.body);
};
