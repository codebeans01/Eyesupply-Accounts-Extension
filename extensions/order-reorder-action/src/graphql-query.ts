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
      name
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

export const CART_CREATE_MUTATION = `#graphql
  mutation cartCreate($input: CartInput) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;


export const SETTINGS_QUERY = `
  query {
    shop {
      metafield(namespace: "eyesupply_dashboard", key: "settings") {
        value
      }
    }
  }
`;