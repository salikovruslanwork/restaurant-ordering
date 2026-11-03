import type { EntityState } from '@ngrx/entity';

import type { Id, Order, OrderStatus } from '@restaurant/contracts';
import type { LoadStatus } from '@shared/data-access';

export interface PendingStatusChange {
  previous: Order;
  target: OrderStatus;
}

export interface AdminOrdersState {
  orders: EntityState<Order>;
  loadStatus: LoadStatus;
  error: string | null;
  seq: number | null;
  statusFilter: OrderStatus | null;
  pending: Record<Id, PendingStatusChange>;
  freshIds: Id[];
}

export interface OrderAction {
  target: OrderStatus;
  label: string;
  isCancel: boolean;
}

export interface OrderStatusChange {
  order: Order;
  target: OrderStatus;
}

export interface StatusFilterOption {
  status: OrderStatus | null;
  label: string;
  count: number;
}

export interface OrderRow {
  order: Order;
  summary: string;
  isSaving: boolean;
  isFresh: boolean;
}
