import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useActionData, useLoaderData, useNavigation, Form } from "react-router";
import { authenticate } from "../shopify.server";
import { safeGraphql } from "../utils/graphqlHandler";

// Default navigation structure based on the dashboard screenshot
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
      title: "Rewards",
      links: [
        { label: "My EyeSupply Rewards", href: "#" },
        { label: "Use on your next order", href: "#" },
        { label: "Points", href: "#" },
        { label: "Earn more", href: "#" },
        { label: "Redeem", href: "#" }
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
    { id: "orders", label: "Orders", icon: "cart" },
    { id: "profile", label: "Profile", icon: "person" },
    { id: "prescription", label: "Prescription", icon: "note" },
    { id: "delivery", label: "Delivery", icon: "shipping-label" },
    { id: "medical-aid", label: "Medical Aid", icon: "profile" },
    { id: "rewards", label: "Rewards", icon: "star" },
    { id: "reviews", label: "Reviews", icon: "chat" },
    { id: "support", label: "Support", icon: "question-circle" },
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
      });

      if (selection) {
        const selectedIds = selection.map((v: any) => v.id.split("/").pop());
        const currentIds = settings.exclude_variant_ids 
          ? settings.exclude_variant_ids.split(",").map((s: string) => s.trim()) 
          : [];
        
        const combined = Array.from(new Set([...currentIds, ...selectedIds])).filter(Boolean).join(", ");
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
          <s-heading size="large">Settings</s-heading>
        </s-stack>
      </s-box>

      <Form method="post" data-save-bar>
        <input type="hidden" name="settings" value={JSON.stringify(settings)} />
        <input type="hidden" name="shopId" value={shopId} />
        
        <s-grid gridTemplateColumns="240px 1fr" gap="large" alignItems="start">
          {/* Sidebar Area - Unified premium container */}
          <s-grid-item>
            <s-box background="base" border="base" borderRadius="large" shadow="base" padding="base">
              <s-stack gap="base">
                {/* Store Identity Block */}
                <s-stack direction="inline" gap="base" alignItems="center">
                  <s-box background="subdued" borderRadius="base" padding="small" inlineSize="40px" blockSize="40px">
                    <s-stack alignItems="center" justifyContent="center" blockSize="100%">
                      <s-text type="strong" tone="neutral" size="large">{shopName.charAt(0).toUpperCase()}</s-text>
                    </s-stack>
                  </s-box>
                  <s-stack gap="none">
                    <s-text type="strong" size="small">{shopName}</s-text>
                    <s-text tone="subdued" size="small">{shopUrl.replace("https://", "")}</s-text>
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
                          <s-icon type={tab.icon} size="base" tone={activeTab === tab.id ? "info" : "neutral"} />
                          <s-text tone={activeTab === tab.id ? "info" : "neutral"} type={activeTab === tab.id ? "strong" : "regular"}>
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
                  
                  <s-box background="base" border="base" borderRadius="large" padding="base" shadow="base">
                    <s-stack gap="base">
                      <s-heading size="medium">Welcome Image & Branding</s-heading>
                      
                      <s-text-field
                        label="Welcome Image URL"
                        value={settings.cb_welcome_image_url || ""}
                        onInput={(e: any) => updateSetting("cb_welcome_image_url", e.target.value)}
                        placeholder="https://cdn.shopify.com/..."
                      />
                      
                      {settings.cb_welcome_image_url && (
                        <s-box inlineSize="fill" borderRadius="base" overflow="hidden" border="base">
                          <s-image 
                            src={settings.cb_welcome_image_url} 
                            alt="Welcome Preview" 
                            objectFit="cover"
                          />
                        </s-box>
                      )}
                      
                      <s-divider />
                      
                      <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                        <s-stack gap="none">
                          <s-text type="strong">Enable Search Bar</s-text>
                          <s-text tone="subdued">Show a search input on the customer dashboard.</s-text>
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
                          <s-text tone="subdued">Enable systemic links like Orders and Support.</s-text>
                        </s-stack>
                        <s-checkbox 
                          checked={settings.cb_show_default_nav !== false} 
                          onChange={(e: any) => updateSetting("cb_show_default_nav", e.target.checked)} 
                        />
                      </s-stack>
                    </s-stack>
                  </s-box>

                  <s-box background="base" border="base" borderRadius="large" padding="base" shadow="base">
                    <s-stack gap="base">
                      <s-heading size="medium">Dashboard Card Icons</s-heading>
                      <s-text tone="subdued">Custom images for the summary cards at the top of your dashboard. (Recommended size: 24px x 24px).</s-text>
                      
                      <s-divider />

                      <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                        <s-text-field
                          label="Recent Order Icon URL"
                          helpText="Recommended size: 24px x 24px"
                          value={settings.cb_recent_order_icon_url || ""}
                          onInput={(e: any) => updateSetting("cb_recent_order_icon_url", e.target.value)}
                        />
                        <s-text-field
                          label="Days Till Run Out Icon URL"
                          helpText="Recommended size: 24px x 24px"
                          value={settings.cb_days_run_out_icon_url || ""}
                          onInput={(e: any) => updateSetting("cb_days_run_out_icon_url", e.target.value)}
                        />
                      </s-grid>

                      <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                        <s-text-field
                          label="Rewards Card Icon URL"
                          helpText="Recommended size: 24px x 24px"
                          value={settings.cb_rewards_card_icon_url || ""}
                          onInput={(e: any) => updateSetting("cb_rewards_card_icon_url", e.target.value)}
                        />
                        <s-text-field
                          label="Prescription Icon URL"
                          helpText="Recommended size: 24px x 24px"
                          value={settings.cb_prescription_icon_url || ""}
                          onInput={(e: any) => updateSetting("cb_prescription_icon_url", e.target.value)}
                        />
                      </s-grid>
                    </s-stack>
                  </s-box>

                  <s-box background="base" border="base" borderRadius="large" padding="base" shadow="base">
                    <s-stack gap="base">
                      <s-heading size="medium">Dashboard Section Order</s-heading>
                      <s-text tone="subdued">Rearrange how sections appear on the customer dashboard grid (2 columns per row).</s-text>
                      
                      <s-divider />
                      
                      <s-stack gap="small">
                        {(settings.section_order || ["orders", "profile", "rewards", "prescription", "delivery", "medical-aid", "support", "reviews"]).map((sectionId: string, index: number, arr: string[]) => {
                          const tab = TABS.find(t => t.id === sectionId) || { label: sectionId, icon: "person" };
                          return (
                            <s-box key={sectionId} padding="small" background="subdued" borderRadius="base" border="base">
                              <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
                                <s-icon type={tab.icon} size="base" />
                                <s-text type="strong">{tab.label}</s-text>
                                <s-stack direction="inline" gap="extra-tight">
                                  <s-button 
                                    variant="tertiary" 
                                    disabled={index === 0} 
                                    onClick={() => moveSection(index, 'up')}
                                  >
                                    <s-icon type="arrow-up" size="small" />
                                  </s-button>
                                  <s-button 
                                    variant="tertiary" 
                                    disabled={index === arr.length - 1} 
                                    onClick={() => moveSection(index, 'down')}
                                  >
                                    <s-icon type="arrow-down" size="small" />
                                  </s-button>
                                </s-stack>
                              </s-grid>
                            </s-box>
                          );
                        })}
                      </s-stack>
                    </s-stack>
                  </s-box>

                  <s-box background="base" border="base" borderRadius="large" padding="base" shadow="base">
                    <s-stack gap="base">
                      <s-heading>Reorder flow Configuration</s-heading>
                    
                      <s-divider />
                      
                      <s-stack gap="small" direction="inline" alignItems="end">
                       
                          <s-text-field
                            label="Exclude Variant IDs"
                            helpText="Comma separated IDs of variants to hide from reorder."
                            value={settings.exclude_variant_ids || ""}
                            onInput={(e: any) => updateSetting("exclude_variant_ids", e.target.value)}
                          />
                        
                        
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

                  <s-box background="base" border="base" borderRadius="large" padding="base" shadow="base">
                    <s-stack gap="base">
                      <s-heading>Reorder Warning Banner</s-heading>
                      <s-divider />
                      
                      <s-text-field
                        label="Reorder Banner Heading"
                        value={settings.cb_reorder_banner_heading || "Reordering from an older order?"}
                        onInput={(e: any) => updateSetting("cb_reorder_banner_heading", e.target.value)}
                      />

                      <s-text-area
                        label="Reorder Banner Description"
                        rows={4}
                        value={settings.cb_reorder_banner_description || ""}
                        onInput={(e: any) => updateSetting("cb_reorder_banner_description", e.target.value)}
                        placeholder="Because we’ve upgraded our website..."
                      />

                      <s-text-field
                        label="Helpful Reorder Link (Override)"
                        helpText="Redirect users to a custom page for reordering."
                        value={settings.external_reorder_link || ""}
                        onInput={(e: any) => updateSetting("external_reorder_link", e.target.value)}
                      />
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
                    
                    <s-box background="base" border="base" borderRadius="large" padding="base" shadow="base">
                      <s-stack gap="base">
                        <s-text type="strong" size="medium">Section Content</s-text>
                        <s-text-field
                          label="Section Title Override"
                          value={currentSection.title || ""}
                          onInput={(e: any) => updateSectionTitle(navSection.id, e.target.value)}
                          placeholder={navSection.title}
                        />
                        {navSection.id === 'rewards' && (
                          <>
                            <s-divider />
                            <s-text-field
                                label="Rewards Icon URL"
                                helpText="Optionally provide an image URL to replace the default gift icon."
                                value={settings.cb_rewards_icon_url || ""}
                                onInput={(e: any) => updateSetting("cb_rewards_icon_url", e.target.value)}
                                placeholder="https://example.com/icon.png"
                            />
                          </>
                        )}
                        {navSection.id === 'reviews' && (
                          <>
                            <s-divider />
                            <s-text-field
                                label="Review Subheading"
                                helpText="Appears below the section title."
                                value={settings.cb_review_subheading || ""}
                                onInput={(e: any) => updateSetting("cb_review_subheading", e.target.value)}
                                placeholder="Earn rewards when you leave a review"
                            />
                            <s-divider />
                            <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                              <s-stack gap="none">
                                <s-text type="strong">Show Review Products List</s-text>
                                <s-text tone="subdued">Display the list of products for customers to review directly on the dashboard.</s-text>
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

                    {navSection.links.map((link: any, idx: number) => {
                      const currentLink = (currentSection.links && currentSection.links[idx]) || {};
                      return (
                        <s-box key={idx} background="base" border="base" borderRadius="large" padding="base" shadow="base">
                          <s-stack gap="base">
                            <s-text type="strong" size="small">Link: {link.label}</s-text>
                            <s-stack gap="small">
                              <s-text-field
                                label={`Label (Default: ${link.label})`}
                                value={currentLink.label || ""}
                                onInput={(e: any) => updateLinkLabel(navSection.id, idx, e.target.value)}
                                placeholder={link.label}
                              />
                              <s-grid gridTemplateColumns="1fr 1fr" gap="small">
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
      </Form>
    </s-page>
  );
}
