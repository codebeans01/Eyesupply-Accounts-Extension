export const SHOP_DOMAIN_QUERY = `
  query {
    shop {
      myshopifyDomain
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