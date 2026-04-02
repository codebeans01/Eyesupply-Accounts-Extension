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
        { label: "Reorder", href: "#" },
        { label: "Past Orders", href: "#" },
        { label: "Invoices", href: "#" }
      ]
    },
    {
      id: "prescription",
      title: "Prescription",
      links: [
        { label: "Current Prescription Status", href: "#" },
        { label: "All Prescription", href: "#" },
        { label: "Upload My Prescription", href: "#" }
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
      id: "medical_aid",
      title: "Medical Aid",
      links: [
        { label: "Medical Aid Number", href: "" },
        { label: "Medical Aid Plan", href: "" },
        { label: "Medical Aid Name", href: "" },
        { label: "Patient ID Number", href: "" }
      ]
    },
    {
      id: "profile",
      title: "Profile",
      links: [
        { label: "Personal Details", href: "#" },
        { label: "Address", href: "#" }
      ]
    },
    {
      id: "rewards",
      title: "Rewards",
      links: [
        { label: "My Loyalty Points", href: "" },
        { label: "Referral", href: "#" },
        { label: "How to Redeem Points", href: "#" }
      ]
    },
    {
      id: "reviews",
      title: "Reviews",
      links: [
        { label: "Review Us on Google", href: "https://google.com" },
        { label: "Review Us on Facebook", href: "https://facebook.com" },
        { label: "Review Products", href: "#" }
      ]
    },
    {
      id: "support",
      title: "Support",
      links: [
        { label: "FAQs", href: "/apps/faq" },
        { label: "Contact Us", href: "/apps/contact" }
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
  cb_show_default_nav: true
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
    { id: "prescription", label: "Prescription", icon: "note" },
    { id: "delivery", label: "Delivery", icon: "shipping-label" },
    { id: "medical_aid", label: "Medical Aid", icon: "profile" },
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

  const updateSetting = (key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [key]: value
    }));
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
                      <s-text type="strong" size="medium">Welcome Image & Branding</s-text>
                      
                      <s-text-field
                        label="Welcome Image URL"
                        value={settings.cb_welcome_image_url || ""}
                        onInput={(e: any) => updateSetting("cb_welcome_image_url", e.target.value)}
                        placeholder="https://cdn.shopify.com/..."
                      />
                      
                      {settings.cb_welcome_image_url && (
                        <s-box inlineSize="100%" borderRadius="base" overflow="hidden" border="base">
                          <s-image 
                            src={settings.cb_welcome_image_url} 
                            alt="Welcome Preview" 
                            objectFit="cover" 
                            style={{ width: "100%", maxHeight: "200px" }}
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
                      <s-text type="strong" size="medium">Reorder flow Configuration</s-text>
                      
                      <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                        <s-stack gap="none">
                          <s-text type="strong">Exclude Trial Packs</s-text>
                          <s-text tone="subdued">Prevent trial products from being reordered automatically.</s-text>
                        </s-stack>
                        <s-checkbox 
                          checked={settings.exclude_trial_pack === true} 
                          onChange={(e: any) => updateSetting("exclude_trial_pack", e.target.checked)} 
                        />
                      </s-stack>
                      
                      <s-divider />
                      
                      <s-stack gap="small" direction="inline" alignItems="end">
                       
                          <s-text-field
                            label="Exclude Variant IDs"
                            helpText="Comma separated IDs of variants to hide from reorder."
                            value={settings.exclude_variant_ids || ""}
                            onInput={(e: any) => updateSetting("exclude_variant_ids", e.target.value)}
                          />
                        
                        <s-button variant="secondary" onClick={handleSelectVariants}>
                          {"Browse"}
                        </s-button>
                      </s-stack>
                      
                      <s-text-field
                        label="Helpful Reorder Link (Override)"
                        helpText="Redirect users to a custom page for reordering."
                        value={settings.external_reorder_link || ""}
                        onInput={(e: any) => updateSetting("external_reorder_link", e.target.value)}
                      />

                      <s-select label="Reorder Button Position" value={settings.cb_reorder_button_position || "bottom_right"} onInput={(e: any) => updateSetting("cb_reorder_button_position", e.target.value)}>
                          <s-option value="bottom_right">Bottom Right</s-option>
                          <s-option value="bottom_left">Bottom Left</s-option>
                          <s-option value="top_right">Top Right</s-option>
                          <s-option value="top_left">Top Left</s-option>
                        </s-select>
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
                              <s-text-field
                                label="URL / Destination Override"
                                value={currentLink.href || ""}
                                onInput={(e: any) => updateLinkHref(navSection.id, idx, e.target.value)}
                                placeholder={link.href || "Enter custom URL"}
                              />
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
