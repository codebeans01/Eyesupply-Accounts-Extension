export interface ApiProps {
  api: any;
}

export interface Money {
  amount: string;
  currencyCode: string;
}

export interface LineItem {
  id: string;
  name: string;
  quantity: number;
  variantTitle: string | null;
  variantId: string | null;
  sku: string | null;
  productId: string | null;
  productHandle?: string | null;
  image: {
    url: string;
  } | null;
  totalPrice: Money;
  variantOptions: Array<{ name: string; value: string }>;
  customAttributes: Array<{ key: string; value: string }>;
}

export interface Order {
  id: string;
  name: string;
  processedAt: string;
  fulfillmentStatus: string; // optionally narrow to enum
  financialStatus: string;
  totalPrice: Money;
  lineItems: LineItem[];
  daysTillRunOut?: string | null;
}

export interface CustomerSummary {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  medicalAidNumber?: string | null;
  medicalAidPlan?: string | null;
  medicalAidName?: string | null;
  patientIdNumber?: string | null;
  daysTillRunOut?: string | null;
  prescription?: Prescription | null;
  prescriptions?: Prescription[];
  prescriptionPageInfo?: PageInfo;
  tags?: string[];
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface LoadCustomerDataResult {
  customer: CustomerSummary | null;
  orders: Order[];
  myshopifyDomain: string;
}

export interface LoadCustomerDataParams {
  ordersLimit?: number;
  lineItemsLimit?: number;
}

// Optional: strongly typed GraphQL response
export interface GraphQLError {
  message: string;
  extensions?: {
    code?: string;
    [key: string]: any;
  };
}

export interface CustomerDataQueryResponse {
  customer: {
    firstName: string | null;
    lastName: string | null;
    emailAddress?: {
      emailAddress: string | null;
    } | null;
    phoneNumber?: {
      phoneNumber: string | null;
    } | null;
    orders: {
      nodes: Array<{
        id: string;
        name: string;
        processedAt: string;
        fulfillmentStatus: string;
        financialStatus: string;
        totalPrice: Money;
        lineItems: {
          nodes: Array<{
            id: string;
            name: string;
            quantity: number;
            variantTitle: string | null;
            variantId: string | null;
            sku: string | null;
            productId: string | null;
            image: {
              url: string;
            } | null;
            totalPrice: Money;
          }>;
        };
      }>;
    };
    tags: string[];
    metafields: Array<{
      namespace: string;
      key: string;
      value: string;
      type: string;
      reference?: {
        __typename: string;
        id: string;
        handle: string;
        type: string;
        status?: { value: string };
        expiryDate?: { value: string };
        imagePdfUrl?: { value: string };
      }; 
      references?: {
        nodes: Array<{
          __typename: string;
          id: string;
          handle: string;
          type: string;
          status?: { value: string };
          expiryDate?: { value: string };
          imagePdfUrl?: { value: string };
        }>;
        pageInfo: PageInfo;
      };
    }>;
  } | null;
}

export interface SmileCustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  points_balance: number;
}

export interface SmilePointsResponse {
  customer?: SmileCustomer;
  error?: string;
}
export interface Prescription {
  id: string;
  status: string;
  expiry_date?: string;
  image_url?: string;
  image_urls?: string[];
  entry_status?: string;
  customer_email?: string;
  handle?: string;
  updatedAt?: string;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: any;
}

export interface RetryConfig {
  retries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  timeoutMs?: number
  log?: boolean
}

export interface ShopifyFetchResult<T = unknown> {
  data: T
  ok: boolean
  status: number
}

export interface ShopifyThrottleStatus {
  maximumAvailable: number
  currentlyAvailable: number
  restoreRate: number
}

export interface ShopifyCostExtension {
  requestedQueryCost: number
  actualQueryCost: number
  throttleStatus: ShopifyThrottleStatus
}

export interface NavLink {
  label: string;
  href?: string;
  action?: "link" | "reorder" | "modal";
  command?: string;
  commandFor?: string;
  dynamicSub?: string;
  tone?: string;
  sub?: string;
}

export interface CartItem {
  variantId: string; // ✅ Full GID format for Storefront API
  numericVariantId: string; // Kept for compatibility / fallback
  quantity: number;
  customAttributes: { key: string; value: string }[];
}

