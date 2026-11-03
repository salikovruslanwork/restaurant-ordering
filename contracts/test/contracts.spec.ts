import { describe, expect, it } from 'vitest';

import {
  ApiErrorCode,
  CartChangeKind,
  OrderStatus,
  PricingKind,
  ServerEventType,
  type ApiError,
  type CartChange,
  type EventEnvelope,
  type MenuItem
} from '@restaurant/contracts';

describe('@restaurant/contracts', () => {
  it('keeps the wire values of every enum', () => {
    expect(Object.values(PricingKind)).toEqual(['fixed', 'open']);
    expect(Object.values(OrderStatus)).toEqual(['placed', 'preparing', 'ready', 'cancelled']);
    expect(Object.values(CartChangeKind)).toEqual([
      'price_changed',
      'unavailable',
      'removed',
      'discount_too_high'
    ]);
    expect(Object.values(ApiErrorCode)).toEqual([
      'MENU_CHANGED',
      'VERSION_CONFLICT',
      'INVALID_TRANSITION',
      'CATEGORY_NOT_EMPTY',
      'IDEMPOTENCY_MISMATCH',
      'VALIDATION',
      'NOT_FOUND',
      'INTERNAL'
    ]);
    expect(Object.values(ServerEventType)).toEqual([
      'category.upserted',
      'category.deleted',
      'item.upserted',
      'item.deleted',
      'order.created',
      'order.updated',
      'resync'
    ]);
  });

  it('narrows the discriminated unions', () => {
    const item: MenuItem = {
      id: 'item-1',
      categoryId: 'category-1',
      name: 'Market fish',
      description: '',
      pricing: { kind: PricingKind.Fixed, price: 1250 },
      isAvailable: true,
      version: 1,
      updatedAt: '2026-11-01T00:00:00.000Z'
    };
    const envelope: EventEnvelope = {
      seq: 1,
      at: item.updatedAt,
      event: { type: ServerEventType.ItemUpserted, item }
    };
    const change: CartChange = { kind: CartChangeKind.DiscountTooHigh, maxDiscount: 500 };
    const error: ApiError = {
      code: ApiErrorCode.MenuChanged,
      message: 'The menu changed',
      changes: [change]
    };

    const price =
      envelope.event.type === ServerEventType.ItemUpserted &&
      envelope.event.item.pricing.kind === PricingKind.Fixed
        ? envelope.event.item.pricing.price
        : null;
    const changes = error.code === ApiErrorCode.MenuChanged ? error.changes : [];

    expect(price).toBe(1250);
    expect(changes).toEqual([change]);
  });
});
