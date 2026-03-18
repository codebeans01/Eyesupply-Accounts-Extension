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
      orders(first: $ordersFirst, reverse: true) {
        nodes {
          id
          name
          processedAt
          fulfillmentStatus
          totalPrice {
            amount
            currencyCode
          }
          # Placeholder for order metafields - Add more as needed
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
              image {
                url
              }
              productId
              totalPrice {
                amount
                currencyCode
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