export interface MissingItem {
  name: string;
  image?: string;
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
  cb_rewards_icon_url?: string;
  cb_recent_order_icon_url?: string;
  cb_rewards_card_icon_url?: string;
  cb_prescription_icon_url?: string;
  cb_days_run_out_icon_url?: string;
  cb_review_subheading?: string;
  cb_show_default_nav: boolean;
  cb_show_review_products: boolean;
  cb_promotional_banner_enable?: boolean;
  cb_promotional_banner_image_url?: string;
  cb_promotional_banner_link?: string;
  cb_promotional_banner_position?: "top" | "middle" | "bottom";
  cb_banner_enabled?: boolean;
  cb_banner_title?: string;
  cb_banner_subtitle?: string;
  cb_banner_image_url?: string;
  cb_show_default_nav_links?: boolean;
  cb_reorder_banner_heading?: string;
  cb_reorder_banner_description?: string;
  section_order?: string[] | string;
  cb_hide_track_order_reorder?: boolean;
  cb_stat_recent_order_title?: string;
  cb_stat_reorder_btn_label?: string;
  cb_stat_past_orders_btn_label?: string;
  cb_stat_show_reorder_btn?: boolean;
  cb_stat_show_past_orders_btn?: boolean;
  cb_stat_show_reorder_now_btn?: boolean;
  cb_stat_covered_until_text?: string;
  cb_stat_days_remaining_text?: string;
  cb_stat_reorder_now_btn_label?: string;
  cb_stat_loyalty_title?: string;
  cb_stat_loyalty_link_text?: string;
  cb_stat_prescription_title?: string;
  cb_rewards_page_url?: string;
  cb_fallback_not_provided?: string;
  cb_fallback_no_orders?: string;
  cb_fallback_points_loading?: string;
  cb_fallback_0_points?: string;
  cb_fallback_0_orders?: string;
  cb_fallback_prescription_completed?: string;
  cb_fallback_0_days?: string;
  cb_fallback_no_ongoing_orders?: string;
  cb_fallback_no_prescriptions?: string;
  cb_fallback_no_items_found?: string;
  sections?: Record<string, {
    id: string;
    title?: string;
    icon?: string;
    links?: NavLink[];
  }>;
}

export interface ReorderResult {
  redirectUrl: string | null;
  missingItems: MissingItem[];
  orderName?: string;
}


export interface OrderStatusHistoryItem {
  changed_at: string;
  changed_at_formatted?: string;
  changed_by: string;
  color: string;
  due_date: string | null;
  font_color: string;
  private_notes: string | null;
  public_name: string;
  public_notes: string | null;
  status_id: number;
  status_name: string;
}

export interface CustomOrderStatusResponse {
  success: boolean;
  orders: Record<string, {
    history?: OrderStatusHistoryItem[];
    [key: string]: any;
  }>;
}


export interface CustomOrderStatusData {
  public_name: string;
  history: OrderStatusHistoryItem[];
}

export interface OngoingOrder {
  id: string;
  name: string;
  createdAt: string;
  email: string;
  totalPrice: string;
  currencyCode: string;
  fulfillmentStatus: string;
  financialStatus: string;
  lineItemsCount: number;
  image: string | null;
  currentStatus: string | null;
}

export interface OngoingOrdersResponse {
  orders: OngoingOrder[];
  authenticated: boolean;
  statuses: any[];
}



export interface ModalsProps {
  ongoingOrders: Order[];
  customStatuses: Record<string, any>;
  reorderLoadingId: string | null;
  onReorder: (orderId: string, orderName: string, modalId: string) => void;
  api: any;
  selectedOrder: Order | null;
  lineItemsCount: number;
  cbSearchEnabled: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  showTopReorder: boolean;
  showBottomReorder: boolean;
  reorderButtonPosition: string;
  allReviewProducts: any[];
  storefrontBase: string;
  reviewTarget: string;
  isAllOrdersModalVisible: boolean;
  isLineItemsModalVisible: boolean;
  customer: CustomerSummary | null;
  fallbackNotProvided?: string;
  fallbackNoOngoingOrders?: string;
  fallbackNoItemsFound?: string;
}

export interface NavigationSectionsProps {
  sections: any[];
  resolveDynamicValue: (key: string) => string;
  resolveDynamicTone?: (key: string) => "neutral" | "success" | "warning" | "critical" | "info" | "custom";
  reviewProducts: any[];
  allReviewProductsCount: number;
  REVIEW_PAGE_SIZE: number;
  remainingReviewCount: number;
  storefrontBase: string;
  reviewTarget: string;
  onReorder?: (id: string, name: string) => void;
  reorderLoadingId?: string | null;
  lastOrder?: any;
  showReviewProducts?: boolean;
  reviewSubheading?: string;
}

export interface DashboardBannerProps {
  bannerEnabled: boolean;
  bannerTitle: string;
  bannerSubtitle: string;
  bannerImageUrl: string;
  showReorderWarning: boolean;
  reorderBannerHeading?: string;
  reorderBannerDescription?: string;
  olderOrderName: string | null;
  api: any;
  externalReorderLink: string | null;
}

export interface StatCardsProps {
  orders: any[];
  recentOrderItemsCount: number;
  daysRemaining: number | null;
  reorderLoadingId: string | null;
  onReorder: (id: string, name: string) => void;
  onShowRecentOrderDetails: () => void;
  // From original StatCards
  pointsDisplay: string;
  prescriptionExpiry: string;
  tags: string[];
  ordersCount: number;
  recentOrderIconUrl?: string;
  rewardsCardIconUrl?: string;
  prescriptionIconUrl?: string;
  daysRunOutIconUrl?: string;
  statRecentOrderTitle?: string;
  statReorderBtnLabel?: string;
  statPastOrdersBtnLabel?: string;
  statShowReorderBtn?: boolean;
  statShowPastOrdersBtn?: boolean;
  statShowReorderNowBtn?: boolean;
  statCoveredUntilText?: string;
  statDaysRemainingText?: string;
  statReorderNowBtnLabel?: string;
  statLoyaltyTitle?: string;
  statLoyaltyLinkText?: string;
  statPrescriptionTitle?: string;
  rewardsPageUrl?: string;
  fallbackNotProvided?: string;
  fallback0Points?: string;
  fallback0Days?: string;
  fallbackNoOrders?: string;
  fallback0Orders?: string;
  fallbackPrescriptionCompleted?: string;
  points?: number | null;
}


