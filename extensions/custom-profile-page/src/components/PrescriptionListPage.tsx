import { h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import '@shopify/ui-extensions/preact';
import { fetchAdditionalPrescriptions, loadPrescriptions } from "../loadCustomerData";
import { type Prescription, type PageInfo } from "../interface";
import { getNumericId } from "../helpers";

interface PrescriptionListPageProps {
  api: any;
  shopDomain: string;
}

const DocumentLink = ({ url }: { url: string }) => {
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1] || "";
  const fileName = lastPart.split('?')[0] || "File";
  const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
  const isPDF = fileName.toLowerCase().endsWith('.pdf');
  
  return (
    <s-stack direction="row" gap="extra-small" alignItems="center">
      {isImage ? (
        <s-box inlineSize="24px" blockSize="24px" borderRadius="small" overflow="hidden">
           <s-image src={url} alt={fileName} />
        </s-box>
      ) : (
        <s-icon type={isPDF ? "file" : "note"} size="small" tone="neutral" />
      )}
      <s-link href={url} target="_blank">
        <s-text size="small" tone="info">
          {fileName.length > 25 ? fileName.substring(0, 22) + "..." : fileName}
        </s-text>
      </s-link>
    </s-stack>
  );
};

export function PrescriptionListPage({ api, shopDomain }: PrescriptionListPageProps) {
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchingMore, setFetchingMore] = useState(false);

  const sortPrescriptions = (items: Prescription[]) => {
    return [...items].sort((a, b) => {
      const dateA = new Date(a.updatedAt || 0).getTime();
      const dateB = new Date(b.updatedAt || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      
      const getSuffix = (id: string) => {
        const parts = id.split('-');
        return parseInt(parts[parts.length - 1], 10) || 0;
      };
      return getSuffix(b.id) - getSuffix(a.id);
    });
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const data = await loadPrescriptions();
        if (data.prescriptions) {
          setPrescriptions(sortPrescriptions(data.prescriptions));
          setPageInfo(data.prescriptionPageInfo || null);
        }
      } catch (err) {
        console.error("Failed to load prescriptions", err);
        setError("Failed to load prescriptions.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleFetchMore = async () => {
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor || fetchingMore) return;
    setFetchingMore(true);
    try {
      const { prescriptions: newItems, pageInfo: newPageInfo } = await fetchAdditionalPrescriptions(pageInfo.endCursor);
      setPrescriptions(prev => sortPrescriptions([...prev, ...newItems]));
      setPageInfo(newPageInfo);
    } catch (err) {
      api.toast.show("Error loading more");
    } finally {
      setFetchingMore(false);
    }
  };

  const handleBack = () => {
    if (api.navigation?.navigate) {
      api.navigation.navigate('..');
    }
  };

  if (loading) {
    return (
      <s-page heading="My Prescriptions">
        <s-box padding="base">
          <s-stack gap="base" alignItems="center">
            <s-spinner accessibilityLabel="Loading" />
            <s-text>Loading...</s-text>
          </s-stack>
        </s-box>
      </s-page>
    );
  }

  if (error) {
    return (
      <s-page heading="My Prescriptions">
        <s-banner tone="critical" heading="Error">
          <s-text>{error}</s-text>
        </s-banner>
        <s-button onClick={handleBack} variant="secondary">Back</s-button>
      </s-page>
    );
  }

  const renderPrescriptionRow = (p: Prescription) => {
    
    const numericId = getNumericId(p.id);
    const isActive = p.status?.toLowerCase() === "active" || p.status?.toLowerCase() === "completed";
    
    return (
      <Fragment key={p.id}>
        <s-grid gridTemplateColumns="1fr 1fr 1fr 1.5fr 1.5fr 1.5fr" gap="base" alignItems="center">
          <s-text type="strong">{`#${numericId}`}</s-text>
          <s-text>{p.expiry_date || "No Expiry"}</s-text>
          <s-badge tone={isActive ? "success" : "neutral"}>{p.status || "Active"}</s-badge>
          <s-stack gap="extra-small">
            {(() => {
              const allUrls = [
                ...(p.image_urls || []),
                ...(p.image_url ? [p.image_url] : [])
              ].filter(Boolean);
              
              if (allUrls.length > 0) {
                return allUrls.map((url, i) => <DocumentLink key={i} url={url} />);
              }
              return <s-text tone="neutral">No documents</s-text>;
            })()}
          </s-stack>
          <s-text>{p.customer_email || "N/A"}</s-text>
          <s-text>{p.handle || "N/A"}</s-text>
        </s-grid>
        <s-divider />
      </Fragment>
    );
  };

  return (
    <s-page heading="My Prescriptions">
      <s-stack gap="base">
        <s-box padding="base" background="base" borderRadius="base" border="base">
          <s-stack gap="base">
            <s-grid gridTemplateColumns="1fr 1fr 1fr 1.5fr 1.5fr 1.5fr" gap="base" alignItems="center">
              <s-text type="strong">ID</s-text>
              <s-text type="strong">Expiry Date</s-text>
              <s-text type="strong">Status</s-text>
              <s-text type="strong">Documents</s-text>
              <s-text type="strong">Email</s-text>
              <s-text type="strong">Handle</s-text>
            </s-grid>
            <s-divider />
            {prescriptions.length > 0 ? (
              prescriptions.map(renderPrescriptionRow)
            ) : (
              <s-box padding="base">
                <s-text tone="neutral">No prescriptions found.</s-text>
              </s-box>
            )}
          </s-stack>
        </s-box>

        {pageInfo?.hasNextPage && (
          <s-button onClick={handleFetchMore} loading={fetchingMore} variant="secondary">
            Load More
          </s-button>
        )}

        <s-button onClick={handleBack} variant="secondary">Back to Dashboard</s-button>
      </s-stack>
    </s-page>
  );
}
