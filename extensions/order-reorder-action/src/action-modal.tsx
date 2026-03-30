import '@shopify/ui-extensions/preact';
import { render, h } from "preact";
import { useState, useEffect } from "preact/hooks";
import { reorder, fetchShopDomain } from "./helpers";
import { MissingItem } from './reorder.helpers';
import { fetchReorderResult } from './reorder.service';

const SCustomerAccountAction = 's-customer-account-action' as any;
const SSection = 's-section' as any;
const SText = 's-text' as any;
const SButton = 's-button' as any;
const SStack = 's-stack' as any;

function ActionModal() {

  const api = (globalThis as any).shopify;
  const [loading, setLoading] = useState(true);
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState(api?.settings?.value ?? {});
  
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
      <SCustomerAccountAction heading="Reorder">
        <SSection>
          <SText>Checking product availability...</SText>
        </SSection>
      </SCustomerAccountAction>
    );
  }

  if (error) {
    return (
      <SCustomerAccountAction heading="Error">
        <SSection padding="base">
          <SText tone="critical">{error}</SText>
        </SSection>
        <SButton slot="primary-action" onClick={handleClose}>Close</SButton>
      </SCustomerAccountAction>
    );
  }

  if (redirectUrl && (!missingItems || missingItems.length === 0)) {
    return (
      <SCustomerAccountAction heading="Success">
        <SSection padding="base">
          <SText>All items are available and ready to reorder!</SText>
          <SText>Click below to go to your cart if you aren't redirected automatically.</SText>
        </SSection>
        <SButton slot="primary-action" onClick={() => {
          if (api?.navigation?.navigate) {
            api.navigation.navigate(redirectUrl);
          } else {
            window.location.href = redirectUrl;
          }
          setTimeout(() => handleClose(), 5000);
        }}>
          Go to Cart
        </SButton>
        <SButton slot="secondary-actions" onClick={handleClose}>
          Cancel
        </SButton>
      </SCustomerAccountAction>
    );
  }

  return (
    <s-customer-account-action heading="Reordering from an older order?">
      <s-box padding="none" paddingBlockStart="base">
        <s-stack direction="block" gap="base" paddingBlockEnd="base">
          <s-text>
            Because we’ve upgraded our website, older orders can’t be reordered directly through the new system. Please add your items to cart manually this time. Going forward, reordering will work smoothly from your account.
          </s-text>
          <s-box padding-block-start="base">
            <s-text>
              Need help?{" "}
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
