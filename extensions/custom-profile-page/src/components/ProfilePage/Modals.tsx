import { h, Fragment } from "preact";
import { 
  DISPLAY_768_GRID,
  DISPLAY_768_NONE_GRID,
  LAYOUT_768_4COL
} from "../../constants";
import { type ModalsProps } from "../../interface";
import { getNumericId, maskPatientId} from "../../helpers";

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


      {isAllOrdersModalVisible && (
        <s-modal id="all-orders-modal" heading="Track Your Orders" size="max">
          <s-query-container>
            <s-stack gap="large" alignItems="center">
              <s-box padding="large" background="base" border="base" borderRadius="large" inlineSize="100%">
                {ongoingOrders.length !== 0 ? (
                <s-stack gap="large">
                  <s-grid gridTemplateColumns="2fr 1fr 1fr 1fr" display={DISPLAY_768_GRID} alignItems="center" paddingInline="base">
                    <s-text type="strong" tone="neutral">Product</s-text>
                    <s-text type="strong" tone="neutral">Status</s-text>
                    <s-text type="strong" tone="neutral">Price</s-text>
                    <s-text type="strong" tone="neutral">Action</s-text>
                  </s-grid>
                  <s-box display={DISPLAY_768_GRID}>
                    <s-divider></s-divider>
                  </s-box>
                  {ongoingOrders.map((order) => {
                    const fulfillmentStatus = order.fulfillmentStatus || 'UNFULFILLED';
                    const displayStatus = (fulfillmentStatus.charAt(0) + fulfillmentStatus.slice(1).toLowerCase()).replace(/_/g, ' ');
                    const totalQuantity = (order.lineItems || []).reduce((acc, item) => acc + (item.quantity || 0), 0);
                    const orderPrice = order.totalPrice && api.i18n ? api.i18n.formatNumber(Number(order.totalPrice.amount), { precision: 2 }) + " " + order.totalPrice.currencyCode : "";

                    return (
                      <s-box key={order.id} padding="base" border="base" borderRadius="large">
                        <s-stack gap="base">
                          <s-grid gridTemplateColumns="2fr 1fr 1fr 1fr" display={DISPLAY_768_GRID} alignItems="center" gap="base">
                            <s-clickable onClick={() => api.navigation.navigate(`shopify://customer-account/orders/${getNumericId(order.id)}`)}>
                              <s-stack direction="inline" gap="base" alignItems="center">
                                <s-box borderRadius="base" overflow="hidden" inlineSize="56px" blockSize="56px">
                                  {order.lineItems?.[0]?.image ? (
                                    <s-image src={order.lineItems[0].image.url} alt={order.lineItems[0].name}></s-image>
                                  ) : (
                                    <s-grid alignItems="center" blockSize="100%">
                                      <s-icon type="image" tone="neutral"></s-icon>
                                    </s-grid>
                                  )}
                                </s-box>
                                <s-stack gap="small-100">
                                  <s-text type="strong">{order.name}</s-text>
                                  <s-text tone="neutral">{totalQuantity} items</s-text>
                                </s-stack>
                              </s-stack>
                            </s-clickable>
                            <s-stack gap="small-100">
                              <s-text type="strong">{customStatuses[order.id]?.public_name || displayStatus}</s-text>
                              <s-text tone="neutral">{order.processedAt ? new Date(order.processedAt).toLocaleDateString("en-GB") : ""}</s-text>
                            </s-stack>
                            <s-text type="strong">{orderPrice}</s-text>
                            <s-button 
                              variant="secondary" 
                              onClick={() => onReorder(order.id, order.name, 'all-orders-modal')} 
                              loading={reorderLoadingId === order.id} 
                              disabled={reorderLoadingId !== null}
                            >
                              Reorder
                            </s-button>
                          </s-grid>

                          <s-grid gridTemplateColumns="1fr auto" display={DISPLAY_768_NONE_GRID} gap="small">
                            <s-clickable onClick={() => api.navigation.navigate(`shopify://customer-account/orders/${getNumericId(order.id)}`)}>
                              <s-stack direction="inline" gap="base">
                                <s-box borderRadius="base" overflow="hidden" inlineSize="52px" blockSize="52px">
                                  {order.lineItems?.[0]?.image ? (
                                    <s-image src={order.lineItems[0].image.url} alt={order.lineItems[0].name}></s-image>
                                  ) : (
                                    <s-grid alignItems="center" blockSize="100%">
                                      <s-icon type="image" tone="neutral"></s-icon>
                                    </s-grid>
                                  )}
                                </s-box>
                                <s-stack gap="small-100">
                                  <s-text type="strong">{order.name}</s-text>
                                  <s-text tone="neutral">{totalQuantity} items</s-text>
                                  <s-text>{customStatuses[order.id]?.public_name || displayStatus}</s-text>
                                  <s-text tone="neutral">{order.processedAt ? new Date(order.processedAt).toLocaleDateString("en-GB") : ""}</s-text>
                                </s-stack>
                              </s-stack>
                            </s-clickable>
                            <s-stack alignItems="end" gap="small">
                              <s-text type="strong">{orderPrice}</s-text>
                              <s-button 
                                variant="secondary" 
                                onClick={() => onReorder(order.id, order.name, 'all-orders-modal')} 
                                loading={reorderLoadingId === order.id} 
                                disabled={reorderLoadingId !== null}
                              >
                                Reorder
                              </s-button>
                            </s-stack>
                          </s-grid>
                        </s-stack>
                      </s-box>
                    );
                  })}
                </s-stack>
              ) : (
                <s-stack padding="base" direction="inline" alignItems="center" justifyContent="center">
                  <s-text>No orders found.</s-text>
                </s-stack>
              )}
            </s-box>
          </s-stack>
        </s-query-container>
      </s-modal>
      )}

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
                  <s-text type="strong">{maskPatientId(customer?.patientIdNumber) || "Not provided"}</s-text>
                </s-stack>
              </s-grid>
            </s-stack>
          </s-box>
        </s-query-container>
      </s-modal>
    </Fragment>
  );
}
