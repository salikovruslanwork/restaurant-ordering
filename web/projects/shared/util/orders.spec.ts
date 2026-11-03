import { OrderStatus, type Order, type OrderLine } from '@restaurant/contracts';

import { clockTime, countOrderItems, mergeSnapshot, summarizeOrder, timeAgo } from './orders';

const line = (name: string, quantity = 1): OrderLine => ({
  itemId: name,
  name,
  unitPrice: 100,
  isOpenPrice: false,
  quantity,
  lineTotal: 100 * quantity
});

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    number: 1001,
    clientId: 'c1',
    lines: [line('Miso', 2)],
    subtotal: 200,
    discount: 0,
    total: 200,
    status: OrderStatus.Placed,
    version: 1,
    createdAt: '2026-11-02T12:00:00.000Z',
    updatedAt: '2026-11-02T12:00:00.000Z',
    ...overrides
  };
}

describe('order helpers', () => {
  it('summarizes the first two lines and counts the rest', () => {
    expect(summarizeOrder(makeOrder())).toBe('2× Miso');
    expect(summarizeOrder(makeOrder({ lines: [line('Tea', 2), line('Cake')] }))).toBe(
      '2× Tea, 1× Cake'
    );
    expect(
      summarizeOrder(makeOrder({ lines: [line('Tea'), line('Cake'), line('Soup'), line('Pie')] }))
    ).toBe('1× Tea, 1× Cake +2 more');
  });

  it('counts items across lines', () => {
    expect(countOrderItems(makeOrder({ lines: [line('Tea', 2), line('Cake', 3)] }))).toBe(5);
  });

  it.each([
    ['2026-11-02T11:59:30.000Z', 'Just now'],
    ['2026-11-02T11:15:00.000Z', '45 min ago'],
    ['2026-11-02T11:00:01.000Z', '59 min ago'],
    ['2026-11-02T09:00:00.000Z', '3 h ago']
  ])('says how long ago %s was', (date, expected) => {
    expect(timeAgo(date, Date.parse('2026-11-02T12:00:00.000Z'))).toBe(expected);
  });

  it('shows the local clock time', () => {
    const date = new Date(2026, 10, 2, 14, 5).toISOString();

    expect(clockTime(date)).toBe('2:05 PM');
  });
  it('merges a snapshot without going back to an older version or dropping known orders', () => {
    const newer = makeOrder({ id: 'a', version: 3, status: OrderStatus.Preparing });
    const placedMeanwhile = makeOrder({ id: 'b', number: 1002 });
    const updated = makeOrder({ id: 'c', number: 1003, version: 2 });

    const merged = mergeSnapshot({ a: newer, b: placedMeanwhile, c: makeOrder({ id: 'c' }) }, [
      makeOrder({ id: 'a', version: 2 }),
      updated
    ]);

    expect(merged).toEqual([newer, placedMeanwhile, updated]);
  });
});
