import { inject, Injectable } from '@angular/core';

import { catchError, concat, EMPTY, exhaustMap, map, of, tap } from 'rxjs';

import { Actions, createEffect, ofType, type OnInitEffects } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store, type Action } from '@ngrx/store';

import { ApiErrorCode, type CartChange, type PlaceOrderRequest } from '@restaurant/contracts';
import { menuActions, OrdersApiService, RequestError, StorageService } from '@shared/data-access';
import { CHECKOUT_STORAGE_KEY } from '@menu/config/checkout.config';
import { describeChanges, isSameOrder } from '@menu/helpers/checkout';
import type { CartState } from '@menu/models/cart.model';
import { CheckoutErrorKind, type CheckoutAttempt } from '@menu/models/checkout.model';
import { cartFeature } from '@menu/store/cart/cart.reducer';

import { checkoutActions } from './checkout.actions';
import { checkoutFeature } from './checkout.reducer';

@Injectable()
export class CheckoutEffects implements OnInitEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(OrdersApiService);
  private readonly storage = inject(StorageService);

  // exhaustMap drops clicks while an attempt is running, so one checkout sends one request.
  placeOrder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(checkoutActions.placeOrder),
      concatLatestFrom(() => [
        this.store.select(checkoutFeature.selectOrderRequest),
        this.store.select(checkoutFeature.selectAttempt),
        this.store.select(cartFeature.selectCartState)
      ]),
      exhaustMap(([, request, previous, cart]) =>
        request ? this.place(this.toAttempt(request, previous), cart) : EMPTY
      )
    )
  );

  // With a dead stream the menu keeps the old price, and the next attempt would conflict again.
  reloadMenuAfterConflict$ = createEffect(() =>
    this.actions$.pipe(
      ofType(checkoutActions.menuChanged),
      map(() => menuActions.load())
    )
  );

  saveAttempt$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          checkoutActions.attemptStarted,
          checkoutActions.orderPlaced,
          checkoutActions.menuChanged,
          checkoutActions.failed
        ),
        concatLatestFrom(() => this.store.select(checkoutFeature.selectAttempt)),
        tap(([, attempt]) => this.saveAttempt(attempt))
      ),
    { dispatch: false }
  );

  ngrxOnInitEffects(): Action {
    return checkoutActions.restored({
      attempt: this.storage.get<CheckoutAttempt>(CHECKOUT_STORAGE_KEY)
    });
  }

  private saveAttempt(attempt: CheckoutAttempt | null): void {
    if (attempt) {
      this.storage.set(CHECKOUT_STORAGE_KEY, attempt);
    } else {
      this.storage.remove(CHECKOUT_STORAGE_KEY);
    }
  }

  // The same cart reuses the key of an unanswered attempt; any change gets a new one.
  private toAttempt(request: PlaceOrderRequest, previous: CheckoutAttempt | null): CheckoutAttempt {
    const isRetry = previous !== null && isSameOrder(previous.request, request);
    return { key: isRetry ? previous.key : crypto.randomUUID(), request };
  }

  private place(attempt: CheckoutAttempt, cart: CartState) {
    return concat(
      of(checkoutActions.attemptStarted({ attempt })),
      this.api.placeOrder(attempt.request, attempt.key).pipe(
        map((order) => checkoutActions.orderPlaced({ order })),
        catchError((error: unknown) => of(this.toFailure(error, cart)))
      )
    );
  }

  private toFailure(error: unknown, cart: CartState): Action {
    if (error instanceof RequestError && error.apiError?.code === ApiErrorCode.MenuChanged) {
      const changes: CartChange[] = error.apiError.changes;
      return checkoutActions.menuChanged({ changes, described: describeChanges(changes, cart) });
    }
    const isConnection = error instanceof RequestError && error.isConnectionProblem;
    return checkoutActions.failed({
      kind: isConnection ? CheckoutErrorKind.Connection : CheckoutErrorKind.Server
    });
  }
}
