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

  const handleProceed = () => {
    if (redirectUrl) {
      if (api?.navigation?.navigate) {
        api.navigation.navigate(redirectUrl);
      } else {
        window.location.href = redirectUrl;
      }
      setTimeout(() => api?.close?.(), 5000);
    }
  };

  if (loading) {
    return (
      <s-customer-account-action heading="Reordering...">
        <s-stack gap="base" alignItems="center" padding="large">
          <s-spinner size="base" />
          <s-text>Checking product availability...</s-text>
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
    <s-customer-account-action heading="Products Unavailable">
      <s-stack gap="base" padding="large">
        <s-text tone="neutral">
          The following products from your previous order are no longer available and were skipped:
        </s-text>
        
        <s-stack gap="small">
          {missingItems?.map((item, i) => (
            <s-box key={i} padding="small" background="subdued" borderRadius="base" border="base">
              <s-stack direction="inline" gap="small" alignItems="center">
                {item.image ? (
                  <s-box inlineSize="40px" blockSize="40px" borderRadius="small" overflow="hidden">
                    <s-image src={item.image} alt={item.name} />
                  </s-box>
                ) : (
                  <s-icon type="alert-triangle" size="small" tone="neutral" />
                )}
                <s-text type="strong">{item.name}</s-text>
              </s-stack>
            </s-box>
          ))}
        </s-stack>

        <s-text>
          You can still find the other items in your cart.
        </s-text>

        <s-button slot="primary-action" onClick={() => {
          if (redirectUrl) {
            if (api?.navigation?.navigate) {
              api.navigation.navigate(redirectUrl);
            } else {
              window.location.href = redirectUrl;
            }
            setTimeout(() => handleClose(), 5000);
          } else {
            handleClose();
          }
        }}>
          {redirectUrl ? "Go to Cart" : "Got it"}
        </s-button>
        <s-button slot="secondary-action" onClick={handleClose}>Close</s-button>
      </s-stack>
    </s-customer-account-action>
  );
}

export default () => {
  render(<ActionModal />, document.body);
};
