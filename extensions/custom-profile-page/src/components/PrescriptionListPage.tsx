import { useState, useEffect } from "preact/hooks";
import '@shopify/ui-extensions/preact';
import { fetchAdditionalPrescriptions, loadPrescriptions } from "../loadCustomerData";
import { type Prescription, type PageInfo, type ApiProps } from "../interface";
import { getNumericId } from "../helpers";

const MOBILE_ONLY_LABEL = "@container (inline-size > 400px) none, auto";
const DESKTOP_ONLY_HEADER = "@container (inline-size > 400px) auto, none";
const RESPONSIVE_GRID = "@container (inline-size > 400px) 1fr 1fr 1.2fr 1.8fr, 1fr";
const RESPONSIVE_PADDING = "@container (inline-size > 400px) none, base";

const DocumentLink = ({ url }: { url: string }) => {
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1] || "";
  const fileName = lastPart.split('?')[0] || "File";
  const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
  const isPDF = fileName.toLowerCase().endsWith('.pdf');
  
  return (
    <s-stack direction="inline" gap="small-500" alignItems="center">
      {isImage ? (
        <s-box inlineSize="24px" blockSize="24px" borderRadius="small" overflow="hidden">
           <s-image src={url} alt={fileName} />
        </s-box>
      ) : (
        <s-icon type="clipboard" size="small" tone="neutral" />
      )}
      <s-link href={url} target="_blank">
        <s-text tone="info">
          {fileName.length > 25 ? fileName.substring(0, 22) + "..." : fileName}
        </s-text>
      </s-link>
    </s-stack>
  );
};

export function PrescriptionListPage({ api }: ApiProps) {
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
        const data = await loadPrescriptions(api);
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
      const { prescriptions: newItems, pageInfo: newPageInfo } = await fetchAdditionalPrescriptions(api, pageInfo.endCursor);
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
        <s-stack gap="base">
          <s-banner tone="critical" heading="Error">
            <s-text>{error}</s-text>
          </s-banner>
          <s-button onClick={handleBack} variant="secondary">Back</s-button>
        </s-stack>
      </s-page>
    );
  }

  const renderPrescriptionRow = (p: Prescription) => {
    
    const numericId = getNumericId(p.id);
    const isActive = p.status?.toLowerCase() === "active" || p.status?.toLowerCase() === "completed";
    
    return (
      <>
        <s-grid 
          gridTemplateColumns={RESPONSIVE_GRID} 
          gap="base" 
          alignItems="center"
          paddingBlock={RESPONSIVE_PADDING}
        >
          {/* ID Column */}
          <s-stack gap="small-200">
             <s-box display={MOBILE_ONLY_LABEL}>
               <s-text type="strong" tone="neutral">ID</s-text>
             </s-box>
             <s-text type="strong">{`#${numericId}`}</s-text>
          </s-stack>

          {/* Expiry Date Column */}
          <s-stack gap="small-200">
             <s-box display={MOBILE_ONLY_LABEL}>
               <s-text type="strong" tone="neutral">Expiry Date</s-text>
             </s-box>
             <s-text>{p.expiry_date || ""}</s-text>
          </s-stack>

          {/* Status Column */}
          <s-stack gap="small-200">
             <s-box display={MOBILE_ONLY_LABEL}>
                <s-text type="strong" tone="neutral">Status</s-text>
             </s-box>
             {p.status ? (
               <s-badge tone={isActive ? "neutral" : "neutral"}>{p.status}</s-badge>
             ) : (
               <s-text> </s-text>
             )}
          </s-stack>

          {/* Documents Column */}
          <s-stack gap="small-200">
             <s-box display={MOBILE_ONLY_LABEL}>
                <s-text type="strong" tone="neutral">Documents</s-text>
             </s-box>
             <s-stack gap="small-500">
                {(() => {
                  const allUrls = Array.from(new Set([
                    ...(p.image_urls || []),
                    ...(p.image_url ? [p.image_url] : [])
                  ])).filter(Boolean);
                  
                  if (allUrls.length > 0) {
                    return allUrls.map((url, i) => <DocumentLink key={i} url={url} />);
                  }
                  return <s-text> </s-text>;
                })()}
             </s-stack>
          </s-stack>
        
        </s-grid>
        <s-divider />
      </>
    );
  };

  return (
    <s-page heading="My Prescriptions">
      <s-stack gap="base">
        <s-query-container>
          <s-box padding="base" background="base" borderRadius="base" border="base">
            <s-stack gap="base">
            <s-grid 
              gridTemplateColumns="1fr 1fr 1.2fr 1.8fr" 
              gap="base" 
              alignItems="center"
              display={DESKTOP_ONLY_HEADER}
            >
              <s-text type="strong">ID</s-text>
              <s-text type="strong">Expiry Date</s-text>
              <s-text type="strong">Status</s-text>
              <s-text type="strong">Documents</s-text>
            </s-grid>
            <s-box display={DESKTOP_ONLY_HEADER}>
              <s-divider />
            </s-box>
            {prescriptions.length > 0 ? (
              prescriptions.map(renderPrescriptionRow)
            ) : (
              <s-box padding="base">
                <s-text tone="neutral">No prescriptions found.</s-text>
              </s-box>
            )}
          </s-stack>
        </s-box>
      </s-query-container>

      {pageInfo?.hasNextPage && (
          <s-button onClick={handleFetchMore} loading={fetchingMore} variant="secondary">
            Load More
          </s-button>
        )}

        <s-button onClick={handleBack} variant="secondary">Back</s-button>
      </s-stack>
    </s-page>
  );
}
