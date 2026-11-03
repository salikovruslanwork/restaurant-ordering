import type { Id, Order } from '@restaurant/contracts';

import { ORDER_SUMMARY_LINES } from './config/orders.config';

const clockFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

export function summarizeOrder(order: Order): string {
  const shown = order.lines
    .slice(0, ORDER_SUMMARY_LINES)
    .map(({ quantity, name }) => `${quantity}× ${name}`)
    .join(', ');
  const hidden = order.lines.length - ORDER_SUMMARY_LINES;
  return hidden > 0 ? `${shown} +${hidden} more` : shown;
}

export function countOrderItems(order: Order): number {
  return order.lines.reduce((sum, { quantity }) => sum + quantity, 0);
}

export function timeAgo(date: string, now: number): string {
  const minutes = Math.floor((now - Date.parse(date)) / 60_000);
  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  return `${Math.floor(minutes / 60)} h ago`;
}

export function clockTime(date: string): string {
  return clockFormat.format(Date.parse(date));
}

// A snapshot can be older than an event that arrived while it was loading, and it can miss an
// order placed meanwhile, so neither replaces what the store already knows.
export function mergeSnapshot(current: Record<Id, Order | undefined>, snapshot: Order[]): Order[] {
  const merged = new Map<Id, Order>();
  for (const order of Object.values(current)) {
    if (order) {
      merged.set(order.id, order);
    }
  }
  for (const order of snapshot) {
    const known = merged.get(order.id);
    if (!known || known.version < order.version) {
      merged.set(order.id, order);
    }
  }
  return [...merged.values()];
}
