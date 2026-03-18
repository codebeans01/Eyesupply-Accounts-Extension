export type OrderNode = {
  id: string;
  name: string;
  processedAt: string;
  displayFulfillmentStatus: string;
  totalPrice: {
    amount: string;
    currencyCode: string;
  };
};