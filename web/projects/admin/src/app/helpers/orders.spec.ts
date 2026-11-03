import { OrderStatus } from '@restaurant/contracts';
import { makeOrder } from '@shared/data-access/testing/orders';
import { STATUS_CHIP } from '@shared/ui';
import { ORDER_FILTER_STATUSES } from '@admin/config/orders.config';

import { toOrderRows, toStatusFilterOptions, withPending } from './orders';

describe('order helpers', () => {
  it('shows a pending status only on the version it was made for', () => {
    const order = makeOrder();
    const pending = { previous: order, target: OrderStatus.Preparing };

    expect(withPending(order, pending).status).toBe(OrderStatus.Preparing);
    expect(withPending({ ...order, version: 2 }, pending).status).toBe(OrderStatus.Placed);
    expect(withPending(order, undefined)).toBe(order);
  });

  it('builds rows, filtering by the server status', () => {
    const placed = makeOrder({ id: 'a' });
    const ready = makeOrder({ id: 'b', number: 1002, status: OrderStatus.Ready });
    const pending = { a: { previous: placed, target: OrderStatus.Preparing } };

    const rows = toOrderRows([placed, ready], OrderStatus.Placed, pending, ['a']);

    expect(rows).toEqual([
      {
        order: { ...placed, status: OrderStatus.Preparing },
        summary: '2× Miso',
        isSaving: true,
        isFresh: true
      }
    ]);
    expect(toOrderRows([placed, ready], null, {}, []).map(({ order }) => order.id)).toEqual([
      'a',
      'b'
    ]);
  });

  it('counts orders per status for the filter', () => {
    const orders = [
      makeOrder(),
      makeOrder({ id: 'b' }),
      makeOrder({ id: 'c', status: OrderStatus.Cancelled })
    ];

    const options = toStatusFilterOptions(orders, ORDER_FILTER_STATUSES, STATUS_CHIP);

    expect(options[0]).toEqual({ status: null, label: 'All', count: 3 });
    expect(options.map(({ count }) => count)).toEqual([3, 2, 0, 0, 1]);
    expect(options[1]?.label).toBe('Placed');
  });
});
