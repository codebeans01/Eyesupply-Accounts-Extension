import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useEffect, useState } from "preact/hooks";

interface Dependant {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
}

// Use the direct App URL to bypass Password-protected App Proxy redirects.
const APP_URL = "https://guardian-beatles-refined-hobby.trycloudflare.com";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  // @ts-expect-error shopify is global
  const api = shopify;
  const [customer, setCustomer] = useState<any>(null);
  const [dependants, setDependants] = useState<Dependant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dependantsLoading, setDependantsLoading] = useState(true);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Settings
  const settings = api.settings?.current || {};
  const paginationEnabled = settings.cb_pagination_enabled !== false;
  const prevLabel = settings.cb_pagination_prev_text || "Previous";
  const nextLabel = settings.cb_pagination_next_text || "Next";

  const directUrl = `${APP_URL}/api/dependant/me`;

  useEffect(() => {
    async function fetchProfile() {
      try {
        const customerData = api.authenticatedAccount?.customer?.current;
        if (customerData) {
          setCustomer(customerData);
        } else {
          const unsubscribe = api.authenticatedAccount?.customer?.subscribe((newCustomer: any) => {
            setCustomer(newCustomer);
            setLoading(false);
          });
          return unsubscribe;
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    }

    async function fetchDependants() {
      try {
        const token = await api.sessionToken.get();
        const customerId = api.authenticatedAccount?.customer?.current?.id;
        
        const res = await fetch(`${directUrl}?_ts=${Date.now()}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-customer-id": customerId || ""
          },
        });
        if (res.ok) {
          const data = await res.json();
          setDependants(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Error fetching dependants:", e);
      } finally {
        setDependantsLoading(false);
      }
    }

    fetchProfile();
    fetchDependants();
  }, [api, directUrl]);

  // Pagination Logic
  const totalPages = Math.ceil(dependants.length / itemsPerPage);
  const currentItems = paginationEnabled 
    ? dependants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : dependants;

  return (
    <s-page heading="My Custom Account">
      <s-stack gap="base">
        {loading ? (
          <s-spinner />
        ) : customer ? (
          <s-section heading="Profile Information">
            <s-stack gap="small" padding="base">
              <s-grid gridTemplateColumns="120px 1fr" gap="small">
                <s-text type="strong">First Name:</s-text>
                <s-text>{customer.firstName || "N/A"}</s-text>
                
                <s-text type="strong">Last Name:</s-text>
                <s-text>{customer.lastName || "N/A"}</s-text>
                
                <s-text type="strong">Email:</s-text>
                <s-text>{customer.email || "N/A"}</s-text>
              </s-grid>
            </s-stack>
          </s-section>
        ) : (
          <s-banner tone="warning">
            Could not load profile data.
          </s-banner>
        )}

        <s-section heading="My Dependants">
          {dependantsLoading ? (
            <s-spinner />
          ) : dependants.length === 0 ? (
            <s-box padding="base">
              <s-text color="subdued">No dependants found.</s-text>
            </s-box>
          ) : (
            <s-stack gap="none">
              <s-grid gridTemplateColumns="1fr 1fr" gap="base" padding="base" background="subdued" borderWidth="base none none none" borderRadius="base base none none">
                <s-text type="strong">First Name</s-text>
                <s-text type="strong">Last Name</s-text>
              </s-grid>
              {currentItems.map((d, index) => (
                <s-grid 
                  key={d.id} 
                  gridTemplateColumns="1fr 1fr" 
                  gap="base" 
                  padding="base" 
                  borderWidth="base none none none"
                  background={index % 2 === 0 ? "transparent" : "subdued"}
                >
                  <s-text>{d.first_name}</s-text>
                  <s-text>{d.last_name}</s-text>
                </s-grid>
              ))}

              {paginationEnabled && totalPages > 1 && (
                <s-box padding="base" borderWidth="base none none none">
                  <s-grid gridTemplateColumns="1fr auto 1fr" gap="base" alignItems="center">
                    <s-button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      {prevLabel}
                    </s-button>
                    <s-text>
                      Page {currentPage} of {totalPages}
                    </s-text>
                    <s-box inlineSize="100%">
                      <s-grid justifyContent="end">
                        <s-button
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(currentPage + 1)}
                        >
                          {nextLabel}
                        </s-button>
                      </s-grid>
                    </s-box>
                  </s-grid>
                </s-box>
              )}
            </s-stack>
          )}
        </s-section>
        
        <s-section heading="Welcome">
          <s-box padding="base">
            <s-text>
              Welcome to your custom account dashboard! Here you can see your basic profile and managed dependants.
            </s-text>
          </s-box>
        </s-section>
      </s-stack>
    </s-page>
  );
}
