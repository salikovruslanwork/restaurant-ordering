import { inject, Injectable } from '@angular/core';

import { filter, map, mergeMap, pairwise, switchMap, timer } from 'rxjs';

import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom, mapResponse } from '@ngrx/operators';
import { Store } from '@ngrx/store';

import {
  connectionActions,
  LoadStatus,
  menuActions,
  menuFeature,
  OrdersApiService,
  requestErrorMessage
} from '@shared/data-access';
import { ORDER_FRESH_MS } from '@menu/config/my-orders.config';
import { findStatusChanges } from '@menu/helpers/my-orders';

import { myOrdersActions } from './my-orders.actions';
import { myOrdersFeature } from './my-orders.reducer';

@Injectable()
export class MyOrdersEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(OrdersApiService);

  // Loading after every menu snapshot keeps the orders' seq at or after the stream's `since`.
  loadAfterMenu$ = createEffect(() =>
    this.actions$.pipe(
      ofType(menuActions.loadSucceeded),
      map(() => myOrdersActions.load())
    )
  );

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(myOrdersActions.load),
      switchMap(() =>
        this.api.listMine().pipe(
          mapResponse({
            next: (snapshot) => myOrdersActions.loadSucceeded({ snapshot }),
            error: (error) => myOrdersActions.loadFailed({ message: requestErrorMessage(error) })
          })
        )
      )
    )
  );

  // Orders wait for the menu, so a failed menu load leaves them failed too, not loading forever.
  failWithMenu$ = createEffect(() =>
    this.actions$.pipe(
      ofType(menuActions.loadFailed),
      concatLatestFrom(() => this.store.select(myOrdersFeature.selectLoadStatus)),
      filter(([, status]) => status !== LoadStatus.Loaded),
      map(([{ message }]) => myOrdersActions.loadFailed({ message }))
    )
  );

  // A failed menu reloads by itself when the browser is back online and brings the orders along.
  retryWhenOnline$ = createEffect(() =>
    this.actions$.pipe(
      ofType(connectionActions.browserOnline),
      concatLatestFrom(() => [
        this.store.select(myOrdersFeature.selectLoadStatus),
        this.store.select(menuFeature.selectLoadStatus)
      ]),
      filter(([, orders, menu]) => orders === LoadStatus.Failed && menu !== LoadStatus.Failed),
      map(() => myOrdersActions.load())
    )
  );

  detectStatusChanges$ = createEffect(() =>
    this.store.select(myOrdersFeature.selectOrderEntities).pipe(
      pairwise(),
      map(([previous, current]) => findStatusChanges(previous, current)),
      filter((orders) => orders.length > 0),
      map((orders) => myOrdersActions.statusesChanged({ orders }))
    )
  );

  endFresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(myOrdersActions.statusesChanged),
      mergeMap(({ orders }) =>
        timer(ORDER_FRESH_MS).pipe(
          map(() => myOrdersActions.freshEnded({ ids: orders.map(({ id }) => id) }))
        )
      )
    )
  );
}
