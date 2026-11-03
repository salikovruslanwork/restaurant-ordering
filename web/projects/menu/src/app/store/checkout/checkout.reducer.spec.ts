import { CartChangeKind } from '@restaurant/contracts';
import { makeOrder } from '@shared/data-access/testing/orders';
import { CheckoutErrorKind, CheckoutStep, type CheckoutState } from '@menu/models/checkout.model';

import { checkoutActions } from './checkout.actions';
import { checkoutFeature } from './checkout.reducer';

const { reducer } = checkoutFeature;
const attempt = { key: 'key-1', request: { lines: [], discount: 0 } };

function apply(...actions: Parameters<typeof reducer>[1][]): CheckoutState {
  return actions.reduce(
    (state, action) => reducer(state, action),
    reducer(undefined, { type: 'init' })
  );
}

describe('checkout reducer', () => {
  it('starts idle with no attempt', () => {
    expect(apply()).toEqual({
      step: CheckoutStep.Idle,
      attempt: null,
      changes: [],
      order: null,
      errorKind: null
    });
  });

  it('restores a saved attempt and keeps it through opening and closing', () => {
    const state = apply(
      checkoutActions.restored({ attempt }),
      checkoutActions.opened(),
      checkoutActions.closed()
    );

    expect(state).toMatchObject({ step: CheckoutStep.Idle, attempt });
  });

  it('opens on review and goes to submitting with the attempt', () => {
    expect(apply(checkoutActions.opened()).step).toBe(CheckoutStep.Review);

    const submitting = apply(checkoutActions.opened(), checkoutActions.attemptStarted({ attempt }));
    expect(submitting).toMatchObject({ step: CheckoutStep.Submitting, attempt });
  });

  it('can’t be reopened or closed while submitting', () => {
    const submitting = apply(checkoutActions.attemptStarted({ attempt }));

    expect(reducer(submitting, checkoutActions.closed())).toBe(submitting);
    expect(reducer(submitting, checkoutActions.opened())).toBe(submitting);
  });

  it('forgets the attempt once the server answered', () => {
    const order = makeOrder();
    const changes = [
      { kind: CartChangeKind.Removed, name: 'Tea', oldAmount: null, newAmount: null }
    ];

    expect(
      apply(checkoutActions.attemptStarted({ attempt }), checkoutActions.orderPlaced({ order }))
    ).toMatchObject({
      step: CheckoutStep.Success,
      attempt: null,
      order
    });
    expect(
      apply(
        checkoutActions.attemptStarted({ attempt }),
        checkoutActions.menuChanged({ changes: [], described: changes })
      )
    ).toMatchObject({ step: CheckoutStep.Conflict, attempt: null, changes });
    expect(
      apply(
        checkoutActions.attemptStarted({ attempt }),
        checkoutActions.failed({ kind: CheckoutErrorKind.Server })
      )
    ).toMatchObject({
      step: CheckoutStep.Error,
      attempt: null,
      errorKind: CheckoutErrorKind.Server
    });
  });

  it('keeps the key after a lost connection, since the order may exist', () => {
    const state = apply(
      checkoutActions.attemptStarted({ attempt }),
      checkoutActions.failed({ kind: CheckoutErrorKind.Connection })
    );

    expect(state).toMatchObject({
      step: CheckoutStep.Error,
      attempt,
      errorKind: CheckoutErrorKind.Connection
    });
    expect(reducer(state, checkoutActions.attemptStarted({ attempt })).errorKind).toBeNull();
  });
});
