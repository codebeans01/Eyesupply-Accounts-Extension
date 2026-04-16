import { h } from "preact";
import { 
  LAYOUT_768_2COL_STACK,
  LAYOUT_768_4COL_BLOCK
} from "../../constants";
import { NavigationSectionsProps } from "../../interface";

export function NavigationSections({
  sections,
  resolveDynamicValue,
  resolveDynamicTone,
  reviewProducts,
  allReviewProductsCount,
  REVIEW_PAGE_SIZE,
  remainingReviewCount,
  storefrontBase,
  reviewTarget,
  onReorder,
  reorderLoadingId,
  lastOrder,
  showReviewProducts = true,
  reviewSubheading
}: NavigationSectionsProps) {

  return (
    <s-grid gridTemplateColumns={LAYOUT_768_2COL_STACK} gap="base">
      {(sections || []).map((section, sIdx) => (
        <s-box key={sIdx} id={"section-" + sIdx} padding="base" background="base" borderRadius="base" border="base">
          <s-stack gap="base">
            <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
              <s-grid-item>
                <s-stack direction="block" gap="large">
                  <s-heading>{section.title}</s-heading>
                  {section.id === 'reviews' && reviewSubheading && (
                    <s-text type="strong">{reviewSubheading}</s-text>
                  )}
                </s-stack>
              </s-grid-item>
              <s-grid-item>
                {section.iconUrl ? (
                  <s-box inlineSize="24px" blockSize="24px">
                    <s-image src={section.iconUrl} alt={section.title}></s-image>
                  </s-box>
                ) : (
                  <s-icon type={section.icon} size="base"></s-icon>
                )}
              </s-grid-item>
            </s-grid>
              
            <s-stack gap="small">
              {(section.links || []).map((link: any, lIdx: number) => {
                const dynamicSub = link.dynamicSub ? resolveDynamicValue(link.dynamicSub) : "";
                const href = link.href || "";
                const isReorder = link.action === 'reorder';
                const isModal = !!link.command;
                const isClickable = (href && href !== "#") || isModal || isReorder;
                const isOrderStatus = link.dynamicSub === 'orderStatus';
                const isLoading = isReorder && reorderLoadingId === lastOrder?.id && !!reorderLoadingId;

                const handleClick = () => {
                  if (isReorder && onReorder && lastOrder) {
                    onReorder(lastOrder.id, lastOrder.name);
                  }
                };

                return (
                  <s-stack key={lIdx} gap="small-100">
                    <s-grid gridTemplateColumns="1fr auto" alignItems="center">
                      <s-stack direction="inline" gap="small" alignItems="center">
                      {isClickable ? (
                          <s-clickable 
                            id={"nav-l-" + lIdx} 
                            href={(isReorder || isModal) ? undefined : href} 
                            command={link.command} 
                            commandFor={link.commandFor}
                            onClick={handleClick}
                          >
                            <s-stack direction="inline" gap="small" alignItems="center">
                              <s-text tone={link.tone || "custom"}>{link.label}</s-text>
                              {isLoading && <s-spinner size="small"></s-spinner>}
                            </s-stack>
                          </s-clickable>
                        ) : (
                          <s-text tone="info">{link.label}</s-text>
                        )}
                      </s-stack>
                      <s-stack direction="inline" gap="small" alignItems="center" justifyContent="end">
                       {(dynamicSub && isOrderStatus) ? (
                          <s-clickable 
                            id={"nav-status-" + lIdx} 
                            href={(isReorder || isModal) ? undefined : href} 
                            command={link.command} 
                            commandFor={link.commandFor}
                          >
                            <s-stack direction="inline" gap="small-300" alignItems="center">
                              <s-text tone={resolveDynamicTone ? resolveDynamicTone(link.dynamicSub) : "custom"}>{dynamicSub}</s-text>
                              <s-icon type="arrow-right" size="small" tone="custom"></s-icon>
                            </s-stack>
                          </s-clickable>
                        ) : (
                          dynamicSub ? (
                            link.dynamicSub === 'loyaltyPoints' ? (
                              <s-box>
                                <s-stack direction="inline" gap="small" alignItems="center">
                                  <s-heading>{dynamicSub}</s-heading>
                                </s-stack>
                              </s-box>
                            ) : (
                              <s-text tone={resolveDynamicTone ? resolveDynamicTone(link.dynamicSub) : "neutral"}>{dynamicSub}</s-text>
                            )
                          ) : null
                        )}
                      </s-stack>
                    </s-grid>
                  </s-stack>
                );
              })}
            </s-stack>

            {section.id === 'reviews' && showReviewProducts && reviewProducts.length !== 0 && (
              <s-stack direction="block" gap="none">
                <s-divider></s-divider>
                {reviewProducts.map((prod, pIdx) => (
                  <s-box key={pIdx} padding="small">
                    <s-grid gridTemplateColumns={LAYOUT_768_4COL_BLOCK} gap="small" alignItems="center">
                      <s-grid-item>
                        {prod.image?.url ? 
                          <s-product-thumbnail src={prod.image?.url} alt={prod.name} size="base" totalItems={prod?.quantity}></s-product-thumbnail> : 
                          <s-icon type="image" size="large-100"></s-icon>}
                      </s-grid-item>
                      <s-grid-item>
                        <s-stack direction="block" gap="none">
                          <s-text type="strong">{prod.name}</s-text>
                          {prod.variantTitle && <s-text tone="neutral">{prod.variantTitle}</s-text>}
                        </s-stack>
                      </s-grid-item>
                      <s-grid-item>
                        <s-button
                          variant="secondary"
                          href={prod.productHandle && storefrontBase ? `${storefrontBase}/products/${prod.productHandle}${reviewTarget}` : undefined}
                          target="_blank"
                        > 
                          Review
                        </s-button>
                      </s-grid-item>
                    </s-grid>
                    {((pIdx + 1) !== reviewProducts.length) && (
                      <s-stack gap="small">
                        <s-divider></s-divider>
                      </s-stack>
                    )}
                  </s-box>
                ))}
                {(allReviewProductsCount > REVIEW_PAGE_SIZE) && (
                  <s-box padding="small">
                    <s-divider></s-divider>
                    <s-stack direction="block" alignItems="center" paddingBlock="small">
                      <s-button 
                        variant="secondary" 
                        command="--show" 
                        commandFor="reviews-modal"
                      >
                          {"View More (" + remainingReviewCount + " more)"}
                      </s-button>
                    </s-stack>
                  </s-box>
                )}
              </s-stack>
            )}
          </s-stack> 
        </s-box>      
      ))}
    </s-grid>
  );
}
