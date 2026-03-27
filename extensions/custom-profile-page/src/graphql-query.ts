export const CUSTOMER_DATA_QUERY = `
  query GetCustomerData($ordersFirst: Int!, $lineItemsFirst: Int!) {
    shop {
      myshopifyDomain
    }
    customer {
      firstName
      lastName
      emailAddress {
        emailAddress
      }
      phoneNumber {
        phoneNumber
      }
        metafields(identifiers: [
          {namespace: "custom", key: "medical_aid_number"},
          {namespace: "custom", key: "medical_aid_plan"},
          {namespace: "custom", key: "medical_aid_name"},
          {namespace: "custom", key: "patient_id_number"},
          {namespace: "custom", key: "customer_prescription"},
          {namespace: "custom", key: "prescription"},
          {namespace: "custom", key: "prescriptions"},
          {namespace: "custom", key: "prescription_validation_status"}
        ]) {
          namespace
          key
          value
          type
          # References details are now fetched via backend API
          references(first: 10) {
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      orders(first: $ordersFirst, reverse: true) {
        nodes {
          id
          name
          processedAt
          fulfillmentStatus
          financialStatus
          totalPrice {
            amount
            currencyCode
          }
          daysTillRunOut: metafield(namespace: "custom", key: "days_till_run_out") {
            value
          }
          lineItems(first: $lineItemsFirst) {
            nodes {
              id
              name
              quantity
              variantTitle
              variantId
              sku
              productType
              image {
                url
              }
              productId
              totalPrice {
                amount
              }
              variantOptions {
                name
                value
              }
              customAttributes {
                key
                value
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_PRESCRIPTIONS_PAGINATED = `
  query GetPrescriptionsPaginated($first: Int!, $after: String) {
    customer {
      metafields(identifiers: [
        {namespace: "custom", key: "customer_prescription"},
        {namespace: "custom", key: "prescription"},
        {namespace: "custom", key: "prescriptions"}
      ]) {
        value
        type
        # References details are now fetched via backend API
        references(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;


export const MEDIA_DETAILS_QUERY = `
  query GetMediaDetails($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on MediaImage {
        __typename
        id
        image {
          url
        }
      }
      ... on GenericFile {
        __typename
        id
        url
      }
    }
  }
`;

export const ORDER_LINE_ITEMS_QUERY = `
  query getOrder($orderId: ID!) {
    order(id: $orderId) {
      lineItems(first: 50) {
        nodes {
          id
          title
          name
          quantity
          image { url }
          customAttributes { key value }
          variantId       
          productId    
          sku
          productType    
        }
      }
    }
  }
`;