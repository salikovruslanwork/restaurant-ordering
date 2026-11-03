import { OrderStatus } from '@restaurant/contracts';
import { makeOrder } from '@shared/data-access/testing/orders';
import { STATUS_CHIP } from '@shared/ui';

import {
  findStatusChanges,
  progressIndex,
  progressText,
  statusNotice,
  toProgressSteps
} from './my-orders';

describe('my orders helpers', () => {
  it.each([
    [OrderStatus.Placed, 0],
    [OrderStatus.Preparing, 1],
    [OrderStatus.Ready, 2],
    [OrderStatus.Cancelled, 0]
  ])('puts a %s order on step %i', (status, expected) => {
    expect(progressIndex(makeOrder({ status }))).toBe(expected);
  });

  it('marks steps before the current one as done and checks a ready order', () => {
    const steps = toProgressSteps(1, STATUS_CHIP);

    expect(steps.map(({ label }) => label)).toEqual(['Placed', 'Preparing', 'Ready']);
    expect(steps.map(({ isDone }) => isDone)).toEqual([true, false, false]);
    expect(steps.map(({ isCurrent }) => isCurrent)).toEqual([false, true, false]);
    expect(steps.map(({ hasCheck }) => hasCheck)).toEqual([true, false, false]);
    expect(toProgressSteps(2, STATUS_CHIP)[2]?.hasCheck).toBe(true);
  });

  it('describes the progress for screen readers', () => {
    expect(progressText(makeOrder({ status: OrderStatus.Preparing }), 1, STATUS_CHIP)).toBe(
      'Step 2 of 3: Preparing'
    );
    expect(progressText(makeOrder({ status: OrderStatus.Cancelled }), 0, STATUS_CHIP)).toBe(
      'Cancelled after “Placed”'
    );
  });

  it('finds orders whose status changed, ignoring new ones', () => {
    const placed = makeOrder({ id: 'a' });
    const preparing = makeOrder({ id: 'a', status: OrderStatus.Preparing, version: 2 });
    const fresh = makeOrder({ id: 'b' });

    expect(findStatusChanges({ a: placed }, { a: preparing, b: fresh })).toEqual([preparing]);
    expect(findStatusChanges({ a: placed }, { a: { ...placed, version: 2 } })).toEqual([]);
  });

  it('words the notice for one or several orders', () => {
    expect(statusNotice([makeOrder({ status: OrderStatus.Ready })], STATUS_CHIP)).toBe(
      'Order #1001 is now Ready'
    );
    expect(statusNotice([makeOrder(), makeOrder({ id: 'b' })], STATUS_CHIP)).toBe(
      '2 of your orders were updated'
    );
  });
});
