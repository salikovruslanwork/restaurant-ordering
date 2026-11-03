import type { CartChangeKind, Cents, Id, MenuItem } from '@restaurant/contracts';

export interface CartLine {
  key: string;
  itemId: Id;
  name: string;
  quantity: number;
  customPrice: Cents | null;
  seenPrice: Cents;
}

export interface CartState {
  lines: CartLine[];
  discount: Cents;
}

export interface CartLineView {
  key: string;
  itemId: Id;
  name: string;
  quantity: number;
  seenPrice: Cents;
  unitPrice: Cents;
  lineTotal: Cents;
  isCustomPrice: boolean;
  issue: CartChangeKind | null;
  isBlocked: boolean;
}

export interface CartSummary {
  count: number;
  subtotal: Cents;
  discount: Cents;
  total: Cents;
  isDiscountReduced: boolean;
  hasBlockedLines: boolean;
}

export interface OpenPriceDialogData {
  item: MenuItem;
}

export interface OpenPriceChoice {
  price: Cents;
  quantity: number;
}

export interface MenuItemQuantity {
  item: MenuItem;
  quantity: number;
}

export interface QuantityChange {
  key: string;
  quantity: number;
}
