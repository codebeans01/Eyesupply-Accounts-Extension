import { render } from "preact";
import { useState } from "preact/hooks";
import { reorder } from "./loadCustomerData";
import { fetchWithRetry, API_VERSION } from "./helpers";
import { SHOP_DOMAIN_QUERY } from "./graphql-query";

/**
 * Optimized ReorderButton component for Shopify Customer Account Extensions.
 * Handles reorder logic with robust error patterns and standardized navigation.
 */
function ReorderButton() {
  const [loading, setLoading] = useState(false);
  
  // Cast shopify to any for easier access while maintaining some structure
  const api = shopify as any;

  const handleReorder = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const orderId = api.orderId;
      if (!orderId) throw new Error("Order ID not found");

      const sessionToken = await api.sessionToken.get();
      
      // Fetch shop domain using robust fetchWithRetry helper
      const endpoint = `shopify://customer-account/api/${API_VERSION}/graphql.json`;
      const response = await fetchWithRetry(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: SHOP_DOMAIN_QUERY }),
      });

      const shopDomain = response.data?.data?.shop?.myshopifyDomain;
      if (!shopDomain) throw new Error("Shop domain not found");

      // Call reorder helper
      const { redirectUrl } = await reorder(orderId, sessionToken, shopDomain);
      
      if (!redirectUrl) throw new Error("Failed to generate reorder link");

      // Standardized navigation logic
      const nav = (typeof navigation !== "undefined" ? navigation : api.navigation);
      
      if (nav?.navigate) {
        nav.navigate(redirectUrl);
      } else {
        console.error("Navigation API not found");
        api.toast.show("Could not redirect to cart");
      }

    } catch (err) {
      const message = (err as Error).message || "Reorder failed";
      console.error("[ReorderButton] Error:", err);
      api.toast.show(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <s-button onClick={handleReorder} loading={loading}>
      Reorder
    </s-button>
  );
}

// Extension entry point
export default () => {
  render(<ReorderButton />, document.body);
};
