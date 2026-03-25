export interface LineItem {
  name: string;
  title: string;
  image?: { url: string };
  variant?: { id: string };
  quantity: number;
  customAttributes: { key: string; value: string }[];
}

export interface MissingItem {
  name: string;
  image?: string;
}

export interface CartItem {
  numericVariantId: string;
  quantity: number;
  customAttributes: { key: string; value: string }[];
}

export interface ReorderResult {
  redirectUrl: string | null;
  missingItems: MissingItem[];
}
