import { createFeature, createReducer, createSelector, on } from '@ngrx/store';

import { menuFeature } from '@shared/data-access';
import { getCheckoutBlock, toOrderRequest } from '@menu/helpers/checkout';
import { CheckoutErrorKind, CheckoutStep, type CheckoutState } from '@menu/models/checkout.model';
import { cartFeature } from '@menu/store/cart/cart.reducer';

import { checkoutActions } from './checkout.actions';

const initialState: CheckoutState = {
  step: CheckoutStep.Idle,
  attempt: null,
  changes: [],
  order: null,
  errorKind: null
};

export const checkoutFeature = createFeature({
  name: 'checkout',
  reducer: createReducer(
    initialState,
    on(checkoutActions.restored, (state, { attempt }): CheckoutState => ({ ...state, attempt })),
    on(checkoutActions.opened, (state): CheckoutState =>
      state.step === CheckoutStep.Submitting
        ? state
        : { ...initialState, attempt: state.attempt, step: CheckoutStep.Review }
    ),
    on(checkoutActions.closed, (state): CheckoutState =>
      state.step === CheckoutStep.Submitting ? state : { ...initialState, attempt: state.attempt }
    ),
    on(checkoutActions.attemptStarted, (state, { attempt }): CheckoutState => ({
      ...state,
      step: CheckoutStep.Submitting,
      attempt,
      errorKind: null
    })),
    on(checkoutActions.orderPlaced, (state, { order }): CheckoutState => ({
      ...state,
      step: CheckoutStep.Success,
      attempt: null,
      order
    })),
    on(checkoutActions.menuChanged, (state, { described }): CheckoutState => ({
      ...state,
      step: CheckoutStep.Conflict,
      attempt: null,
      changes: described
    })),
    // Only a lost connection keeps the key: the server may have placed the order already.
    on(checkoutActions.failed, (state, { kind }): CheckoutState => ({
      ...state,
      step: CheckoutStep.Error,
      attempt: kind === CheckoutErrorKind.Connection ? state.attempt : null,
      errorKind: kind
    }))
  ),
  extraSelectors: () => ({
    selectOrderRequest: createSelector(
      cartFeature.selectLineViews,
      cartFeature.selectSummary,
      menuFeature.selectItemEntities,
      toOrderRequest
    ),
    selectBlock: createSelector(cartFeature.selectSummary, getCheckoutBlock)
  })
});
