import { inject, Injectable } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';

import { tap } from 'rxjs';

import { Actions, createEffect, ofType } from '@ngrx/effects';

import { CHECKOUT_CONFLICT_TEXT } from '@menu/config/checkout.config';

import { checkoutActions } from './checkout.actions';

@Injectable()
export class CheckoutUiEffects {
  private readonly actions$ = inject(Actions);
  private readonly announcer = inject(LiveAnnouncer);

  announcePlaced$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(checkoutActions.orderPlaced),
        tap(({ order }) => this.announce(`Order #${order.number} placed`))
      ),
    { dispatch: false }
  );

  announceMenuChanged$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(checkoutActions.menuChanged),
        tap(() => this.announce(CHECKOUT_CONFLICT_TEXT))
      ),
    { dispatch: false }
  );

  announceFailed$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(checkoutActions.failed),
        tap(() => this.announce('We couldn’t place your order.'))
      ),
    { dispatch: false }
  );

  private announce(message: string): void {
    void this.announcer.announce(message);
  }
}
