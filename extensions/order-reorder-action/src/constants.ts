import { DashboardSettings } from "./interface";

export const API_VERSION = "2026-01"
export const APP_URL = "https://admitted-overall-lincoln-outline.trycloudflare.com";

export const DEFAULT_SETTINGS: DashboardSettings = {
  cb_welcome_image_url: "",
  cb_review_google_url: "https://google.com",
  cb_review_facebook_url: "https://facebook.com",
  cb_review_target: "reviews-modal",
  cb_support_faq_url: "mailto:support@eyesupply.co.uk",
  cb_support_contact_url: "mailto:support@eyesupply.co.uk",
  cb_reward_refferal_url: "#",
  cb_reward_redeem_points_url: "#",
  exclude_trial_pack: false,
  exclude_variant_ids: "",
  external_reorder_link: "",
  cb_reorder_button_position: "bottom-right",
  cb_search_enable: true,
  cb_show_default_nav: true,
  sections: {}
};