import { OrderStatus, type Id, type Order } from '@restaurant/contracts';
import { ORDER_PROGRESS_STEPS } from '@menu/config/my-orders.config';
import type { OrderProgressStep } from '@menu/models/my-orders.model';

// An order can only be cancelled while it is Placed, so a cancelled one stopped at the first step.
export function progressIndex(order: Order): number {
  return order.status === OrderStatus.Cancelled ? 0 : ORDER_PROGRESS_STEPS.indexOf(order.status);
}

export function toProgressSteps(
  index: number,
  labels: Record<OrderStatus, { label: string }>
): OrderProgressStep[] {
  return ORDER_PROGRESS_STEPS.map((status, i) => ({
    label: labels[status].label,
    isDone: i < index,
    isCurrent: i === index,
    hasCheck: i < index || (i === index && i === ORDER_PROGRESS_STEPS.length - 1)
  }));
}

export function progressText(
  order: Order,
  index: number,
  labels: Record<OrderStatus, { label: string }>
): string {
  const reached = ORDER_PROGRESS_STEPS[index] ?? OrderStatus.Placed;
  return order.status === OrderStatus.Cancelled
    ? `Cancelled after “${labels[reached].label}”`
    : `Step ${index + 1} of ${ORDER_PROGRESS_STEPS.length}: ${labels[reached].label}`;
}

export function findStatusChanges(
  previous: Record<Id, Order | undefined>,
  current: Record<Id, Order | undefined>
): Order[] {
  return Object.values(current).filter(
    (order): order is Order =>
      order !== undefined &&
      previous[order.id] !== undefined &&
      previous[order.id]?.status !== order.status
  );
}

export function statusNotice(orders: Order[], labels: Record<OrderStatus, { label: string }>) {
  const [order] = orders;
  return orders.length === 1 && order
    ? `Order #${order.number} is now ${labels[order.status].label}`
    : `${orders.length} of your orders were updated`;
}
