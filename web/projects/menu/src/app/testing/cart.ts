import type { MockSelector } from '@ngrx/store/testing';

import type { CartLineView, CartSummary } from '@menu/models/cart.model';
import type { CheckoutBlock } from '@menu/models/checkout.model';
import { cartFeature } from '@menu/store/cart/cart.reducer';
import { checkoutFeature } from '@menu/store/checkout/checkout.reducer';

export const EMPTY_SUMMARY: CartSummary = {
  count: 0,
  subtotal: 0,
  discount: 0,
  total: 0,
  isDiscountReduced: false,
  hasBlockedLines: false
};

export function makeLineView(overrides: Partial<CartLineView> = {}): CartLineView {
  return {
    key: 'miso',
    itemId: 'miso',
    name: 'Miso',
    quantity: 2,
    seenPrice: 450,
    unitPrice: 450,
    lineTotal: 900,
    isCustomPrice: false,
    issue: null,
    isBlocked: false,
    ...overrides
  };
}

export function cartSelectors(
  state: {
    lines?: CartLineView[];
    summary?: CartSummary;
    discount?: number;
    quantities?: Record<string, number>;
    block?: CheckoutBlock | null;
  } = {}
): MockSelector[] {
  return [
    { selector: cartFeature.selectLineViews, value: state.lines ?? [] },
    { selector: cartFeature.selectSummary, value: state.summary ?? EMPTY_SUMMARY },
    { selector: cartFeature.selectDiscount, value: state.discount ?? 0 },
    { selector: cartFeature.selectQuantities, value: state.quantities ?? {} },
    { selector: checkoutFeature.selectBlock, value: state.block ?? null }
  ];
}
