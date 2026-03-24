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