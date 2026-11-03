import type { Id, Order, OrderStatus } from '@restaurant/contracts';
import { summarizeOrder } from '@shared/util';
import type {
  OrderRow,
  PendingStatusChange,
  StatusFilterOption
} from '@admin/models/admin-orders.model';

// A pending change is shown on top of the server's order until the answer arrives.
export function withPending(order: Order, pending: PendingStatusChange | undefined): Order {
  return pending && order.version === pending.previous.version
    ? { ...order, status: pending.target }
    : order;
}

export function toOrderRows(
  orders: Order[],
  filter: OrderStatus | null,
  pending: Record<Id, PendingStatusChange>,
  freshIds: Id[]
): OrderRow[] {
  const fresh = new Set(freshIds);
  // Filtering uses the server's status, so a row doesn't vanish while its change is saving.
  return orders
    .filter((order) => filter === null || order.status === filter)
    .map((order) => ({
      order: withPending(order, pending[order.id]),
      summary: summarizeOrder(order),
      isSaving: order.id in pending,
      isFresh: fresh.has(order.id)
    }));
}

export function toStatusFilterOptions(
  orders: Order[],
  statuses: OrderStatus[],
  labels: Record<OrderStatus, { label: string }>
): StatusFilterOption[] {
  const counts = new Map<OrderStatus, number>();
  for (const { status } of orders) {
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return [
    { status: null, label: 'All', count: orders.length },
    ...statuses.map((status) => ({
      status,
      label: labels[status].label,
      count: counts.get(status) ?? 0
    }))
  ];
}
