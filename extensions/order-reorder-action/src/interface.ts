export interface Money {
  amount: string;
  currencyCode: string;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: any[];
  extensions?: any;
}

export interface DashboardSettings {
  cb_welcome_image_url: string;
  cb_review_google_url: string;
  cb_review_facebook_url: string;
  cb_review_target: string;
  cb_support_faq_url: string;
  cb_support_contact_url: string;
  cb_reward_refferal_url: string;
  cb_reward_redeem_points_url: string;
  exclude_trial_pack: boolean;
  exclude_variant_ids: string;
  external_reorder_link: string;
  cb_reorder_button_position: string;
  cb_search_enable: boolean;
  cb_show_default_nav: boolean;
  cb_banner_enabled?: boolean;
  cb_banner_title?: string;
  cb_banner_subtitle?: string;
  cb_banner_image_url?: string;
  cb_show_default_nav_links?: boolean;
  sections?: Record<string, {
    id: string;
    title?: string;
    icon?: string;
    links?: Array<{
      label?: string;
      href?: string;
      command?: string;
      commandFor?: string;
      dynamicSub?: string;
    }>;
  }>;
}