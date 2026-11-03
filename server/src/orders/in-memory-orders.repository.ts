import type { Id, Order } from '@restaurant/contracts';

import { FIRST_ORDER_NUMBER } from './orders.config.js';
import type { OrdersRepository } from './orders.repository.js';

export class InMemoryOrdersRepository implements OrdersRepository {
  private readonly orders: Map<Id, Order>;
  private lastNumber: number;

  constructor(orders: Order[] = []) {
    this.orders = new Map(orders.map((order) => [order.id, order]));
    this.lastNumber = Math.max(FIRST_ORDER_NUMBER - 1, ...orders.map(({ number }) => number));
  }

  async nextOrderNumber(): Promise<number> {
    this.lastNumber += 1;
    return this.lastNumber;
  }

  async list(): Promise<Order[]> {
    return [...this.orders.values()];
  }

  async listByClient(clientId: Id): Promise<Order[]> {
    return [...this.orders.values()].filter((order) => order.clientId === clientId);
  }

  async find(id: Id): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }
}
