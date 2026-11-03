import type { Cents, Id, IsoDate } from './common.model.js';
import type { OrderStatus } from './order-status.enum.js';

export interface OrderLine {
  itemId: Id;
  name: string; // snapshot at order time
  unitPrice: Cents;
  isOpenPrice: boolean;
  quantity: number;
  lineTotal: Cents;
}

export interface Order {
  id: Id;
  number: number;
  clientId: Id;
  lines: OrderLine[];
  subtotal: Cents;
  discount: Cents;
  total: Cents;
  status: OrderStatus;
  version: number;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface OrdersSnapshot {
  orders: Order[];
  seq: number;
}

// Sent with headers Idempotency-Key and X-Client-Id
export interface PlaceOrderRequest {
  lines: {
    itemId: Id;
    quantity: number;
    unitPrice: Cents;
    // true when the customer entered the price; it must still match the item's pricing
    isOpenPrice: boolean;
    itemVersion: number;
  }[];
  discount: Cents;
}

export interface ChangeOrderStatusRequest {
  status: OrderStatus;
  expectedVersion: number;
}
