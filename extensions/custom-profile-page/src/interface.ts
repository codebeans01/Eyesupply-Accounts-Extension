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
  totalPrice: Money;
  lineItems: LineItem[];
  daysTillRunOut?: string | null;
}

export interface CustomerSummary {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
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
    daysTillRunOut?: {
      value: string;
    } | null;
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
export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: any;
}