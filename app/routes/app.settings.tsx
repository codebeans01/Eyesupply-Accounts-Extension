import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useActionData, useLoaderData, useNavigation, Form } from "react-router";
import { authenticate } from "../shopify.server";
import { safeGraphql } from "../utils/graphqlHandler";
// Constants for Banner Validation
const BANNER_IDEAL_WIDTH = 1130;
const BANNER_IDEAL_HEIGHT = 370;
const BANNER_IDEAL_RATIO = BANNER_IDEAL_WIDTH / BANNER_IDEAL_HEIGHT;

const DEFAULT_NAV = {
  sections: [
    {
      id: "orders",
      title: "Orders",
      links: [
        { label: "Ongoing Order Status", href: "#" },
        { label: "Reorder last order", action: "reorder", href: "#" },
        { label: "Past Orders", href: "#" },
        { label: "Invoices", href: "#" }
      ]
    },
    {
      id: "prescription",
      title: "Prescription",
      links: [
        { label: "Upload Prescription", href: "#" },
        { label: "View Prescriptions", href: "extension:custom-profile-page/view-prescription" },
        { label: "How prescriptions work", href: "#" }
      ]
    },
    {
      id: "delivery",
      title: "Delivery",
      links: [
        { label: "Delivery Address", href: "#" },
        { label: "Delivery Charges", href: "#" },
        { label: "Delivery FAQs", href: "#" }
      ]
    },
    {
      id: "medical-aid",
      title: "Medical Aid",
      links: [
        { label: "Medical aid details", command: "--show", commandFor: "medical-aid-modal" },
        { label: "Medical aid invoices", href: "#" },
        { label: "How to claim", href: "#" }
      ]
    },
    { 
      id: "profile",
      title: "Profile",
      links: [
        { label: "Personal Details", href: "#" },
        { label: "Address", href: "#" },
        { label: "Contact Details", href: "#" },
      ]
    },
    {
      id: "rewards",
      title: "EyeSupply Rewards",
      links: [
        { label: "Points", href: "#" },
        { label: "Use on your next order", href: "#" },
        { label: "Earn & Redeem", href: "#" }
      ]
    },
    {
      id: "reviews",
      title: "Reviews",
      links: [
        { label: "Review us", href: "" },
        { label: "Review your products", href: "#" }
      ]
    },
    {
      id: "support",
      title: "Support",
      links: [
        { label: "Contact us", href: "#" },
        { label: "Speak to Lenny", href: "#" },
        { label: "FAQs", href: "#" }
      ]
    }
  ]
};

const QUERY_GET_SETTINGS = `#graphql
  query GetShopSettings {
    shop {
      id
      name
      url
      metafield(namespace: "eyesupply_dashboard", key: "settings") {
        id
        value
      }
    }
  }
`;

const MUTATION_SET_SETTINGS = `#graphql
  mutation SetShopSettings($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id namespace key value }
      userErrors { field message code }
    }
  }
`;

const MUTATION_CREATE_DEFINITION = `#graphql
  mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition { id namespace key }
      userErrors { field message code }
    }
  }
`;

const QUERY_GET_DEFINITION = `#graphql
  query GetMetafieldDefinition {
    metafieldDefinitions(first: 1, ownerType: SHOP, namespace: "eyesupply_dashboard", key: "settings") {
      nodes {
        id
        access {
          storefront
        }
      }
    }
  }
`;

const MUTATION_UPDATE_DEFINITION = `#graphql
  mutation UpdateMetafieldDefinition($definition: MetafieldDefinitionUpdateInput!) {
    metafieldDefinitionUpdate(definition: $definition) {
      updatedDefinition { id }
      userErrors { field message code }
    }
  }
`;

