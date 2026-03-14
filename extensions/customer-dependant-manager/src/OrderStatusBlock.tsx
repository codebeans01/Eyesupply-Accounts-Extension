import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';

// Registry for the extension targets defined in shopify.extension.toml
// The extension uses the module's default export to render the UI.
// The 'shopify' object is available globally within the extension environment.
export default async () => {
  render(<Extension />, document.body);
};



function Extension() {
  // @ts-expect-error shopify is global
  const api = shopify;
  if (!api) {
    console.error("Extension rendered without shopify global");
    return null;
  }
  const [dependants, setDependants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Use a hardcoded URL for now as placeholder, similar to ProfileBlock
  const APP_URL = "https://choices-linux-senior-oct.trycloudflare.com";


  useEffect(() => {
    async function fetchOrderDependants() {
      try {
        // api.order is a signal in Customer Account UI extensions
        const order = api.order?.current;
        const orderId = order?.id;
        const shop = api.shop?.myshopifyDomain;
        
        if (!orderId || !shop) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${APP_URL}/api/dependant/me?shop=${shop}&order_id=${orderId}&_ts=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.dependants)) {
            setDependants(data.dependants);
          }
        }
      } catch (err) {
        console.error('Failed to fetch order dependants:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrderDependants();
  }, [api, APP_URL]);

  if (loading) {
    return (
      <s-stack direction="block" gap="base">
        <s-spinner size="small" />
      </s-stack>
    );
  }

  if (dependants.length === 0) return null;

  return (
    <s-section heading="Order Dependants">
      <s-stack direction="block" gap="base">
        <s-stack direction="block" gap="small">
          {dependants.map((d, i) => (
            <s-stack key={i} direction="inline" gap="small">
               <s-text type="strong">{d.first_name} {d.last_name}</s-text>
               {d.relation && <s-text color="subdued">({d.relation})</s-text>}
            </s-stack>
          ))}
        </s-stack>
      </s-stack>
    </s-section>
  );
}

// End of extension
