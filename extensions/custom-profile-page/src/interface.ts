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
interface GraphQLError {
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
  cb_show_default_nav: boolean;
  cb_banner_enabled?: boolean;
  cb_banner_title?: string;
  cb_banner_subtitle?: string;
  cb_banner_image_url?: string;
  cb_show_default_nav_links?: boolean;
  cb_reorder_banner_heading?: string;
  cb_reorder_banner_description?: string;
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

export interface ReorderResult {
  redirectUrl: string | null;
  missingItems: MissingItem[];
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
