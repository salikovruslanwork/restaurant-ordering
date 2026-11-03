import { OrderStatus } from '@restaurant/contracts';
import type { OrderAction } from '@admin/models/admin-orders.model';

export const ORDER_ACTIONS: Record<OrderStatus, OrderAction[]> = {
  [OrderStatus.Placed]: [
    { target: OrderStatus.Preparing, label: 'Start preparing', isCancel: false },
    { target: OrderStatus.Cancelled, label: 'Cancel', isCancel: true }
  ],
  [OrderStatus.Preparing]: [{ target: OrderStatus.Ready, label: 'Mark ready', isCancel: false }],
  [OrderStatus.Ready]: [],
  [OrderStatus.Cancelled]: []
};

export const ORDER_FILTER_STATUSES = [
  OrderStatus.Placed,
  OrderStatus.Preparing,
  OrderStatus.Ready,
  OrderStatus.Cancelled
];

export const ORDER_FRESH_MS = 2400;
export const ORDER_SKELETON_ROWS = 6;

export const ORDERS_LOAD_ERROR = 'We couldn’t load orders. Check your connection and try again.';
export const ORDER_CANCEL_TEXT =
  'The customer will see that the order was cancelled. This can’t be undone.';
