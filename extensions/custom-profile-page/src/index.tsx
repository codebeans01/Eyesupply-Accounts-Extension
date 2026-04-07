import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import './style.css';
import { ProfilePage } from './components/ProfilePage';
import { PrescriptionListPage } from './components/PrescriptionListPage';



function App() {
  const api = (globalThis as any).shopify;
  
  const [url, setUrl] = useState(() => api?.navigation?.currentEntry?.url || "");
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


  const currentUrl = url.toLowerCase();

  if (currentUrl.includes("view-prescription")) {
    return <PrescriptionListPage api={api} />;
  }

  const MainPage = ProfilePage;
  return <MainPage api={api} />;
}

export default () => {
  render(<App />, document.body);
};
