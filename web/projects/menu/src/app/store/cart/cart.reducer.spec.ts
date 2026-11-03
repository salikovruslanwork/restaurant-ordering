import { CartChangeKind, PricingKind } from '@restaurant/contracts';
import { menuActions, menuFeature } from '@shared/data-access';
import { makeOrder } from '@shared/data-access/testing/orders';
import type { CartState } from '@menu/models/cart.model';
import { checkoutActions } from '@menu/store/checkout/checkout.actions';
import { makeCategory, makeItem } from '@menu/testing/menu';

import { cartActions } from './cart.actions';
import { cartFeature } from './cart.reducer';

const { reducer } = cartFeature;
const miso = makeItem();
const cake = makeItem({ id: 'cake', name: 'Cake', pricing: { kind: PricingKind.Open } });

function apply(...actions: Parameters<typeof reducer>[1][]): CartState {
  return actions.reduce(
    (state, action) => reducer(state, action),
    reducer(undefined, { type: 'init' })
  );
}

describe('cart reducer', () => {
  it('starts empty', () => {
    expect(apply()).toEqual({ lines: [], discount: 0 });
  });

  it('restores a saved cart', () => {
    const state: CartState = { lines: [], discount: 300 };

    expect(apply(cartActions.restored({ state }))).toBe(state);
  });

  it('adds a fixed-price dish once per line and counts up', () => {
    const state = apply(
      cartActions.itemAdded({ item: miso }),
      cartActions.itemAdded({ item: miso })
    );

    expect(state.lines).toEqual([
      { key: 'miso', itemId: 'miso', name: 'Miso', quantity: 2, customPrice: null, seenPrice: 450 }
    ]);
  });

  it('ignores unavailable and open-price dishes for a plain add', () => {
    const state = apply(
      cartActions.itemAdded({ item: makeItem({ isAvailable: false }) }),
      cartActions.itemAdded({ item: cake })
    );

    expect(state.lines).toEqual([]);
  });

  it('adds an open-price dish per price', () => {
    const state = apply(
      cartActions.openPriceItemAdded({ item: cake, price: 1250, quantity: 2 }),
      cartActions.openPriceItemAdded({ item: cake, price: 1250, quantity: 1 }),
      cartActions.openPriceItemAdded({ item: cake, price: 900, quantity: 1 }),
      cartActions.openPriceItemAdded({
        item: { ...cake, isAvailable: false },
        price: 1,
        quantity: 1
      })
    );

    expect(
      state.lines.map(({ key, quantity, customPrice, seenPrice }) => [
        key,
        quantity,
        customPrice,
        seenPrice
      ])
    ).toEqual([
      ['cake:1250', 3, 1250, 1250],
      ['cake:900', 1, 900, 900]
    ]);
  });

  it('changes quantities within 1–99 and removes a line at 0', () => {
    const added = apply(cartActions.itemAdded({ item: miso }));

    expect(
      reducer(added, cartActions.quantityChanged({ key: 'miso', quantity: 150 })).lines[0]?.quantity
    ).toBe(99);
    expect(reducer(added, cartActions.quantityChanged({ key: 'miso', quantity: 0 })).lines).toEqual(
      []
    );
    expect(reducer(added, cartActions.lineRemoved({ key: 'miso' })).lines).toEqual([]);
  });

  it('applies and removes a discount', () => {
    const state = apply(cartActions.discountApplied({ discount: 500 }));
    expect(state.discount).toBe(500);

    expect(reducer(state, cartActions.discountRemoved()).discount).toBe(0);
  });

  it('empties after a placed order and follows menu changes from checkout', () => {
    const filled = apply(
      cartActions.itemAdded({ item: miso }),
      cartActions.discountApplied({ discount: 300 })
    );

    expect(reducer(filled, checkoutActions.orderPlaced({ order: makeOrder() }))).toEqual({
      lines: [],
      discount: 0
    });
    expect(
      reducer(
        filled,
        checkoutActions.menuChanged({
          changes: [{ kind: CartChangeKind.DiscountTooHigh, maxDiscount: 100 }],
          described: []
        })
      ).discount
    ).toBe(100);
  });

  describe('selectors', () => {
    function root(cart: CartState, items = [miso]) {
      const menu = menuFeature.reducer(
        undefined,
        menuActions.loadSucceeded({
          snapshot: { categories: [makeCategory('soup', 'Soups', 0)], items, seq: 1 }
        })
      );
      return { cart, menu };
    }

    it('builds line views against the live menu, with a summary', () => {
      const cart = apply(
        cartActions.itemAdded({ item: miso }),
        cartActions.itemAdded({ item: miso })
      );
      const state = root(cart, [{ ...miso, pricing: { kind: PricingKind.Fixed, price: 600 } }]);

      expect(cartFeature.selectLineViews(state)[0]?.issue).toBe(CartChangeKind.PriceChanged);
      expect(cartFeature.selectSummary(state)).toMatchObject({ count: 2, subtotal: 1200 });
    });

    it('doesn’t flag lines before the menu has loaded', () => {
      const cart = apply(cartActions.itemAdded({ item: miso }));
      const state = { cart, menu: menuFeature.reducer(undefined, { type: 'init' }) };

      expect(cartFeature.selectLineViews(state)[0]?.issue).toBeNull();
    });

    it('maps fixed-price dishes to their quantity, leaving open-price lines out', () => {
      const cart = apply(
        cartActions.itemAdded({ item: miso }),
        cartActions.openPriceItemAdded({ item: cake, price: 900, quantity: 3 })
      );

      expect(cartFeature.selectQuantities(root(cart))).toEqual({ miso: 1 });
    });
  });
});
