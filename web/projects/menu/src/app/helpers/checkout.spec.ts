import { CartChangeKind, PricingKind } from '@restaurant/contracts';
import type { CartState } from '@menu/models/cart.model';
import { CheckoutBlock } from '@menu/models/checkout.model';
import { EMPTY_SUMMARY, makeLineView } from '@menu/testing/cart';
import { makeItem } from '@menu/testing/menu';

import {
  applyChanges,
  describeChanges,
  getCheckoutBlock,
  isSameOrder,
  toOrderRequest
} from './checkout';

const cart: CartState = {
  lines: [
    { key: 'miso', itemId: 'miso', name: 'Miso', quantity: 2, customPrice: null, seenPrice: 450 },
    {
      key: 'cake:900',
      itemId: 'cake',
      name: 'Cake',
      quantity: 1,
      customPrice: 900,
      seenPrice: 900
    },
    { key: 'tea', itemId: 'tea', name: 'Tea', quantity: 1, customPrice: null, seenPrice: 300 }
  ],
  discount: 500
};

describe('checkout helpers', () => {
  describe('toOrderRequest', () => {
    const summary = { ...EMPTY_SUMMARY, count: 3, subtotal: 1800, discount: 200, total: 1600 };

    it('sends each line with its price, kind and the item version, and the capped discount', () => {
      const request = toOrderRequest(
        [
          makeLineView(),
          makeLineView({
            key: 'cake:900',
            itemId: 'cake',
            unitPrice: 900,
            quantity: 1,
            isCustomPrice: true
          })
        ],
        summary,
        {
          miso: makeItem({ version: 4 }),
          cake: makeItem({ id: 'cake', pricing: { kind: PricingKind.Open }, version: 2 })
        }
      );

      expect(request).toEqual({
        lines: [
          { itemId: 'miso', quantity: 2, unitPrice: 450, isOpenPrice: false, itemVersion: 4 },
          { itemId: 'cake', quantity: 1, unitPrice: 900, isOpenPrice: true, itemVersion: 2 }
        ],
        discount: 200
      });
    });

    it('sends nothing for an empty cart or one with blocked lines', () => {
      expect(toOrderRequest([], summary, {})).toBeNull();
      expect(
        toOrderRequest([makeLineView()], { ...summary, hasBlockedLines: true }, {})
      ).toBeNull();
    });
  });

  it('treats a request as the same order unless an essential field changes', () => {
    const request = {
      lines: [{ itemId: 'miso', quantity: 2, unitPrice: 450, isOpenPrice: false, itemVersion: 1 }],
      discount: 0
    };

    expect(
      isSameOrder(request, { ...request, lines: [{ ...request.lines[0]!, itemVersion: 7 }] })
    ).toBe(true);
    expect(isSameOrder(request, { ...request, discount: 100 })).toBe(false);
    expect(
      isSameOrder(request, { ...request, lines: [{ ...request.lines[0]!, quantity: 3 }] })
    ).toBe(false);
  });

  it.each([
    [{ ...EMPTY_SUMMARY }, CheckoutBlock.Empty],
    [{ ...EMPTY_SUMMARY, count: 1, hasBlockedLines: true }, CheckoutBlock.BlockedLines],
    [{ ...EMPTY_SUMMARY, count: 1 }, null]
  ])(
    'explains why checkout is blocked, never because of the connection (%#)',
    (summary, expected) => {
      expect(getCheckoutBlock(summary)).toBe(expected);
    }
  );

  it('describes server changes with the names from the cart', () => {
    expect(
      describeChanges(
        [
          { kind: CartChangeKind.PriceChanged, itemId: 'miso', oldPrice: 450, newPrice: 500 },
          { kind: CartChangeKind.Unavailable, itemId: 'tea' },
          { kind: CartChangeKind.Removed, itemId: 'gone' },
          { kind: CartChangeKind.DiscountTooHigh, maxDiscount: 300 }
        ],
        cart
      )
    ).toEqual([
      { kind: CartChangeKind.PriceChanged, name: 'Miso', oldAmount: 450, newAmount: 500 },
      { kind: CartChangeKind.Unavailable, name: 'Tea', oldAmount: null, newAmount: null },
      { kind: CartChangeKind.Removed, name: null, oldAmount: null, newAmount: null },
      { kind: CartChangeKind.DiscountTooHigh, name: null, oldAmount: 500, newAmount: 300 }
    ]);
  });

  it('applies server changes to the cart', () => {
    const next = applyChanges(cart, [
      { kind: CartChangeKind.PriceChanged, itemId: 'miso', oldPrice: 450, newPrice: 500 },
      { kind: CartChangeKind.Removed, itemId: 'cake' },
      { kind: CartChangeKind.Unavailable, itemId: 'tea' },
      { kind: CartChangeKind.DiscountTooHigh, maxDiscount: 300 }
    ]);

    expect(next).toEqual({
      lines: [{ ...cart.lines[0]!, seenPrice: 500 }],
      discount: 300
    });
  });
});
