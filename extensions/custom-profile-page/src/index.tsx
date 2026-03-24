import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';

import { ProfilePage } from './components/ProfilePage';
import { PrescriptionListPage } from './components/PrescriptionListPage';
import { API_VERSION, fetchWithRetry } from './helpers';


function App() {
  const api = (globalThis as any).shopify;
  
  const [url, setUrl] = useState(() => api?.navigation?.currentEntry?.url || "");
  const [shopDomain, setShopDomain] = useState("");
  const urlRef = useRef(url);

  // Sync ref with state
  urlRef.current = url;

  // Listen navigation changes
  useEffect(() => {
    const navigation = api?.navigation;
    if (!navigation) return;

    const handleNavigate = (event: any) => {
      const newUrl = event?.destination?.url || "";
      console.log('[Navigate Event]', newUrl);
      
      if (newUrl && newUrl !== urlRef.current) {
        setUrl(newUrl);
      }
    };

    const handleEntryChange = (event: any) => {
      const newUrl = event.from?.url || navigation.currentEntry?.url || "";
      if (newUrl && newUrl !== urlRef.current) {
        setUrl(newUrl);
      }
    };

    navigation.addEventListener('navigate', handleNavigate);
    navigation.addEventListener('currententrychange', handleEntryChange);

    return () => {
      navigation.removeEventListener('navigate', handleNavigate);
      navigation.removeEventListener('currententrychange', handleEntryChange);
    };
  }, []);


  // Fetch shop domain
  useEffect(() => {
    async function getShop() {
      try {
        const result = await fetchWithRetry(
          `shopify://customer-account/api/${API_VERSION}/graphql.json`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: "query { shop { myshopifyDomain } }",
            }),
          }
        );

        const json = result?.data;

        if (json?.data?.shop?.myshopifyDomain) {
          setShopDomain(json.data.shop.myshopifyDomain);
        }
      } catch (err) {
        console.error("Failed to fetch shop domain:", err);
      }
    }

    getShop();
  }, []);

  const currentUrl = url.toLowerCase();

  if (currentUrl.includes("view-prescription")) {
    return <PrescriptionListPage api={api} shopDomain={shopDomain} />;
  }

  const MainPage = ProfilePage;
  return <MainPage api={api} shopDomain={shopDomain} />;
}

export default () => {
  render(<App />, document.body);
};
