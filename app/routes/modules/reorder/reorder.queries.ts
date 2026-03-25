export const ORDER_LINE_ITEMS_QUERY = `
  query getOrder($id: ID!) {
    order(id: $id) {
      lineItems(first: 50) {
        nodes {
          name
          title
          image { url }
          variant { id }
          quantity
          customAttributes { key value }
        }
      }
    }
  }
`;
