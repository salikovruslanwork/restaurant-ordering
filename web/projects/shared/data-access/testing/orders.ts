import { OrderStatus, type Order } from '@restaurant/contracts';

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    number: 1001,
    clientId: 'c1',
    lines: [
      {
        itemId: 'miso',
        name: 'Miso',
        unitPrice: 450,
        isOpenPrice: false,
        quantity: 2,
        lineTotal: 900
      }
    ],
    subtotal: 900,
    discount: 0,
    total: 900,
    status: OrderStatus.Placed,
    version: 1,
    createdAt: '2026-11-02T12:00:00.000Z',
    updatedAt: '2026-11-02T12:00:00.000Z',
    ...overrides
  };
}