const DEFAULT_EXT_SETTINGS = {
  cb_welcome_image_url: "https://cdn.shopify.com/s/files/1/0882/1004/7288/files/EYE-SUPPLY-LOGO_2.png?v=1738743179",
  cb_banner_title: "Welcome Back",
  cb_review_google_url: "https://g.page/r/11164121505097059976/review",
  cb_review_facebook_url: "https://www.facebook.com/eyesupply/reviews",
  cb_review_target: "reviews",
  cb_support_faq_url: "https://support.eyewearsystem.com/hc/en-us",
  cb_support_contact_url: "https://support.eyewearsystem.com/hc/en-us/requests/new",
  cb_reward_refferal_url: "https://support.eyewearsystem.com/hc/en-us/requests/new",
  cb_reward_redeem_points_url: "https://support.eyewearsystem.com/hc/en-us/requests/new",
  exclude_trial_pack: false,
  exclude_variant_ids: "",
  external_reorder_link: "https://eyesupply.co.za/pages/reorder-help",
  cb_reorder_button_position: "bottom_right",
  cb_search_enable: true,
  cb_show_default_nav: true,
  cb_reorder_banner_heading: "Reordering from an older order?",
  cb_reorder_banner_description: "Because we’ve upgraded our website, older orders can’t be reordered directly through the new system. Please add your items to cart manually this time. Going forward, reordering will work smoothly from your account.",
  cb_hide_track_order_reorder: false,
  cb_stat_recent_order_title: "Most Recent Order",
  cb_stat_reorder_btn_label: "REORDER",
  cb_stat_past_orders_btn_label: "Reorder Past Orders",
  cb_stat_show_reorder_btn: true,
  cb_stat_show_past_orders_btn: true,
  cb_stat_show_reorder_now_btn: true,
  cb_stat_covered_until_text: "You’re covered until",
  cb_stat_days_remaining_text: "days remaining",
  cb_stat_reorder_now_btn_label: "Reorder now",
  cb_stat_loyalty_title: "My Loyalty Points",
  cb_stat_loyalty_link_text: "Earn & Redeem",
  cb_stat_prescription_title: "Prescription Expiry",
  cb_rewards_page_url: "/pages/rewards",
  cb_fallback_not_provided: "Not provided",
  cb_fallback_no_orders: "No orders yet",
  cb_fallback_points_loading: "...",
  cb_fallback_0_points: "0 points",
  cb_fallback_0_orders: "0 orders",
  cb_fallback_prescription_completed: "No Status",
  cb_fallback_0_days: "0 days",
  section_order: ["orders", "profile", "rewards", "prescription", "delivery", "medical-aid", "support", "reviews"]
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const response = await safeGraphql(admin, QUERY_GET_SETTINGS);
  
  const metafieldValue = response?.data?.shop?.metafield?.value;
  let settings: any = { sections: {} }; 
  if (metafieldValue) {
    try {
      const parsed = JSON.parse(metafieldValue);
      settings = { ...DEFAULT_EXT_SETTINGS, ...parsed };
    } catch (e) {
      console.error("Failed to parse settings JSON", e);
      settings = { ...DEFAULT_EXT_SETTINGS, sections: {} };
    }
  } else {
    settings = { ...DEFAULT_EXT_SETTINGS, sections: {} };
  }

  return { 
    settings, 
    shopId: response?.data?.shop?.id,
    shopName: response?.data?.shop?.name,
    shopUrl: response?.data?.shop?.url
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const settingsJson = formData.get("settings") as string;
  const shopId = formData.get("shopId") as string;

  const saveResponse = await safeGraphql(admin, MUTATION_SET_SETTINGS, {
    metafields: [
      {
        namespace: "eyesupply_dashboard",
        key: "settings",
        type: "json",
        value: settingsJson,
        ownerId: shopId
      }
    ]
  });

  const definitionQuery = await safeGraphql(admin, QUERY_GET_DEFINITION);
  const existingDefinition = definitionQuery?.data?.metafieldDefinitions?.nodes?.[0];

  if (existingDefinition) {
    if (existingDefinition.access?.storefront !== "PUBLIC_READ") {
      await safeGraphql(admin, MUTATION_UPDATE_DEFINITION, {
        definition: {
          id: existingDefinition.id,
          access: { storefront: "PUBLIC_READ" }
        }
      });
    }
  } else {
    await safeGraphql(admin, MUTATION_CREATE_DEFINITION, {
      definition: {
        namespace: "eyesupply_dashboard",
        key: "settings",
        name: "Dashboard Settings",
        type: "json",
        ownerType: "SHOP",
        access: {
          storefront: "PUBLIC_READ"
        }
      }
    });
  }

  return { ok: !saveResponse.errors && !saveResponse.data?.metafieldsSet?.userErrors?.length };
};

export default function SettingsPage() {
  const data = useLoaderData<typeof loader>();
  const initialSettings = data?.settings;
  const shopId = data?.shopId;
  const shopName = data?.shopName || "Eyesupply";
  const shopUrl = data?.shopUrl || "eyesupply.myshopify.com";
  const actionData = useActionData<typeof action>() as any;
  const navigationState = useNavigation();
  const isSaving = navigationState.state === "submitting" || navigationState.state === "loading";

  const [settings, setSettings] = useState<any>(initialSettings || { sections: {} });
  const [activeTab, setActiveTab] = useState("general");

  const TABS = [
    { id: "general", label: "General settings", icon: "settings" },
    { id: "promotional-banner", label: "Promotional Banner", icon: "megaphone" },
    { id: "quick-actions", label: "Quick Actions", icon: "channels" },
    { id: "orders", label: "Orders", icon: "cart" },
    { id: "track-order", label: "Track Order", icon: "order" },
    { id: "profile", label: "Profile", icon: "person" },
    { id: "prescription", label: "Prescription", icon: "note" },
    { id: "delivery", label: "Delivery", icon: "shipping-label" },
    { id: "medical-aid", label: "Medical Aid", icon: "profile" },
    { id: "rewards", label: "Rewards", icon: "star" },
    { id: "reviews", label: "Reviews", icon: "chat" },
    { id: "support", label: "Support", icon: "question-circle" },
    { id: "error-handling", label: "Error Handling", icon: "alert-triangle" },
  ];



  useEffect(() => {
    if (actionData?.ok) {
       // @ts-ignore
      if (typeof shopify !== 'undefined') {
         // @ts-ignore
         shopify.toast.show("Settings saved!");
      }
    }
  }, [actionData]);

  const updateSectionTitle = (sectionId: string, title: string) => {
    setSettings((prev: any) => ({
      ...prev,
      sections: {
        ...(prev.sections || {}),
        [sectionId]: {
          ...(prev.sections?.[sectionId] || {}),
          title
        }
      }
    }));
  };

  const updateLinkLabel = (sectionId: string, linkIndex: number, label: string) => {
    setSettings((prev: any) => {
      const section = prev.sections?.[sectionId] || {};
      const links = [...(section.links || [])];
      while (links.length <= linkIndex) {
          links.push({});
      }
      links[linkIndex] = { ...links[linkIndex], label };
      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionId]: { ...section, links }
        }
      };
    });
  };

  const updateLinkHref = (sectionId: string, linkIndex: number, href: string) => {
    setSettings((prev: any) => {
      const section = prev.sections?.[sectionId] || {};
      const links = [...(section.links || [])];
      while (links.length <= linkIndex) {
          links.push({});
      }
      links[linkIndex] = { ...links[linkIndex], href };
      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionId]: { ...section, links }
        }
      };
    });
  };

  const updateLinkAction = (sectionId: string, linkIndex: number, action: string) => {
    setSettings((prev: any) => {
      const section = prev.sections?.[sectionId] || {};
      const links = [...(section.links || [])];
      while (links.length <= linkIndex) {
          links.push({});
      }
      links[linkIndex] = { ...links[linkIndex], action };
      
      // Auto-set command if Modal Action is selected
      if (action === 'modal') {
        links[linkIndex].command = "--show";
      } else {
        delete links[linkIndex].command;
        delete links[linkIndex].commandFor;
      }

      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionId]: { ...section, links }
        }
      };
    });
  };

  const updateLinkCommandFor = (sectionId: string, linkIndex: number, commandFor: string) => {
    setSettings((prev: any) => {
      const section = prev.sections?.[sectionId] || {};
      const links = [...(section.links || [])];
      while (links.length <= linkIndex) {
          links.push({});
      }
      links[linkIndex] = { ...links[linkIndex], commandFor };
      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionId]: { ...section, links }
        }
      };
    });
  };

  const updateSetting = (key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  const updateBanner = (index: number, key: string, value: any) => {
    setSettings((prev: any) => {
      const banners = [...(prev.cb_promotional_banners || [])];
      // Migration check
      if (banners.length === 0 && prev.cb_promotional_banner_image_url) {
        banners.push({
          enable: prev.cb_promotional_banner_enable || false,
          imageUrl: prev.cb_promotional_banner_image_url || "",
          link: prev.cb_promotional_banner_link || "",
          position: prev.cb_promotional_banner_position || "top"
        });
      }

      if (banners[index]) {
        banners[index] = { ...banners[index], [key]: value };
      }
      return { ...prev, cb_promotional_banners: banners };
    });
  };

  const addBanner = () => {
    setSettings((prev: any) => {
      const banners = [...(prev.cb_promotional_banners || [])];
      // Migration check
      if (banners.length === 0 && prev.cb_promotional_banner_image_url) {
        banners.push({
          enable: prev.cb_promotional_banner_enable || false,
          imageUrl: prev.cb_promotional_banner_image_url || "",
          link: prev.cb_promotional_banner_link || "",
          position: prev.cb_promotional_banner_position || "top"
        });
      }

      if (banners.length < 3) {
        banners.push({ enable: true, imageUrl: "", link: "", position: "top" });
      }
      return { ...prev, cb_promotional_banners: banners };
    });
  };

  const removeBanner = (index: number) => {
    setSettings((prev: any) => {
      const banners = [...(prev.cb_promotional_banners || [])];
      // Migration check
      if (banners.length === 0 && prev.cb_promotional_banner_image_url) {
        banners.push({
          enable: prev.cb_promotional_banner_enable || false,
          imageUrl: prev.cb_promotional_banner_image_url || "",
          link: prev.cb_promotional_banner_link || "",
          position: prev.cb_promotional_banner_position || "top"
        });
      }

      const newBanners = banners.filter((_: any, i: number) => i !== index);
      return { ...prev, cb_promotional_banners: newBanners };
    });
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const currentOrder = settings.section_order || ["orders", "profile", "rewards", "prescription", "delivery", "medical-aid", "support", "reviews"];
    const newOrder = [...currentOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      updateSetting("section_order", newOrder);
    }
  };

  const handleSelectVariants = async () => {
    // @ts-ignore
    if (typeof shopify !== 'undefined') {
      // @ts-ignore
      const selection = await shopify.resourcePicker({
        type: "product",
        multiple: true,
        action: "select",
        filter: {
          hidden: true,
          draft: false,
          archived: false,
        },
      });

      if (selection && selection.length > 0) {
        // Extract all variant IDs from selected products
        const selectedVariantIds: string[] = [];
        
        selection.forEach((product: any) => {
          if (product.variants && product.variants.length > 0) {
            // Extract variant IDs from variants array
            product.variants.forEach((variant: any) => {
              if (variant.id) {
                // Extract numeric ID from gid format (e.g., "gid://shopify/ProductVariant/123456")
                const numericId = variant.id.split("/").pop();
                if (numericId) {
                  selectedVariantIds.push(numericId);
                }
              }
            });
          }
        });
        
        console.log('selectedVariantIds', selectedVariantIds);
        
        const currentIds = settings.exclude_variant_ids 
          ? settings.exclude_variant_ids.split(",").map((s: string) => s.trim()) 
          : [];
        
        // Combine current and new IDs, remove duplicates
        const combined = Array.from(new Set([...currentIds, ...selectedVariantIds])).filter(Boolean).join(", ");
        updateSetting("exclude_variant_ids", combined);
      }
    }
  };

  return (
    <s-page>
      {/* Header Alignment matching design screenshot */}
      <s-box paddingBlock="base">
        <s-stack gap="small" direction="inline" alignItems="center">
          <s-button variant="tertiary" onClick={() => history.back()} icon="arrow-left" />
          <s-heading>Settings</s-heading>
        </s-stack>
      </s-box>

      <Form method="post" data-save-bar>
        <input type="hidden" name="settings" value={JSON.stringify(settings)} />
        <input type="hidden" name="shopId" value={shopId} />
        <s-query-container>
          <s-grid gridTemplateColumns="@container (inline-size > 768px) 240px 1fr, 1fr" gap="large" alignItems="start">
          {/* Sidebar Area - Unified premium container */}
          <s-grid-item>
            <s-box background="base" border="base" borderRadius="large" padding="base">
              <s-stack gap="base">
                {/* Store Identity Block */}
                <s-stack direction="inline" gap="base" alignItems="center">
                  <s-box background="subdued" borderRadius="base" padding="small" inlineSize="40px" blockSize="40px">
                    <s-stack alignItems="center" justifyContent="center" blockSize="100%">
                      <s-text type="strong" tone="neutral">{shopName.charAt(0).toUpperCase()}</s-text>
                    </s-stack>
                  </s-box>
                  <s-stack gap="none">
                    <s-text type="strong">{shopName}</s-text>
                    <s-text>{shopUrl.replace("https://", "")}</s-text>
                  </s-stack>
                </s-stack>

                <s-divider />

                {/* Navigation Tab List */}
                <s-stack gap="none">
                  {TABS.map((tab) => (
                    <s-clickable key={tab.id} onClick={() => setActiveTab(tab.id)}>
                      <s-box 
                        padding="small" 
                        background={activeTab === tab.id ? "subdued" : "transparent"} 
                        borderRadius="base"
                        border={activeTab === tab.id ? "base" : "none"}
                      >
                        <s-stack direction="inline" gap="base" alignItems="center">
                          <s-icon type={tab.icon as any} size="base" tone={activeTab === tab.id ? "info" : "neutral"} />
                          <s-text tone={activeTab === tab.id ? "info" : "neutral"} type={activeTab === tab.id ? "strong" : "generic"}>
                            {tab.label}
                          </s-text>
                        </s-stack>
                      </s-box>
                    </s-clickable>
                  ))}
                </s-stack>
              </s-stack>
            </s-box>
          </s-grid-item>

          {/* Main Content Area */}
          <s-grid-item>
            <s-stack gap="base">
              {activeTab === "general" && (
                <>
                  <s-heading>{ "General Settings" }</s-heading>
                  
                  <s-box background="base" border="base" borderRadius="large" padding="base">
                    <s-stack gap="base">
                      <s-heading>Welcome Banner Title</s-heading>
                      <s-text-area
                        label="Welcome Banner Title ({{first_name}}, {{last_name}})"
                        value={settings.cb_banner_title || ""}
                        onInput={(e: any) => updateSetting("cb_banner_title", e.target.value)}
                        rows={3}
                      ></s-text-area>

                      <s-divider />
                      <s-heading>Welcome Image & Branding</s-heading>
                    
                      <s-text-field
                        label="Welcome Image URL (Recommended size: 500 × 230 px)"
                        value={settings.cb_welcome_image_url || ""}
                        onInput={(e: any) => updateSetting("cb_welcome_image_url", e.target.value)}
                        placeholder="https://cdn.shopify.com/..."
                      />
                      
                      {settings.cb_welcome_image_url && (
                        <s-box maxInlineSize="500px" blockSize="230px" borderRadius="base" overflow="hidden" border="base">
                          <s-image 
                            src={settings.cb_welcome_image_url} 
                            alt="Welcome Preview" 
                            loading="lazy" 
                            objectFit="cover"
                            inlineSize="100%"
                            blockSize="100%"
                          />
                        </s-box>
                      )}
                      
                      <s-divider />
                      
                      <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                        <s-stack gap="none">
                          <s-text type="strong">Enable Search Bar</s-text>
                          <s-text>Show a search input in the line item modal for the Most Recent Order on the customer dashboard</s-text>
                        </s-stack>
                        <s-checkbox 
                          checked={settings.cb_search_enable !== false} 
                          onChange={(e: any) => updateSetting("cb_search_enable", e.target.checked)} 
                        />
                      </s-stack>
                      
                      <s-divider />
                      
                      <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                        <s-stack gap="none">
                          <s-text type="strong">Show Default Navigation</s-text>
                          <s-text>Enable systemic links like Orders and Support.</s-text>
                        </s-stack>
                        <s-checkbox 
                          checked={settings.cb_show_default_nav !== false} 
                          onChange={(e: any) => updateSetting("cb_show_default_nav", e.target.checked)} 
                        />
                      </s-stack>
                    </s-stack>
                  </s-box>

                  

                  <s-box background="base" border="base" borderRadius="large" padding="base">
                    <s-stack gap="base">
                      <s-heading>Dashboard Section Order</s-heading>
                      <s-text>Rearrange how sections appear on the customer dashboard grid (2 columns per row).</s-text>
                      
                      <s-divider />
                      
                      <s-stack gap="small">
                        {(settings.section_order || ["orders", "profile", "rewards", "prescription", "delivery", "medical-aid", "support", "reviews"]).map((sectionId: string, index: number, arr: string[]) => {
                          const tab = TABS.find(t => t.id === sectionId) || { label: sectionId, icon: "person" };
                          return (
                            <s-box key={sectionId} padding="small" background="subdued" borderRadius="base" border="base">
                              <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
                                <s-icon type={tab.icon as any} size="base" />
                                <s-text type="strong">{tab.label}</s-text>
                                <s-stack direction="inline" gap="large">
                                  <s-button 
                                    variant="tertiary" 
                                    disabled={index === 0} 
                                    onClick={() => moveSection(index, 'up')}
                                  >
                                    <s-icon type="arrow-up" />
                                  </s-button>
                                  <s-button 
                                    variant="tertiary" 
                                    disabled={index === arr.length - 1} 
                                    onClick={() => moveSection(index, 'down')}
                                  >
                                    <s-icon type="arrow-down" />
                                  </s-button>
                                </s-stack>
                              </s-grid>
                            </s-box>
                          );
                        })}
                      </s-stack>
                    </s-stack>
                  </s-box>

                  <s-box background="base" border="base" borderRadius="large" padding="base">
                    <s-stack gap="base">
                      <s-heading>Reorder flow Configuration</s-heading>
                    
                      <s-divider />
                      
                      <s-stack gap="base">
                        <s-text type="strong">Exclude Variant IDs</s-text>
                        <s-text tone="neutral">Products with these variant IDs will be skipped during reorder.</s-text>
                        
                        <s-stack gap="small" direction="inline" alignItems="end">
                          <s-text-field
                            label="Variant IDs (comma-separated)"
                            value={settings.exclude_variant_ids || ""}
                            onInput={(e: any) => updateSetting("exclude_variant_ids", e.target.value)}
                            placeholder="e.g., 51453457137954, 12345678901234"
                          />
                          <s-button
                            variant="secondary"
                            onClick={handleSelectVariants}
                          >
                            Select Products
                          </s-button>
                        </s-stack>
                      </s-stack>
                      
                      

                      <s-select label="Reorder Button Position" value={settings.cb_reorder_button_position || "bottom_right"} onInput={(e: any) => updateSetting("cb_reorder_button_position", e.target.value)}>
                          <s-option value="bottom_right">Bottom Right</s-option>
                          <s-option value="bottom_left">Bottom Left</s-option>
                          <s-option value="top_right">Top Right</s-option>
                          <s-option value="top_left">Top Left</s-option>
                        </s-select>

                      <s-divider />
                     
                    </s-stack>
                  </s-box>

                  <s-box background="base" border="base" borderRadius="large" padding="base">
                    <s-stack gap="base">
                      <s-heading>Reorder Warning Banner</s-heading>
                      <s-divider />
                      
                      <s-text-field
                        label="Reorder Banner Heading"
                        value={settings.cb_reorder_banner_heading || "Reordering from an older order?"}
                        onInput={(e: any) => updateSetting("cb_reorder_banner_heading", e.target.value)}
                      />

                      <s-text-area
                        label="Reorder Banner Description ({{order_id}}, {{click_here}})"
                        rows={4}
                        value={settings.cb_reorder_banner_description || ""}
                        onInput={(e: any) => updateSetting("cb_reorder_banner_description", e.target.value)}
                        placeholder="Because we’ve upgraded our website..."
                      />

                      <s-text-field
                        label="Helpful Reorder Link (Override)"
                        value={settings.external_reorder_link || ""}
                        onInput={(e: any) => updateSetting("external_reorder_link", e.target.value)}
                      />
                    </s-stack>
                  </s-box>
                  

                </>
              )}

              {activeTab === "track-order" && (
                <>
                  <s-heading>{ "Track Order Settings" }</s-heading>
                  
                  <s-box background="base" border="base" borderRadius="large" padding="base">
                    <s-stack gap="base">
                      <s-heading>Reorder Action</s-heading>
                      <s-text>Configure reorder behavior on the Track Your Orders page.</s-text>
                      
                      <s-divider />
                      
                      <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                        <s-stack gap="none">
                          <s-text type="strong">Hide Reorder Button</s-text>
                          <s-text>Remove the Reorder action button from the Track Your Orders page.</s-text>
                        </s-stack>
                        <s-checkbox 
                          checked={settings.cb_hide_track_order_reorder === true} 
                          onChange={(e: any) => updateSetting("cb_hide_track_order_reorder", e.target.checked)} 
                        />
                      </s-stack>
                    </s-stack>
                  </s-box>
                </>
              )}

              {activeTab === "promotional-banner" && (
                <s-stack gap="base">
                  <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                    <s-heading>Promotional Banners</s-heading>
                    {(settings.cb_promotional_banners?.length || 0) < 3 && (
                      <s-button onClick={addBanner} variant="primary" icon="plus">Add Banner</s-button>
                    )}
                  </s-stack>

                  <s-stack direction="block" gap="base">
                    {((settings.cb_promotional_banners?.length === 0 && settings.cb_promotional_banner_image_url) ? [
                      {
                        enable: settings.cb_promotional_banner_enable || false,
                        imageUrl: settings.cb_promotional_banner_image_url || "",
                        link: settings.cb_promotional_banner_link || "",
                        position: settings.cb_promotional_banner_position || "top"
                      }
                    ] : (settings.cb_promotional_banners || [])).map((banner: any, index: number) => (
                      <s-box key={index} background="base" border="base" borderRadius="large" padding="base">
                        <s-stack gap="base">
                          <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                            <s-text type="strong">Banner #{index + 1} (Recommended banner size: 1120 × 370 px.)</s-text>
                            <s-stack direction="inline" gap="small" alignItems="center">
                               <s-checkbox 
                                checked={banner.enable === true} 
                                onChange={(e: any) => updateBanner(index, "enable", e.target.checked)} 
                              />
                              <s-button variant="tertiary" tone="critical" onClick={() => removeBanner(index)} icon="delete" />
                            </s-stack>
                          </s-stack>
                          <s-divider />

                          <s-text-field
                            label="Banner Image URL"
                            value={banner.imageUrl || ""}
                            onInput={(e: any) => updateBanner(index, "imageUrl", e.target.value)}
                            placeholder="https://cdn.shopify.com/..."
                          />
                          
                          {banner.imageUrl && (
                            <s-box borderRadius="large" overflow="hidden" padding="none" inlineSize="auto" maxInlineSize="100%" border="none">
                              <s-image 
                                src={banner.imageUrl} 
                                alt={`Banner ${index + 1} Preview`} 
                                objectFit="contain"
                                inlineSize="auto"
                              />
                            </s-box>
                          )}

                          <s-text-field
                            label="Banner Link URL"
                            value={banner.link || ""}
                            onInput={(e: any) => updateBanner(index, "link", e.target.value)}
                            placeholder="https://eyesupply.co.za/collections/..."
                          />

                          <s-select 
                            label="Banner Position" 
                            value={banner.position || "top"} 
                            onInput={(e: any) => updateBanner(index, "position", e.target.value)}
                          >
                            <s-option value="top">Top (Above Welcome Banner)</s-option>
                            <s-option value="middle">Middle (Between Stats and Navigation)</s-option>
                            <s-option value="bottom">Bottom (Below Navigation sections)</s-option>
                          </s-select>
                        </s-stack>
                      </s-box>
                    ))}
                  </s-stack>

                  {(settings.cb_promotional_banners?.length || 0) === 0 && !settings.cb_promotional_banner_image_url && (
                    <s-box background="subdued" padding="extra-large" borderRadius="large" border="base">
                      <s-stack gap="base" alignItems="center">
                        <s-text tone="neutral">No promotional banners configured.</s-text>
                        <s-button onClick={addBanner} variant="primary">Add your first banner</s-button>
                      </s-stack>
                    </s-box>
                  )}
                </s-stack>
              )}

              {activeTab === "error-handling" && (
                <>
                  <s-heading>{ "Error Handling & Fallbacks" }</s-heading>
                  <s-box background="base" border="base" borderRadius="large" padding="base">
                    <s-stack gap="base">
                      <s-heading>Data Fallbacks</s-heading>
                      <s-text>Customize the text that appears when data is missing or loading.</s-text>
                      <s-divider />
                      <s-grid gridTemplateColumns="@container (inline-size > 480px) 1fr 1fr, 1fr" gap="base">
                        <s-text-field
                          label="Global: 'Not Provided' text (Fallback)"
                          value={settings.cb_fallback_not_provided || ""}
                          onInput={(e: any) => updateSetting("cb_fallback_not_provided", e.target.value)}
                        />
                        <s-text-field
                          label="Order History: 'No orders yet' text"
                          value={settings.cb_fallback_no_orders || ""}
                          onInput={(e: any) => updateSetting("cb_fallback_no_orders", e.target.value)}
                        />
                      </s-grid>
                      <s-grid gridTemplateColumns="@container (inline-size > 480px) 1fr 1fr, 1fr" gap="base">
                        <s-text-field
                          label="Stat Card: '0 orders' text"
                          value={settings.cb_fallback_0_orders || ""}
                          onInput={(e: any) => updateSetting("cb_fallback_0_orders", e.target.value)}
                        />
                         <s-text-field
                          label="Stat Card: '0 days remaining' text"
                          value={settings.cb_fallback_0_days || ""}
                          onInput={(e: any) => updateSetting("cb_fallback_0_days", e.target.value)}
                        />
                      </s-grid>
                      <s-grid gridTemplateColumns="@container (inline-size > 480px) 1fr 1fr, 1fr" gap="base">
                        <s-text-field
                          label="Loyalty: 'Points Loading' text"
                          value={settings.cb_fallback_points_loading || ""}
                          onInput={(e: any) => updateSetting("cb_fallback_points_loading", e.target.value)}
                        />
                        <s-text-field
                          label="Loyalty: '0 points' text"
                          value={settings.cb_fallback_0_points || ""}
                          onInput={(e: any) => updateSetting("cb_fallback_0_points", e.target.value)}
                        />
                      </s-grid>
                      <s-grid gridTemplateColumns="@container (inline-size > 480px) 1fr 1fr, 1fr" gap="base">
                         <s-text-field
                          label="Prescription: Fallback Status"
                          value={settings.cb_fallback_prescription_completed || ""}
                          onInput={(e: any) => updateSetting("cb_fallback_prescription_completed", e.target.value)}
                        />
                      </s-grid>
                      <s-grid gridTemplateColumns="@container (inline-size > 480px) 1fr 1fr, 1fr" gap="base">
                        <s-text-field
                          label="Order Modal: 'No ongoing orders' text"
                          value={settings.cb_fallback_no_ongoing_orders || ""}
                          onInput={(e: any) => updateSetting("cb_fallback_no_ongoing_orders", e.target.value)}
                        />
                        <s-text-field
                          label="Prescription List: 'No prescriptions' text"
                          value={settings.cb_fallback_no_prescriptions || ""}
                          onInput={(e: any) => updateSetting("cb_fallback_no_prescriptions", e.target.value)}
                        />
                      </s-grid>
                      <s-grid gridTemplateColumns="@container (inline-size > 480px) 1fr 1fr, 1fr" gap="base">
                        <s-text-field
                          label="Search: 'No items found' text"
                          value={settings.cb_fallback_no_items_found || ""}
                          onInput={(e: any) => updateSetting("cb_fallback_no_items_found", e.target.value)}
                        />
                      </s-grid>
                    </s-stack>
                  </s-box>
                </>
              )}

              {DEFAULT_NAV.sections.map((navSection: any) => {
                if (activeTab !== navSection.id) return null;
                const currentSection = (settings.sections && settings.sections[navSection.id]) || { title: "", links: [] };
                
                return (
                  <s-stack key={navSection.id} gap="base">
                    <s-heading>{navSection.title} Settings</s-heading>
                    
                    <s-box background="base" border="base" borderRadius="large" padding="base">
                      <s-stack gap="base">
                        <s-text type="strong">Section Content</s-text>
                        <s-text-field
                          label="Section Title"
                          value={currentSection.title || ""}
                          onInput={(e: any) => updateSectionTitle(navSection.id, e.target.value)}
                          placeholder={navSection.title}
                        />
                        <s-divider />
                        <s-text-field
                            label={`${navSection.title} Icon URL`}
                            value={settings[`cb_${navSection.id}_icon_url`] || ""}
                            onInput={(e: any) => updateSetting(`cb_${navSection.id}_icon_url`, e.target.value)}
                            placeholder="https://example.com/icon.png (Recommended size: 24px x 24px)"
                        />
                        {navSection.id === 'reviews' && (
                          <>
                            <s-divider />
                            <s-text-field
                                label="Review Subheading"
                                value={settings.cb_review_subheading || ""}
                                onInput={(e: any) => updateSetting("cb_review_subheading", e.target.value)}
                                placeholder="Earn rewards when you leave a review"
                            />
                            <s-divider />
                            <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                              <s-stack gap="none">
                                <s-text type="strong">Show Review Products List</s-text>
                                <s-text>Display the list of products for customers to review directly on the dashboard.</s-text>
                              </s-stack>
                              <s-checkbox 
                                checked={settings.cb_show_review_products !== false} 
                                onChange={(e: any) => updateSetting("cb_show_review_products", e.target.checked)} 
                              />
                            </s-stack>
                          </>
                        )}
                      </s-stack>
                    </s-box>
                    
                    <s-box background="subdued" border="base" borderRadius="large" padding="base">
                      <s-stack gap="base">
                        <s-stack direction="inline" gap="small" alignItems="center">
                          <s-icon type="info" />
                          <s-text type="strong">Quick Reference: Standard URLs</s-text>
                        </s-stack>
                        <s-text>Copy and paste these URLs into the "URL / Destination Override" field below to link to specific pages:</s-text>
                        
                        <s-grid gridTemplateColumns="@container (inline-size > 500px) 1fr 1fr, 1fr" gap="small">
                          {[
                            { label: "Account Profile", url: "shopify://customer-account/profile" },
                            { label: "Order History", url: "shopify://customer-account/orders" },
                            { label: "View Prescriptions", url: "extension:custom-profile-page/view-prescription" },
                            { label: "Track Order", url: "extension:custom-profile-page/track-order" }
                          ].map((ref) => (
                            <s-box key={ref.url} background="base" border="base" borderRadius="base" padding="small">
                              <s-stack gap="none">
                                <s-text type="strong">{ref.label}</s-text>
                                <s-text tone="neutral">{ref.url}</s-text>
                              </s-stack>
                            </s-box>
                          ))}
                        </s-grid>
                      </s-stack>
                    </s-box>

                    {navSection.links.map((link: any, idx: number) => {
                      const currentLink = (currentSection.links && currentSection.links[idx]) || {};
                      return (
                        <s-box key={idx} background="base" border="base" borderRadius="large" padding="base">
                          <s-stack gap="base">
                            <s-text type="strong">Link: {link.label}</s-text>
                            <s-stack gap="small">
                              <s-text-field
                                label={`Label (Default: ${link.label})`}
                                value={currentLink.label || ""}
                                onInput={(e: any) => updateLinkLabel(navSection.id, idx, e.target.value)}
                                placeholder={link.label}
                              />
                              <s-grid gridTemplateColumns="@container (inline-size > 480px) 1fr 1fr, 1fr" gap="small">
                                <s-select 
                                  label="Action Type" 
                                  value={currentLink.action || "link"} 
                                  onInput={(e: any) => updateLinkAction(navSection.id, idx, e.target.value)}
                                >
                                  <s-option value="link">Standard Link</s-option>
                                  <s-option value="reorder">Reorder Action</s-option>
                                  <s-option value="modal">Trigger Modal</s-option>
                                </s-select>
                                {currentLink.action === 'modal' ? (
                                  <s-select
                                    label="Select Modal to Open"
                                    value={currentLink.commandFor || ""}
                                    onInput={(e: any) => updateLinkCommandFor(navSection.id, idx, e.target.value)}
                                  >
                                    <s-option value="">Select a modal...</s-option>
                                    <s-option value="medical-aid-modal">Medical Aid Details</s-option>
                                    <s-option value="all-orders-modal">Track Your Orders (List)</s-option>
                                    <s-option value="order-line-items-modal">Order Line Items</s-option>
                                    <s-option value="reviews-modal">Product Reviews</s-option>
                                  </s-select>
                                ) : (
                                  <s-text-field
                                    label="URL / Destination Override"
                                    disabled={currentLink.action === 'reorder'}
                                    value={currentLink.href || ""}
                                    onInput={(e: any) => updateLinkHref(navSection.id, idx, e.target.value)}
                                    placeholder={currentLink.action === 'reorder' ? "Trigger automated reorder" : (link.href || "Enter custom URL")}
                                  />
                                )}
                              </s-grid>
                            </s-stack>
                          </s-stack>
                        </s-box>
                      );
                    })}
                  </s-stack>
                );
              })}

              {activeTab === 'quick-actions' && (
                <s-stack direction="block" gap="large">
                  <s-box background="base" borderRadius="base" padding="base" border="base">
                    <s-stack direction="block" gap="base">
                      <s-heading>Most Recent Order Card</s-heading>
                      <s-text-field
                        label="Card Title"
                        value={settings.cb_stat_recent_order_title || ""}
                        onInput={(e: any) => updateSetting("cb_stat_recent_order_title", e.target.value)}
                      />
                      <s-grid gridTemplateColumns="@container (inline-size > 480px) 1fr 1fr, 1fr" gap="base">
                        <s-text-field
                          label="Reorder Button Label"
                          value={settings.cb_stat_reorder_btn_label || ""}
                          onInput={(e: any) => updateSetting("cb_stat_reorder_btn_label", e.target.value)}
                        />
                        <s-text-field
                          label="Past Orders Button Label"
                          value={settings.cb_stat_past_orders_btn_label || ""}
                          onInput={(e: any) => updateSetting("cb_stat_past_orders_btn_label", e.target.value)}
                        />
                      </s-grid>
                      <s-grid gridTemplateColumns="@container (inline-size > 480px) 1fr 1fr, 1fr" gap="base">
                        <s-grid-item>
                          <s-stack gap="base">
                            <s-text type="strong">Visibility</s-text>
                            
                            <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                              <s-text>Show Reorder Button</s-text>
                              <s-checkbox 
                                checked={settings.cb_stat_show_reorder_btn !== false} 
                                onChange={(e: any) => updateSetting("cb_stat_show_reorder_btn", e.target.checked)} 
                              />
                            </s-stack>

                            <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                              <s-text>Show Past Orders Link</s-text>
                              <s-checkbox 
                                checked={settings.cb_stat_show_past_orders_btn !== false} 
                                onChange={(e: any) => updateSetting("cb_stat_show_past_orders_btn", e.target.checked)} 
                              />
                            </s-stack>
                          </s-stack>
                        </s-grid-item>
                      </s-grid>
                    </s-stack>
                  </s-box>

                  <s-box background="base" borderRadius="base" padding="base" border="base">
                    <s-stack direction="block" gap="base">
                      <s-heading>Days Till Run Out Card</s-heading>
                      <s-text-field
                        label="Covered Until Text"
                        value={settings.cb_stat_covered_until_text || ""}
                        onInput={(e: any) => updateSetting("cb_stat_covered_until_text", e.target.value)}
                      />
                      <s-grid gridTemplateColumns="@container (inline-size > 480px) 1fr 1fr, 1fr" gap="base">
                        <s-text-field
                          label="Days Remaining Text"
                          value={settings.cb_stat_days_remaining_text || ""}
                          onInput={(e: any) => updateSetting("cb_stat_days_remaining_text", e.target.value)}
                        />
                        <s-text-field
                          label="Reorder Button Label"
                          value={settings.cb_stat_reorder_now_btn_label || ""}
                          onInput={(e: any) => updateSetting("cb_stat_reorder_now_btn_label", e.target.value)}
                        />
                      </s-grid>
                      <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                        <s-stack gap="none">
                          <s-text type="strong">Show Reorder now Button</s-text>
                        </s-stack>
                        <s-checkbox 
                          checked={settings.cb_stat_show_reorder_now_btn !== false} 
                          onChange={(e: any) => updateSetting("cb_stat_show_reorder_now_btn", e.target.checked)} 
                        />
                      </s-stack>
                    </s-stack>
                  </s-box>

                  <s-box background="base" borderRadius="base" padding="base" border="base">
                    <s-stack direction="block" gap="base">
                      <s-heading>Other Cards</s-heading>
                      <s-grid gridTemplateColumns="@container (inline-size > 480px) 1fr 1fr, 1fr" gap="base" gridTemplateRows="auto auto">
                        <s-text-field
                          label="Loyalty Points Title"
                          value={settings.cb_stat_loyalty_title || ""}
                          onInput={(e: any) => updateSetting("cb_stat_loyalty_title", e.target.value)}
                        />
                        <s-text-field
                          label="Prescription Expiry Title"
                          value={settings.cb_stat_prescription_title || ""}
                          onInput={(e: any) => updateSetting("cb_stat_prescription_title", e.target.value)}
                        />
                        <s-text-field
                          label="Earn & Redeem Link Text"
                          value={settings.cb_stat_loyalty_link_text || ""}
                          onInput={(e: any) => updateSetting("cb_stat_loyalty_link_text", e.target.value)}
                        />
                        <s-text-field
                          label="Rewards Page URL"
                          value={settings.cb_rewards_page_url || ""}
                          onInput={(e: any) => updateSetting("cb_rewards_page_url", e.target.value)}
                        />
                      </s-grid>
                    </s-stack>
                  </s-box>

                  <s-box background="base" border="base" borderRadius="large" padding="base">
                    <s-stack gap="base">
                      <s-heading>Dashboard Card Icons</s-heading>
                      <s-text>Custom images for the summary cards at the top of your dashboard. (Recommended size: 24px x 24px).</s-text>
                      
                      <s-divider />

                      <s-grid gridTemplateColumns="@container (inline-size > 480px) 1fr 1fr, 1fr" gap="base">
                        <s-text-field
                          label="Recent Order Icon URL"
                          value={settings.cb_recent_order_icon_url || ""}
                          onInput={(e: any) => updateSetting("cb_recent_order_icon_url", e.target.value)}
                        />
                        <s-text-field
                          label="Days Till Run Out Icon URL"
                          value={settings.cb_days_run_out_icon_url || ""}
                          onInput={(e: any) => updateSetting("cb_days_run_out_icon_url", e.target.value)}
                        />
                      </s-grid>

                      <s-grid gridTemplateColumns="@container (inline-size > 480px) 1fr 1fr, 1fr" gap="base">
                        <s-text-field
                          label="Rewards Card Icon URL"
                          value={settings.cb_rewards_card_icon_url || ""}
                          onInput={(e: any) => updateSetting("cb_rewards_card_icon_url", e.target.value)}
                        />
                        <s-text-field
                          label="Prescription Icon URL"
                          value={settings.cb_prescription_icon_url || ""}
                          onInput={(e: any) => updateSetting("cb_prescription_icon_url", e.target.value)}
                        />
                      </s-grid>
                    </s-stack>
                  </s-box>

                </s-stack>
              )}

              {/* Save Button Container */}
              <s-box paddingBlockStart="large">
                <s-stack alignItems="center">
                  <s-button type="submit" variant="primary" loading={isSaving}>
                    {isSaving ? "Saving settings..." : "Save all adjustments"}
                  </s-button>
                </s-stack>
              </s-box>
            </s-stack>
          </s-grid-item>
        </s-grid>
        </s-query-container>
      </Form>
    </s-page>
  );
}