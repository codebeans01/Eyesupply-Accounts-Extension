import '@shopify/ui-extensions/preact';
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import { reorder, fetchShopDomain } from "./helpers";
import { MissingItem } from './reorder.helpers';
import { fetchReorderResult } from './reorder.service';

function ActionModal() {

  const [loading, setLoading] = useState(true);
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const api = (globalThis as any).shopify;

  useEffect(() => {
    async function runReorder() {
      try {
        const orderId: string = api?.orderId;
        if (!orderId) throw new Error("Order ID not found");

        const shopDomain = await fetchShopDomain();

        const excludeTrial = api?.settings?.current?.exclude_trial_pack === true;

        const { redirectUrl: url, missingItems: missing } = await fetchReorderResult(
          orderId,
          shopDomain,
          excludeTrial
        );

        setRedirectUrl(url);
        setMissingItems(missing);
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

  const externalLink = api?.settings?.current?.external_reorder_link;

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
      <s-customer-account-action heading="Reordering...">
        <s-stack gap="base" alignItems="center" padding="large">
          <s-spinner size="base" />
          <s-text tone="neutral">Checking product availability...</s-text>
        </s-stack>
      </s-customer-account-action>
    );
  }

  if (error) {
    return (
      <s-customer-account-action heading="Reorder Error">
        <s-stack gap="base" padding="large">
          <s-banner tone="critical" heading="Error">
            {error}
          </s-banner>
          <s-button slot="primary-action" onClick={handleClose}>Close</s-button>
        </s-stack>
      </s-customer-account-action>
    );
  }

  if (redirectUrl && (!missingItems || missingItems.length === 0)) {
    return (
      <s-customer-account-action heading="Reorder Ready">
        <s-stack gap="base" padding="large">
          <s-banner tone="success" heading="Success">
            All items are available and ready to reorder!
          </s-banner>
          <s-text>Click below to go to your cart if you aren't redirected automatically.</s-text>
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
          <s-button slot="secondary-action" onClick={handleClose}>
            Cancel
          </s-button>
        </s-stack>
      </s-customer-account-action>
    );
  }

  return (
    <s-customer-account-action heading="Reordering from an older order?">
      <s-stack gap="base" padding="large">
        <s-text tone="neutral">
          Because we’ve upgraded our website, older orders can’t be reordered directly through the new system. 
          Please add your items to cart manually this time. Going forward, reordering will work smoothly from your account.
        </s-text>
        
        <s-stack direction="inline" gap="base">
          <s-text tone="neutral">Need help?</s-text>
          <s-clickable onClick={handleProceed}>
            <s-text tone="info">Click here</s-text>
          </s-clickable>
          <s-text tone="neutral">and we’ll load your previous order into cart for you.</s-text>
        </s-stack>
        
      </s-stack>
    </s-customer-account-action>
  );
}

export default () => {
  render(<ActionModal />, document.body);
};
