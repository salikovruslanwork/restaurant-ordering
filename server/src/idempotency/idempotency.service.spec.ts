import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiErrorCode, OrderStatus, type Order } from '@restaurant/contracts';

import { ApiException } from '../common/index.js';
import { IdempotencyService } from './idempotency.service.js';

const KEY = 'key-1';
const PAYLOAD = '{"cart":1}';

const order: Order = {
  id: 'order-1',
  number: 1001,
  clientId: 'client-1',
  lines: [],
  subtotal: 0,
  discount: 0,
  total: 0,
  status: OrderStatus.Placed,
  version: 1,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z'
};

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  beforeEach(() => {
    service = new IdempotencyService();
  });

  it('runs the action once and returns the same order for the same key and payload', async () => {
    const action = vi.fn(async () => order);

    const first = await service.execute(KEY, PAYLOAD, action);
    const second = await service.execute(KEY, PAYLOAD, action);

    expect(action).toHaveBeenCalledOnce();
    expect(second).toBe(first);
  });

  it('runs the action once for concurrent requests with the same key', async () => {
    let finish: (value: Order) => void = () => undefined;
    const action = vi.fn(
      () =>
        new Promise<Order>((resolve) => {
          finish = resolve;
        })
    );

    const first = service.execute(KEY, PAYLOAD, action);
    const second = service.execute(KEY, PAYLOAD, action);
    finish(order);

    expect(await Promise.all([first, second])).toEqual([order, order]);
    expect(action).toHaveBeenCalledOnce();
  });

  it('keeps different keys apart', async () => {
    const action = vi.fn(async () => order);

    await service.execute(KEY, PAYLOAD, action);
    await service.execute('key-2', PAYLOAD, action);

    expect(action).toHaveBeenCalledTimes(2);
  });

  it('rejects the same key with a different payload', async () => {
    const action = vi.fn(async () => order);
    await service.execute(KEY, PAYLOAD, action);

    const mismatch = service.execute(KEY, '{"cart":2}', action);

    await expect(mismatch).rejects.toBeInstanceOf(ApiException);
    await expect(mismatch).rejects.toMatchObject({
      error: { code: ApiErrorCode.IdempotencyMismatch },
      status: 422
    });
    expect(action).toHaveBeenCalledOnce();
  });

  it('forgets a failed attempt, so the key can be tried again', async () => {
    const failure = new Error('Menu changed');
    const action = vi.fn<() => Promise<Order>>().mockRejectedValueOnce(failure);
    action.mockResolvedValueOnce(order);

    await expect(service.execute(KEY, PAYLOAD, action)).rejects.toBe(failure);

    expect(await service.execute(KEY, '{"cart":2}', action)).toBe(order);
  });
});
