import { createFeature, createReducer, createSelector, on } from '@ngrx/store';

import { PricingKind, type Cents, type MenuItem } from '@restaurant/contracts';
import { menuFeature } from '@shared/data-access';
import { clampQuantity, lineKey, toLineViews, toSummary } from '@menu/helpers/cart';
import { applyChanges } from '@menu/helpers/checkout';
import type { CartLine, CartState } from '@menu/models/cart.model';
import { checkoutActions } from '@menu/store/checkout/checkout.actions';

import { cartActions } from './cart.actions';

const initialState: CartState = { lines: [], discount: 0 };

function addToLine(
  state: CartState,
  item: MenuItem,
  customPrice: Cents | null,
  quantity: number
): CartState {
  const key = lineKey(item.id, customPrice);
  const existing = state.lines.find((line) => line.key === key);
  if (existing) {
    return setQuantity(state, key, existing.quantity + quantity);
  }
  const seenPrice =
    customPrice ?? (item.pricing.kind === PricingKind.Fixed ? item.pricing.price : 0);
  const line: CartLine = {
    key,
    itemId: item.id,
    name: item.name,
    quantity: clampQuantity(quantity),
    customPrice,
    seenPrice
  };
  return { ...state, lines: [...state.lines, line] };
}

function setQuantity(state: CartState, key: string, quantity: number): CartState {
  const next = clampQuantity(quantity);
  return {
    ...state,
    lines:
      next === 0
        ? state.lines.filter((line) => line.key !== key)
        : state.lines.map((line) => (line.key === key ? { ...line, quantity: next } : line))
  };
}

export const cartFeature = createFeature({
  name: 'cart',
  reducer: createReducer(
    initialState,
    on(cartActions.restored, (_state, { state }): CartState => state),
    on(cartActions.itemAdded, (state, { item }): CartState =>
      item.isAvailable && item.pricing.kind === PricingKind.Fixed
        ? addToLine(state, item, null, 1)
        : state
    ),
    on(cartActions.openPriceItemAdded, (state, { item, price, quantity }): CartState =>
      item.isAvailable ? addToLine(state, item, price, quantity) : state
    ),
    on(cartActions.quantityChanged, (state, { key, quantity }): CartState =>
      setQuantity(state, key, quantity)
    ),
    on(cartActions.lineRemoved, (state, { key }): CartState => setQuantity(state, key, 0)),
    on(cartActions.discountApplied, (state, { discount }): CartState => ({ ...state, discount })),
    on(cartActions.discountRemoved, (state): CartState => ({ ...state, discount: 0 })),
    on(checkoutActions.orderPlaced, (): CartState => initialState),
    on(checkoutActions.menuChanged, (state, { changes }): CartState => applyChanges(state, changes))
  ),
  extraSelectors: ({ selectLines, selectDiscount }) => {
    const selectLineViews = createSelector(
      selectLines,
      menuFeature.selectItemEntities,
      menuFeature.selectSeq,
      (lines, items, seq) => toLineViews(lines, items, seq !== null)
    );
    return {
      selectLineViews,
      selectSummary: createSelector(selectLineViews, selectDiscount, toSummary),
      selectQuantities: createSelector(selectLines, (lines) =>
        Object.fromEntries(
          lines
            .filter(({ customPrice }) => customPrice === null)
            .map(({ itemId, quantity }) => [itemId, quantity])
        )
      )
    };
  }
});
