import type { Id, Order } from '@restaurant/contracts';

export interface OrdersRepository {
  nextOrderNumber(): Promise<number>;
  list(): Promise<Order[]>;
  listByClient(clientId: Id): Promise<Order[]>;
  find(id: Id): Promise<Order | null>;
  save(order: Order): Promise<void>;
}
