import '@shopify/ui-extensions/preact';
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import { fetchWithRetry, reorder, API_VERSION, APP_URL } from "./helpers";
import { SHOP_DOMAIN_QUERY } from "./graphql-query";

/**
 * ActionModal component for customer-account.order.action.render target.
 * Shows a popup if items are missing, otherwise redirects to cart.
 */
function ActionModal() {
  const [loading, setLoading] = useState(true);
  const [missingItems, setMissingItems] = useState<{ name: string; image?: string }[] | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const api = (globalThis as any).shopify;

  useEffect(() => {
    async function runReorder() {
      try {
        const orderId = api?.orderId;
        if (!orderId) throw new Error("Order ID not found");

        const sessionToken = await api?.sessionToken?.get();
        if (!sessionToken) throw new Error("Access denied");

        // Fetch shop domain
        const endpoint = `shopify://customer-account/api/${API_VERSION}/graphql.json`;
        const response = await fetchWithRetry(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: SHOP_DOMAIN_QUERY }),
        });

        const shopDomain = response.data?.data?.shop?.myshopifyDomain;
        if (!shopDomain) throw new Error("Shop domain error");

        // Call backend reorder API
        const { redirectUrl: url, missingItems: missing } = await reorder(orderId, sessionToken, shopDomain);
        
        if (missing && missing.length > 0) {
          setMissingItems(missing);
          if (url) setRedirectUrl(url);
          setLoading(false);
        } else if (url) {
          setRedirectUrl(url);
          setLoading(false);
          // Attempt automatic navigation
          if (api?.navigation?.navigate) {
            console.log("[ActionModal] Redirecting to:", url);
            api.navigation.navigate(url);
          }
        } else {
          throw new Error("No cart link generated");
        }

      } catch (err) {
        console.error("[ActionModal] Reorder error:", err);
        setError((err as Error).message || "Failed to process reorder");
        setLoading(false);
      }
    }

    runReorder();
  }, [api]);

  const handleClose = () => {
    api?.close();
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
          <s-button slot="primary-action" onClick={() => api?.navigation?.navigate?.(redirectUrl)}>
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

        <s-button slot="primary-action" onClick={() => redirectUrl ? api?.navigation?.navigate?.(redirectUrl) : handleClose()}>
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
