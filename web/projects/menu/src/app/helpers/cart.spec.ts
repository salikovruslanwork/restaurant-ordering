import { CartChangeKind, PricingKind } from '@restaurant/contracts';
import type { CartLine } from '@menu/models/cart.model';
import { makeItem } from '@menu/testing/menu';

import { clampQuantity, lineIssue, lineKey, toLineViews, toSummary } from './cart';

const line = (overrides: Partial<CartLine> = {}): CartLine => ({
  key: 'miso',
  itemId: 'miso',
  name: 'Miso',
  quantity: 2,
  customPrice: null,
  seenPrice: 450,
  ...overrides
});

describe('cart helpers', () => {
  it('keys open-price lines by their price, so each price is its own line', () => {
    expect(lineKey('miso', null)).toBe('miso');
    expect(lineKey('cake', 1250)).toBe('cake:1250');
  });

  it.each([
    [0, 0],
    [-3, 0],
    [2.4, 2],
    [120, 99]
  ])('keeps quantity %d within 0–99 as %d', (input, expected) => {
    expect(clampQuantity(input)).toBe(expected);
  });

  describe('lineIssue', () => {
    it('flags nothing while the dish is unchanged', () => {
      expect(lineIssue(line(), makeItem())).toBeNull();
    });

    it('flags a changed fixed price, and leaves a price the customer set alone', () => {
      const pricier = makeItem({ pricing: { kind: PricingKind.Fixed, price: 600 } });
      const open = makeItem({ pricing: { kind: PricingKind.Open } });

      expect(lineIssue(line(), pricier)).toBe(CartChangeKind.PriceChanged);
      expect(lineIssue(line({ customPrice: 900 }), open)).toBeNull();
    });

    it('flags an unavailable dish', () => {
      expect(lineIssue(line(), makeItem({ isAvailable: false }))).toBe(CartChangeKind.Unavailable);
    });

    it('treats a dish that left the menu, or switched between fixed and open price, as removed', () => {
      expect(lineIssue(line(), undefined)).toBe(CartChangeKind.Removed);
      expect(lineIssue(line(), makeItem({ pricing: { kind: PricingKind.Open } }))).toBe(
        CartChangeKind.Removed
      );
      expect(lineIssue(line({ customPrice: 900 }), makeItem())).toBe(CartChangeKind.Removed);
    });
  });

  describe('toLineViews', () => {
    it('uses the current price and name of a dish', () => {
      const [view] = toLineViews(
        [line()],
        { miso: makeItem({ name: 'Red miso', pricing: { kind: PricingKind.Fixed, price: 600 } }) },
        true
      );

      expect(view).toMatchObject({
        name: 'Red miso',
        seenPrice: 450,
        unitPrice: 600,
        lineTotal: 1200,
        issue: CartChangeKind.PriceChanged,
        isBlocked: false
      });
    });

    it('keeps the price the customer set', () => {
      const [view] = toLineViews(
        [line({ key: 'cake:1250', itemId: 'cake', customPrice: 1250, seenPrice: 1250 })],
        { cake: makeItem({ id: 'cake', pricing: { kind: PricingKind.Open } }) },
        true
      );

      expect(view).toMatchObject({ unitPrice: 1250, lineTotal: 2500, isCustomPrice: true });
    });

    it('blocks a removed dish and shows it with its saved name and price', () => {
      const [view] = toLineViews([line({ name: 'Old miso' })], {}, true);

      expect(view).toMatchObject({
        name: 'Old miso',
        unitPrice: 450,
        issue: CartChangeKind.Removed,
        isBlocked: true
      });
    });

    it('flags nothing before the menu has loaded', () => {
      const [view] = toLineViews([line()], {}, false);

      expect(view).toMatchObject({ issue: null, isBlocked: false, unitPrice: 450 });
    });
  });

  describe('toSummary', () => {
    const views = toLineViews(
      [line(), line({ key: 'tea', itemId: 'tea', quantity: 1, seenPrice: 300 })],
      { miso: makeItem(), tea: makeItem({ id: 'tea', isAvailable: false }) },
      true
    );

    it('counts every item but totals only what can be ordered', () => {
      expect(toSummary(views, 0)).toEqual({
        count: 3,
        subtotal: 900,
        discount: 0,
        total: 900,
        isDiscountReduced: false,
        hasBlockedLines: true
      });
    });

    it('caps the discount at the subtotal', () => {
      expect(toSummary(views, 200)).toMatchObject({ discount: 200, total: 700 });
      expect(toSummary(views, 5000)).toMatchObject({
        discount: 900,
        total: 0,
        isDiscountReduced: true
      });
    });
  });
});
