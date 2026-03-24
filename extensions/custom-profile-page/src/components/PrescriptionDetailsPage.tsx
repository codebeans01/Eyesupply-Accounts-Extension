import { Fragment, h } from "preact";
import { useState, useEffect } from "preact/hooks";
import '@shopify/ui-extensions/preact';
import { APP_URL } from "../helpers";
import { type Prescription } from "../interface";

interface PrescriptionDetailsPageProps {
  api: any;
  shopDomain: string;
  id?: string;
}

export function PrescriptionDetailsPage({ api, shopDomain, id }: PrescriptionDetailsPageProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Prescription | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleBack = () => {
    if (api?.navigation?.canGoBack) {
      api.navigation.back();
    } else {
      api.navigation.navigate("extension:/");
    }
  };

  useEffect(() => {
    async function fetchPrescription() {
      if (!api || !shopDomain) return;
      setLoading(true);
      setLoadError(null);
      try {
        const sessionToken = await api.sessionToken.get();
        
        const response = await fetch(`${APP_URL}/api/prescription?shop=${shopDomain}${id ? `&id=${id}` : ''}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${sessionToken}`,
            "x-shop-domain": shopDomain,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch prescription data");
        }

        const json = await response.json();
        console.log("Prescription API response:", json);
        setData(json.prescription);
      } catch (err: any) {
        console.error("Error fetching prescription:", err);
        setLoadError(err.message || "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchPrescription();
  }, [api, shopDomain, id]);

  if (loading) {
    return (
      <s-page heading="Prescription Details">
        <s-box padding="base" background="base" borderRadius="base">
            <s-stack gap="base" alignItems="center">
                <s-spinner accessibilityLabel="Loading prescription" />
                <s-text>Loading your prescription details...</s-text>
            </s-stack>
        </s-box>
      </s-page>
    );
  }

  if (loadError) {
    return (
      <s-page heading="Prescription Details">
        <s-banner tone="critical">
          <s-text>{loadError}</s-text>
        </s-banner>
      </s-page>
    );
  }

  if (!data) {
    return (
      <s-page heading="Prescription Details">
        <s-box padding="base" background="base" borderRadius="base">
          <s-stack gap="base">
            <s-text>No prescription data found for your account.</s-text>
            <s-button onClick={handleBack} variant="secondary">Back to Dashboard</s-button>
          </s-stack>
        </s-box>
      </s-page>
    );
  }

  const isPdf = data.image_url?.toLowerCase().endsWith('.pdf');
  let statusTone: 'auto' | 'critical' | 'neutral' = 'neutral';
  if (data.status === 'Complete' || data.status === 'Completed') {
    statusTone = 'auto';
  } else if (data.status === 'Failed') {
    statusTone = 'critical';
  }

  return (
    <s-page heading="Prescription Details">
      <s-stack gap="base">
        <s-box padding="base" background="base" borderRadius="base" border="base">
          <s-stack gap="large">
            <s-stack gap="base">
              <s-grid gridTemplateColumns="1fr auto" alignItems="center">
                <s-stack gap="small-100">
                    <s-heading>Last Prescription Entry</s-heading>
                    <s-text tone="neutral">Here are the details from your most recent prescription upload.</s-text>
                </s-stack>
                <s-badge tone={statusTone}>{data?.status || "Under Review"}</s-badge>
              </s-grid>
            </s-stack>

            <s-divider />

            {data && (data.status === 'Completed' || data.status === 'Complete') && (
                <s-banner tone="info" heading="Prescription Verified">
                    Your prescription has been successfully verified. You can now use it for your orders.
                </s-banner>
            )}

            <s-grid gridTemplateColumns="repeat(auto-fit, minmax(280px, 1fr))" gap="large">
                <s-stack gap="base">
                    <s-text type="strong">Prescription File</s-text>
                    {data?.image_url ? (
                        <s-box border="base" borderRadius="base" padding="base" background="subdued" inlineSize="auto">
                            <s-stack gap="base" alignItems="center">
                                {isPdf ? (
                                    <s-stack gap="base" alignItems="center">
                                         <s-box padding="large" background="base" borderRadius="base" border="base">
                                            <s-icon type="note" size="large" tone="neutral" />
                                         </s-box>
                                         <s-text type="strong">PDF Document</s-text>
                                    </s-stack>
                                ) : (
                                    <s-image src={data.image_url} alt="Prescription" inlineSize="fill" borderRadius="base" />
                                )}
                                
                                <s-button href={data.image_url} target="_blank" variant="secondary">
                                    {isPdf ? "View / Download PDF" : "View Full Image"}
                                </s-button>
                            </s-stack>
                        </s-box>
                    ) : (
                        <s-text tone="neutral">No file provided</s-text>
                    )}
                </s-stack>

                <s-stack gap="large">
                    <s-box padding="base" background="subdued" borderRadius="base">
                        <s-stack gap="base">
                            <s-grid gridTemplateColumns="auto 1fr" gap="base" alignItems="center">
                                <s-icon type="calendar" size="small" tone="neutral" />
                                <s-text type="strong">Expiry Date</s-text>
                            </s-grid>
                            <s-text>{data?.expiry_date || "Not set"}</s-text>
                        </s-stack>
                    </s-box>

                    <s-box padding="base" background="subdued" borderRadius="base">
                        <s-stack gap="base">
                            <s-grid gridTemplateColumns="auto 1fr" gap="base" alignItems="center">
                                <s-icon type="info" size="small" tone="neutral" />
                                <s-text type="strong">Status Information</s-text>
                            </s-grid>
                            <s-text>
                                {data?.status === 'Completed' || data?.status === 'Complete' 
                                    ? "Your prescription has been verified and is ready for use."
                                    : "Our team is currently reviewing your uploaded prescription."}
                            </s-text>
                        </s-stack>
                    </s-box>
                </s-stack>
            </s-grid>
          </s-stack>
        </s-box>
        
        <s-box>
            <s-button onClick={handleBack} variant="secondary">
              <s-stack direction="inline" gap="small-100" alignItems="center">
                 <s-icon type="chevron-left" size="small" />
                 <s-text>Back to Dashboard</s-text>
              </s-stack> 
            </s-button>
        </s-box>
      </s-stack>
    </s-page>
  );  
}