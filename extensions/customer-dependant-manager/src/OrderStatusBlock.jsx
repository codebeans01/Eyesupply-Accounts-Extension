/**
 * OrderStatusBlock.jsx — Customer Account UI Extension
 * Target: customer-account.order-status.block.render
 */
import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";

// Use the direct App URL to bypass Password-protected App Proxy redirects.
// If your tunnel URL changes, please update this constant!
const APP_URL = "https://convenience-pole-haven-prime.trycloudflare.com";

const Extension = () => {
  const [dependants, setDependants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Extension Settings
  const settings = (/** @type {any} */ (shopify)).settings?.current?.value || {};

  const directUrl = `${APP_URL}/api/dependant/me`;

  useEffect(() => {
    async function init() {
      try {
        const token = await shopify.sessionToken.get();
        const customerId = shopify.authenticatedAccount?.customer?.current?.id;

        const res = await fetch(directUrl, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-customer-id": customerId || ""
          },
        });
        if (res.ok) {
          setDependants(await res.json());
        }
      } catch (e) {
        console.error("Initialization failed", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  return (
    <s-section heading="Order Dependants">
      <s-stack gap="base">
        {loading ? (
          <s-spinner />
        ) : (
          <s-stack gap="small-100">
            {dependants.length === 0 ? (
              <s-text color="subdued">No dependants found.</s-text>
            ) : (
              dependants.map((d) => (
                <s-box
                  key={d.id}
                  padding="base"
                  background="subdued"
                  borderRadius="base"
                >
                  <s-text>• {d.full_name}</s-text>
                </s-box>
              ))
            )}
          </s-stack>
        )}
      </s-stack>
    </s-section>
  );
};

export default async () => {
  render(<Extension />, document.body);
};