export interface Money {
  amount: string;
  currencyCode: string;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: any[];
  extensions?: any;
}
