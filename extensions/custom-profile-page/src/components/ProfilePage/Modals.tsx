/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment } from "preact";
import { 
  DISPLAY_768_GRID,
  DISPLAY_768_NONE_GRID,
  LAYOUT_768_4COL
} from "../../constants";
import { type Order, type CustomerSummary } from "../../interface";
import { getNumericId } from "../../helpers";

interface ModalsProps {
  ongoingOrders: Order[];
  customStatuses: Record<string, string>;
  reorderLoadingId: string | null;
  onReorder: (orderId: string, orderName: string, modalId: string) => void;
  api: any;
  selectedOrder: Order | null;
  lineItemsCount: number;
  cbSearchEnabled: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  showTopReorder: boolean;
  showBottomReorder: boolean;
  reorderButtonPosition: string;
  allReviewProducts: any[];
  storefrontBase: string;
  reviewTarget: string;
  isAllOrdersModalVisible: boolean;
  isLineItemsModalVisible: boolean;
  customer: CustomerSummary | null;
}

export function Modals({
  ongoingOrders,
  customStatuses,
  reorderLoadingId,
  onReorder,
  api,
  selectedOrder,
  lineItemsCount,
  cbSearchEnabled,
  searchQuery,
  setSearchQuery,
  showTopReorder,
  showBottomReorder,
  reorderButtonPosition,
  allReviewProducts,
  storefrontBase,
  reviewTarget,
  isAllOrdersModalVisible,
  isLineItemsModalVisible,
  customer,
}: ModalsProps) {
  return (
    <Fragment>
      {isLineItemsModalVisible && (
      <s-modal id="order-line-items-modal" heading={lineItemsCount + " items"} size="max">
        <s-query-container>
          <s-stack gap="base">
            {cbSearchEnabled && (
              <s-text-field
                label="Search"
                icon="search"
                value={searchQuery}
                onInput={(e: any) => setSearchQuery(e.target.value)}
              ></s-text-field>
            )}
            {showTopReorder && (
              <s-box>
                <s-stack direction="inline" justifyContent={reorderButtonPosition.includes("right") ? "end" : "start"}>
                  <s-button variant="primary" onClick={() => { if (selectedOrder?.id) onReorder(selectedOrder.id, selectedOrder.name, 'order-line-items-modal'); }} loading={reorderLoadingId === selectedOrder?.id} disabled={reorderLoadingId !== null}>
                    REORDER NOW
                  </s-button>
                </s-stack>
              </s-box>
            )}

            <s-divider></s-divider>
             {selectedOrder?.lineItems && selectedOrder.lineItems.length !== 0 ? (
            <s-box padding="base">
              <s-stack gap="base">
                {(selectedOrder?.lineItems || [])
                  .filter(item => !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item, index) => {
                    const amount = Number(item.totalPrice?.amount || 0);
                    const currency = item.totalPrice?.currencyCode || "";
                    const itemPrice = (amount !== 0 && api.i18n) ? api.i18n.formatNumber(amount, { precision: 2 }) + " " + currency : "";
                    return (
                      <s-grid key={index} gridTemplateColumns="auto 1fr auto" alignItems="center" gap="base">
                        <s-product-thumbnail src={item.image?.url ?? ""} alt={item.name} totalItems={item.quantity}></s-product-thumbnail>
                        <s-stack gap="small-100">
                          <s-text type="strong">{item.name}</s-text>
                          <s-text tone="neutral">{item.variantTitle || 'Default'}</s-text>
                        </s-stack>
                        <s-text type="strong">{itemPrice}</s-text>
                      </s-grid>
                    );
                  })}
              </s-stack>
            </s-box>
            ) : (
              <s-stack padding="base" direction="inline" alignItems="center" justifyContent="center">
                <s-text>No items found.</s-text>
              </s-stack>
            )}

            {showBottomReorder && (
              <s-stack gap="base">
                <s-divider></s-divider>
                <s-box inlineSize="100%">
                  <s-stack direction="inline" justifyContent={reorderButtonPosition.includes('right') ? 'end' : 'start'}>
                    <s-button variant="primary" onClick={() => { if (selectedOrder?.id) onReorder(selectedOrder.id, selectedOrder.name, 'order-line-items-modal'); }} loading={reorderLoadingId === selectedOrder?.id} disabled={reorderLoadingId !== null}>
                      REORDER NOW
                    </s-button>
                  </s-stack>
                </s-box>
              </s-stack>
            )}
          </s-stack>
        </s-query-container>
      </s-modal>
      )}
      

      <s-modal id="reviews-modal" heading="Review Your Products" size="max">
        <s-query-container>
          <s-stack gap="base">
            <s-box padding="base">
              <s-stack gap="base">
                {allReviewProducts.map((prod, pIdx) => {
                  const isLastItem = (pIdx + 1) === allReviewProducts.length;
                  return (
                  <s-stack key={pIdx} gap="base">
                    <s-grid gridTemplateColumns={LAYOUT_768_4COL} alignItems="center" gap="base">
                      <s-product-thumbnail src={prod.image?.url || ""} alt={prod.name} size="base" totalItems={prod?.quantity}></s-product-thumbnail>
                      <s-stack direction="block" gap="none">
                        <s-text type="strong">{prod.name}</s-text>
                        {prod.variantTitle && <s-text tone="neutral">{prod.variantTitle}</s-text>}
                      </s-stack>
                      <s-button
                        variant="secondary"
                        href={prod.productHandle && storefrontBase ? `${storefrontBase}/products/${prod.productHandle}${reviewTarget}` : undefined}
                        target="_blank"
                      >
                        Review
                      </s-button>
                    </s-grid>
                    {!isLastItem && <s-divider></s-divider>}
                  </s-stack>
                  );
                })}
              </s-stack>
            </s-box>
          </s-stack>
        </s-query-container>
      </s-modal>
      
      <s-modal id="medical-aid-modal" heading="Medical Aid Details" size="base">
        <s-query-container>
          <s-box padding="base">
            <s-stack gap="base">
              <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                <s-stack gap="small-100">
                  <s-text tone="neutral">Medical Aid Number</s-text>
                  <s-text type="strong">{customer?.medicalAidNumber || "Not provided"}</s-text>
                </s-stack>
                <s-stack gap="small-100">
                  <s-text tone="neutral">Medical Aid Plan</s-text>
                  <s-text type="strong">{customer?.medicalAidPlan || "Plan"}</s-text>
                </s-stack>
              </s-grid>
              <s-divider></s-divider>
              <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                <s-stack gap="small-100">
                  <s-text tone="neutral">Medical Aid Name</s-text>
                  <s-text type="strong">{customer?.medicalAidName || "Medical Aid Name"}</s-text>
                </s-stack>
                <s-stack gap="small-100">
                  <s-text tone="neutral">Patient ID Number</s-text>
                  <s-text type="strong">{customer?.patientIdNumber || "Not provided"}</s-text>
                </s-stack>
              </s-grid>
            </s-stack>
          </s-box>
        </s-query-container>
      </s-modal>
    </Fragment>
  );
}
