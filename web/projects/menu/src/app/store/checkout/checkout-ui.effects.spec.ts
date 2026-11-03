import { TestBed } from '@angular/core/testing';
import { LiveAnnouncer } from '@angular/cdk/a11y';

import { ReplaySubject } from 'rxjs';

import { provideMockActions } from '@ngrx/effects/testing';
import type { Action } from '@ngrx/store';

import { makeOrder } from '@shared/data-access/testing/orders';
import { CheckoutErrorKind } from '@menu/models/checkout.model';

import { CheckoutUiEffects } from './checkout-ui.effects';
import { checkoutActions } from './checkout.actions';

describe('CheckoutUiEffects', () => {
  it('announces the outcome', () => {
    const actions$ = new ReplaySubject<Action>();
    const announce = vi.fn<(message: string) => Promise<void>>(() => Promise.resolve());
    TestBed.configureTestingModule({
      providers: [
        CheckoutUiEffects,
        provideMockActions(() => actions$),
        { provide: LiveAnnouncer, useValue: { announce } }
      ]
    });
    const effects = TestBed.inject(CheckoutUiEffects);
    effects.announcePlaced$.subscribe();
    effects.announceMenuChanged$.subscribe();
    effects.announceFailed$.subscribe();

    actions$.next(checkoutActions.orderPlaced({ order: makeOrder() }));
    actions$.next(checkoutActions.menuChanged({ changes: [], described: [] }));
    actions$.next(checkoutActions.failed({ kind: CheckoutErrorKind.Server }));

    expect(announce.mock.calls.map(([message]) => message)).toEqual([
      'Order #1001 placed',
      'Some items changed while you were ordering. Please review.',
      'We couldn’t place your order.'
    ]);
  });
});
