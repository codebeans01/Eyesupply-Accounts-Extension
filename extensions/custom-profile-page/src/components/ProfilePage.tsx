import { Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import '@shopify/ui-extensions/preact';
import navConfig from "../navigation.json";
import { type Order, type Money } from "../interface";
import { loadCustomerData, reorder} from "../loadCustomerData";
import { fetchWithRetry, APP_URL, API_VERSION, getNumericId, fetchSmilePoints } from "../helpers";




interface ProfilePageProps {
  api: any;
  shopDomain: string;
}

export function ProfilePage({ api, shopDomain }: ProfilePageProps) {
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [settings, setSettings] = useState(api?.settings?.value ?? {});
  const [myshopifyDomain, setMyshopifyDomain] = useState<string>(shopDomain);
  const [points, setPoints] = useState<number | null>(null);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [reorderLoadingId, setReorderLoadingId] = useState<string | null>(null);

  if (!api) {
    return null;
  }
  
  const limit = 5;

  const currentShopDomain = myshopifyDomain || shopDomain;

  useEffect(() => {
    async function init() {
      setError(null);
      setLoading(true);
      try {
        const data = await loadCustomerData({
          ordersLimit: limit,
          lineItemsLimit: 20,
        });

        if (data.customer) {
          setCustomer(data.customer);
        }
        setOrders(data.orders || []);
        if (data.myshopifyDomain) {
          setMyshopifyDomain(data.myshopifyDomain);
        }
      } catch (err) {
        console.error("Failed to fetch customer data", err);
        setError(err as Error);
        api.toast?.show((err as Error).message || "Failed to load customer data");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [api]);

  useEffect(() => {
    async function getPoints() {
        if (!currentShopDomain) return;
        setPointsLoading(true);
        try {
            const sessionToken = await api.sessionToken.get();
            const data = await fetchSmilePoints(sessionToken, currentShopDomain);
            if (data?.customer) {
                setPoints(data.customer.points_balance);
            }
        } catch (err) {
            console.error("Failed to fetch points", err);
        } finally {
            setPointsLoading(false);
        }
    }
    getPoints();
  }, [api, currentShopDomain]);

  useEffect(() => {
    const unsubscribe = api.settings?.subscribe?.((newSettings: any) => {
      setSettings(newSettings ?? {});
    });
    return () => unsubscribe?.();
  }, [api.settings]);

  const handleReorder = async (orderId: string) => {
    if (!currentShopDomain) return;
    setReorderLoadingId(orderId);
    try {
        const sessionToken = await api.sessionToken.get();
        const { redirectUrl } = await reorder(orderId, sessionToken, currentShopDomain);
        if (redirectUrl) {
           api.navigation.navigate(redirectUrl);
        }
    } catch (err) {
        console.error("Reorder failed", err);
        api.toast?.show((err as Error).message || "Reorder failed");
    } finally {
        setReorderLoadingId(null);
    }
  };

  const firstName = customer?.firstName || "User";
  const lastName = customer?.lastName || "";

  const welcomeImageUrl = (settings?.cb_welcome_image_url as string) ?? "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_100x100.png";

  const navSections = (navConfig.sections || []).map((navSection: any) => {
    return (
      <s-box key={navSection.id} id={`section-${navSection.id}`} padding="base" background="base" borderRadius="base" border="base">
        <s-stack gap="base">
          <s-grid gridTemplateColumns="1fr auto">
            <s-heading id={`heading-${navSection.id}`}>{navSection.title}</s-heading>
            <s-icon type={navSection.icon as any} tone="neutral" />
          </s-grid>
          <s-stack gap="small">
            {(navSection.links || []).map((link: any, index: number) => {
              let dynamicSub = link.sub;
              if (link.dynamicSub === "orderStatus") {
                dynamicSub = loading ? "Loading..." : `${orders.length} order${orders.length !== 1 ? "s" : ""}`;
              } else if (link.dynamicSub === "lastOrderName") {
                dynamicSub = orders.length > 0 ? orders[0].name : "None";
              }

              let href = link.href;
              // Add prescription ID to details link
              if (link.label === "Prescription Details" && customer?.prescription?.id) {
                // Pass only the numeric ID to keep the URL clean
                href = `${href}/${getNumericId(customer.prescription.id)}`;
              }
              
              if (navSection.id === "reviews") {
                if (link.label === "Review Us on Google" && settings?.cb_review_google_url) {
                  href = settings.cb_review_google_url as string;
                } else if (link.label === "Review Us on Facebook" && settings?.cb_review_facebook_url) {
                  href = settings.cb_review_facebook_url as string;
                } else if (link.label === "Review Products") {
                  if (settings?.cb_review_products_url) {
                      href = settings.cb_review_products_url as string;
                  }
                  return (
                    <s-stack gap="small" key={index}>
                      <s-text tone="neutral" type="strong">{link.label}</s-text>
                      {loading ? (
                        <s-text>Loading products...</s-text>
                      ) : orders.length > 0 ? (
                        orders[0].lineItems.map((item: any) => (
                          <s-grid key={item.id} gridTemplateColumns="auto 1fr auto" alignItems="center" gap="small">
                            {item.image && (
                              <s-product-thumbnail
                                src={item.image.url}
                                alt={item.name}
                              />
                            )}
                            <s-text type="small">{item.name}</s-text>
                            <s-clickable href={`https://${currentShopDomain}/products/${getNumericId(item.productId ?? undefined)}#reviews`}>
                              <s-text tone="info">Review</s-text>
                            </s-clickable>
                          </s-grid>
                        ))
                      ) : (
                        <s-text tone="neutral">No products to review</s-text>
                      )}
                    </s-stack>
                  );
                }
              }
 
              if (navSection.id === "medical-aid" && customer) {
                if (link.label === "Medical Aid Number") {
                  dynamicSub = customer.medicalAidNumber || "--";
                } else if (link.label === "Medical Aid Plan") {
                  dynamicSub = customer.medicalAidPlan || "--";
                } else if (link.label === "Medical Aid Name") {
                  dynamicSub = customer.medicalAidName || "--";
                } else if (link.label === "Patient ID Number") {
                  dynamicSub = customer.patientIdNumber || "--";
                }
              }

              return (
                <s-grid key={index} gridTemplateColumns="1fr auto" alignItems="center">
                   <s-clickable href={href}>
                     <s-text tone="info">{link.label}</s-text>
                   </s-clickable>
                   {dynamicSub && <s-text tone="neutral">{dynamicSub}</s-text>}
                </s-grid>
              );
            })}
          </s-stack>
        </s-stack>
      </s-box>
    );
  });

  return (
    <s-page id="profile-dashboard" heading="My Dashboard">
      <s-stack gap="base">
        <s-banner tone="info" id="hero-banner">
          <s-grid gridTemplateColumns="1fr auto" alignItems="center" gap="base">
            <s-stack gap="small-200">
              <s-heading id="hero-title">Welcome Back</s-heading>
              <s-text id="user-full-name" type="strong">
                {loading ? "Loading..." : `${firstName} ${lastName}`}
              </s-text>
            </s-stack>
            <s-box background="base" borderRadius="base" padding="large" inlineSize="120px">
              <s-image
                src={welcomeImageUrl}
                alt="Welcome Back"
                inlineSize="fill"
              />
            </s-box>
          </s-grid>
        </s-banner>
        



        
        {loading ? (
             <s-box padding="base" background="base" borderRadius="base">
                <s-stack gap="base">
                    <s-heading>Ongoing Order Status</s-heading>
                    {[1, 2, 3].map((i) => (
                        <s-box key={i} border="base" padding="base" borderRadius="base">
                            <s-grid gridTemplateColumns="auto 1fr 1fr auto auto" alignItems="center" gap="base">
                                <s-box background="subdued" blockSize="50px" inlineSize="50px" borderRadius="base" />
                                <s-stack gap="small-100">
                                    <s-box background="subdued" blockSize="15px" inlineSize="60px" />
                                    <s-box background="subdued" blockSize="12px" inlineSize="40px" />
                                </s-stack>
                                <s-stack gap="small-100">
                                    <s-box background="subdued" blockSize="15px" inlineSize="80px" />
                                    <s-box background="subdued" blockSize="12px" inlineSize="50px" />
                                </s-stack>
                                <s-box background="subdued" blockSize="15px" inlineSize="80px" />
                                <s-icon type="menu-horizontal" tone="neutral" />
                            </s-grid>
                        </s-box>
                    ))}
                </s-stack>
            </s-box>
        )        : !loading && orders.length > 0 ? (
            <s-box padding="base" background="base" borderRadius="base">
                <s-stack gap="base">
                    <s-heading>Recent Orders</s-heading>
                    {orders.slice(0, 3).map((order) => {
                        const fulfillmentStatus = (order.fulfillmentStatus || 'Confirmed');
                        const displayStatus = fulfillmentStatus.charAt(0) + fulfillmentStatus.slice(1).toLowerCase();
                        
                        return (
                            <s-box key={order.id} padding="base" background="base" borderRadius="base" border="base">
                                <s-grid gridTemplateColumns="auto 1fr 1fr auto auto" alignItems="center" gap="base">
                                    <s-box borderRadius="base" overflow="hidden" inlineSize="50px" blockSize="50px">
                                        {order.lineItems[0]?.image ? (
                                            <s-image src={order.lineItems[0].image.url} alt={order.lineItems[0].name} />
                                        ) : (
                                            <s-box background="subdued" blockSize="100%" inlineSize="100%" />
                                        )}
                                    </s-box>
                                    
                                    <s-stack gap="small-100">
                                        <s-text type="strong">{order.name || ""}</s-text>
                                        <s-text tone="neutral" type="small">
                                            {(order.lineItems || []).reduce((acc, item) => acc + (item.quantity || 0), 0)} items
                                        </s-text>
                                    </s-stack>
                
                                    <s-stack gap="small-100">
                                        <s-text type="strong">{displayStatus}</s-text>
                                        <s-text tone="neutral" type="small">
                                            {order.processedAt ? new Date(order.processedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ""}
                                        </s-text>
                                    </s-stack>
                
                                    <s-text type="strong">
                                        {order.totalPrice ? api.i18n.formatCurrency(Number(order.totalPrice.amount), {
                                            currency: order.totalPrice.currencyCode,
                                        }) : ""}
                                    </s-text>
                
                                    <s-box>
                                         <s-button id={`trigger-${getNumericId(order.id)}`} variant="secondary" command="--toggle" commandFor={`menu-${getNumericId(order.id)}`}>
                                            <s-icon type="menu-horizontal" tone="neutral" />
                                        </s-button>
                                        <s-popover id={`menu-${getNumericId(order.id)}`}>
                                            <s-stack padding="base" gap="small">
                                                 <s-button variant="secondary" href={`shopify://customer-account/orders/${getNumericId(order.id)}`}>View order details</s-button>
                                                 <s-button variant="secondary" onClick={() => handleReorder(order.id)} loading={reorderLoadingId === order.id} disabled={reorderLoadingId !== null}>
                                                     {reorderLoadingId === order.id ? "" : "Reorder"}
                                                 </s-button>
                                            </s-stack>
                                        </s-popover>
                                    </s-box>
                                </s-grid>
                            </s-box>
                        );
                    })}
                </s-stack>
            </s-box>
        ) : null}

        <s-query-container>
          <s-grid
            id="status-row"
            gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))"
            gap="base"
          >
            <s-box padding="base" background="subdued" borderRadius="base">
              <s-grid gridTemplateColumns="1fr auto" alignItems="center">
                <s-stack gap="small">
                  <s-text tone="neutral">Ongoing Order Status</s-text>
                  <s-text type="strong">
                    {loading ? "Loading..." : orders.length > 0 ? orders[0].fulfillmentStatus : "No active orders"}
                  </s-text>
                </s-stack>
                <s-icon type="cart" size="base" tone="neutral" />
              </s-grid>
            </s-box>

             <s-box padding="base" background="subdued" borderRadius="base">
               <s-stack gap="small">
                 <s-text tone="neutral">
                   {orders.length > 0 && orders[0].daysTillRunOut 
                     ? `Days Till Run Out ${orders[0].daysTillRunOut} days` 
                     : "Days Till Run Out --"}
                 </s-text>
                 <s-text type="strong">left of lenses</s-text>
               </s-stack>
             </s-box>
          </s-grid>
        </s-query-container>

        {!loading && orders.length > 0 && (
          <s-box padding="base" background="base" borderRadius="base">
            <s-stack gap="base">
              <s-heading id="last-order-details-heading">Last Order Details</s-heading>
              <s-box padding="base" background="subdued" borderRadius="base">
                <s-stack gap="base">
                  <s-text type="strong" tone="neutral">
                    Order {orders[0].name} - {new Date(orders[0].processedAt).toLocaleDateString()}
                  </s-text>
                  <s-grid gridTemplateColumns="1fr" gap="base">
                    {orders[0].lineItems.map((item) => (
                      <s-box key={item.id} padding="small" borderRadius="base" background="base" border="base">
                        <s-grid gridTemplateColumns="auto 1fr" gap="base" alignItems="center">
                          {item.image && (
                            <s-product-thumbnail
                              src={item.image.url}
                              alt={item.name}
                            />
                          )}
                          <s-stack gap="small">
                            <s-text type="strong">{item.name}</s-text>
                            {item.variantTitle && <s-text type="small" tone="neutral">{item.variantTitle}</s-text>}
                            
                            {item.variantOptions && item.variantOptions.length > 0 && (
                              <s-stack gap="small">
                                {item.variantOptions.map((opt, idx) => (
                                  <s-text key={idx} type="small" tone="neutral">
                                    {opt.name}: {opt.value}
                                  </s-text>
                                ))}
                              </s-stack>
                            )}

                            {item.customAttributes && item.customAttributes.length > 0 && (
                              <s-stack gap="small">
                                {item.customAttributes.map((attr, idx) => (
                                  <s-text key={idx} type="small" tone="neutral">
                                    {attr.key}: {attr.value}
                                  </s-text>
                                ))}
                              </s-stack>
                            )}
                          </s-stack>
                        </s-grid>
                      </s-box>
                    ))}
                  </s-grid>
                </s-stack>
              </s-box>
            </s-stack>
          </s-box>
        )}

        {customer?.prescription && (
          <s-box padding="base" background="base" borderRadius="base" border="base">
            <s-stack gap="base">
              <s-grid gridTemplateColumns="1fr auto" alignItems="center">
                <s-heading>Latest Prescription</s-heading>
                <s-clickable href="extension:custom-profile-page/view-prescription">
                  <s-text tone="info">View All</s-text>
                </s-clickable>
              </s-grid>
              <s-box padding="base" background="subdued" borderRadius="base">
                <s-grid gridTemplateColumns="1fr 1fr 1fr" gap="base">
                  <s-stack gap="small">
                    <s-text tone="neutral" type="small">Prescription ID</s-text>
                    <s-text type="strong">#{getNumericId(customer.prescription.id)}</s-text>
                  </s-stack>
                  <s-stack gap="small">
                    <s-text tone="neutral" type="small">Expiry Date</s-text>
                    <s-text type="strong">{customer.prescription.expiry_date || "No Expiry"}</s-text>
                  </s-stack>
                  <s-stack gap="small">
                    <s-text tone="neutral" type="small">Status</s-text>
                    <s-badge tone={customer.prescription.status?.toLowerCase() === 'active' ? 'auto' : 'neutral'}>
                      {customer.prescription.status || "Active"}
                    </s-badge>
                  </s-stack>
                </s-grid>
              </s-box>
            </s-stack>
          </s-box>
        )}

        <s-query-container>
          <s-grid
            id="quick-info-row"
            gridTemplateColumns="1fr 1fr"
            gap="base"
          >
            <s-box padding="base" background="subdued" borderRadius="base">
              <s-grid gridTemplateColumns="auto 1fr auto" alignItems="center" gap="large">
                <s-icon type="check-circle" tone="neutral" />
                <s-text type="strong">Loyalty Points</s-text>
                <s-text type="strong">
                    {pointsLoading ? (
                        <s-spinner accessibilityLabel="Loading points" />
                    ) : points !== null ? (
                        `${points} pts`
                    ) : (
                        "0 pts"
                    )}
                </s-text>
              </s-grid>
            </s-box>
            <s-box padding="base" background="subdued" borderRadius="base">
              <s-clickable href="extension:custom-profile-page/view-prescription">
                <s-grid gridTemplateColumns="auto 1fr auto" alignItems="center" gap="small">
                  <s-icon type="note" tone="neutral" />
                  <s-text type="strong">Prescription Details</s-text>
                  <s-icon type="chevron-right" tone="neutral" />
                </s-grid>
              </s-clickable>
            </s-box>
          </s-grid>
        </s-query-container>

        <s-query-container>
          <s-grid
            id="nav-grid"
            gridTemplateColumns="1fr 1fr"
            gap="base"
          >
            {navSections}
          </s-grid>
        </s-query-container>
      </s-stack>
    </s-page>
    );
}

