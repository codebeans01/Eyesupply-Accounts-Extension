/** @jsx h */
import { h } from "preact";
import { 
  LAYOUT_768_2COL_STACK,
  LAYOUT_768_4COL_BLOCK
} from "../../constants";

interface NavigationSectionsProps {
  sections: any[];
  resolveDynamicValue: (key: string) => string;
  reviewProducts: any[];
  allReviewProductsCount: number;
  REVIEW_PAGE_SIZE: number;
  remainingReviewCount: number;
  storefrontBase: string;
  reviewTarget: string;
}

export function NavigationSections({
  sections,
  resolveDynamicValue,
  reviewProducts,
  allReviewProductsCount,
  REVIEW_PAGE_SIZE,
  remainingReviewCount,
  storefrontBase,
  reviewTarget
}: NavigationSectionsProps) {
  return (
    <s-grid gridTemplateColumns={LAYOUT_768_2COL_STACK} gap="base">
      {(sections || []).map((section, sIdx) => (
        <s-box key={sIdx} id={"section-" + sIdx} padding="base" background="base" borderRadius="base" border="base">
          <s-stack gap="base">
            <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
              <s-grid-item>
                <s-heading>{section.title}</s-heading>
              </s-grid-item>
              <s-grid-item>
                <s-icon type={section.icon} size="base"></s-icon>
              </s-grid-item>
            </s-grid>
              
            <s-stack gap="small">
              {(section.links || []).map((link: any, lIdx: number) => {
                const dynamicSub = link.dynamicSub ? resolveDynamicValue(link.dynamicSub) : "";
                const href = link.href || "";
                const isClickable = (href && href !== "#") || link.command;
                const isOrderStatus = link.dynamicSub === 'orderStatus';

                return (
                  <s-stack key={lIdx} gap="small-100">
                    <s-grid gridTemplateColumns="1fr auto" alignItems="center">
                      <s-stack direction="inline" gap="small" alignItems="center">
                      {isClickable ? (
                          <s-clickable 
                            id={"nav-l-" + lIdx} 
                            href={href} 
                            command={link.command} 
                            commandFor={link.commandFor}
                          >
                            <s-text tone="custom">{link.label}</s-text>
                          </s-clickable>
                        ) : (
                          <s-text tone="info">{link.label}</s-text>
                        )}
                      </s-stack>
                      <s-stack direction="inline" gap="small" alignItems="center" justifyContent="end">
                       {(dynamicSub && isOrderStatus) ? (
                          <s-clickable 
                            id={"nav-l-" + lIdx} 
                            href={href} 
                            command={link.command} 
                            commandFor={link.commandFor}
                          >
                            <s-stack direction="inline" gap="small-300" alignItems="center">
                              <s-text tone="custom">{dynamicSub}</s-text>
                              <s-icon type="arrow-right" size="small" tone="custom"></s-icon>
                            </s-stack>
                          </s-clickable>
                        ) : (
                          dynamicSub ? <s-text tone="neutral">{dynamicSub}</s-text> : null
                        )}
                      </s-stack>
                    </s-grid>
                  </s-stack>
                );
              })}
            </s-stack>

            {section.id === 'reviews' && reviewProducts.length !== 0 && (
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
