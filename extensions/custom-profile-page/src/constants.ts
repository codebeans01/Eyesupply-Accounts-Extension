import { type DashboardSettings } from "./interface";

export const API_VERSION = "2026-01";
export const APP_URL = "https://admitted-overall-lincoln-outline.trycloudflare.com";

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;

export const RETRY_DELAYS = [
  10 * SECOND,
  1 * MINUTE,
  5 * MINUTE,
  10 * MINUTE,
  15 * MINUTE
];

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
  cb_reorder_banner_heading: "Reordering from an older order?",
  cb_reorder_banner_description: "Because we’ve upgraded our website...",
  sections: {}
};

export const LAYOUT_768_2COL = "@container (inline-size \x3e 768px) 1fr auto, 1fr";
export const LAYOUT_448_2COL = "@container (inline-size \x3e 448px) repeat(2, 1fr), 1fr";
export const LAYOUT_768_3COL = "@container (inline-size \x3e 768px) 1fr 1fr auto, 1fr";
export const LAYOUT_768_4COL = "@container (inline-size \x3e 768px) auto 1fr auto, auto 1fr";
export const LAYOUT_768_ORDER_LIST = "@container (inline-size \x3e 768px) 100px 1fr 120px 120px 80px, 1fr";
export const LAYOUT_768_PRESCRIPTION_LIST = "@container (inline-size \x3e 768px) 1fr auto, 1fr";
export const LAYOUT_768_2COL_STACK = "@container (inline-size \x3e 768px) 1fr 1fr, 1fr";
export const LAYOUT_768_4COL_BLOCK = "@container (inline-size \x3e 768px) auto 1fr auto, block";
export const LAYOUT_600_2COL = "@container (inline-size \x3e 600px) 1fr 1fr, 1fr";
export const LAYOUT_600_4COL = "@container (inline-size \x3e 600px) auto 1fr auto 1fr, 1fr";
export const LAYOUT_500_3COL = "@container (inline-size \x3e 500px) auto 1fr auto, 1fr";
export const SIZE_600_RESP_200 = "@container (inline-size \x3e 600px) 200px, 80px";
export const SIZE_600_RESP_100 = "@container (inline-size \x3e 600px) 100px, 80px";
export const DISPLAY_768_GRID = "@container (inline-size \x3e 768px) grid, none";
export const DISPLAY_768_NONE_GRID = "@container (inline-size \x3e 768px) none, grid";
 
export const REVIEW_PAGE_SIZE = 5;
