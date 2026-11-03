import { inject, Injectable } from '@angular/core';

import { filter, map, merge, mergeMap, switchMap, timer } from 'rxjs';

import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom, mapResponse } from '@ngrx/operators';
import { Store } from '@ngrx/store';

import { ServerEventType } from '@restaurant/contracts';
import {
  connectionActions,
  LoadStatus,
  menuActions,
  OrdersApiService,
  realtimeActions,
  requestErrorMessage
} from '@shared/data-access';
import { ORDER_FRESH_MS } from '@admin/config/orders.config';

import { adminOrdersActions } from './admin-orders.actions';
import { adminOrdersFeature } from './admin-orders.reducer';

@Injectable()
export class AdminOrdersEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(OrdersApiService);

  // Loading after every menu snapshot keeps the orders' seq at or after the stream's `since`,
  // so no order event can fall between the two.
  loadAfterMenu$ = createEffect(() =>
    this.actions$.pipe(
      ofType(menuActions.loadSucceeded),
      map(() => adminOrdersActions.load())
    )
  );

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(adminOrdersActions.load),
      switchMap(() =>
        this.api.listAll().pipe(
          mapResponse({
            next: (snapshot) => adminOrdersActions.loadSucceeded({ snapshot }),
            error: (error) => adminOrdersActions.loadFailed({ message: requestErrorMessage(error) })
          })
        )
      )
    )
  );

  retryWhenOnline$ = createEffect(() =>
    this.actions$.pipe(
      ofType(connectionActions.browserOnline),
      concatLatestFrom(() => this.store.select(adminOrdersFeature.selectLoadStatus)),
      filter(([, status]) => status === LoadStatus.Failed),
      map(() => adminOrdersActions.load())
    )
  );

  endFresh$ = createEffect(() =>
    merge(
      this.actions$.pipe(ofType(adminOrdersActions.loadSucceeded)),
      this.actions$.pipe(
        ofType(realtimeActions.eventReceived),
        filter(({ envelope }) => envelope.event.type === ServerEventType.OrderCreated)
      )
    ).pipe(
      concatLatestFrom(() => this.store.select(adminOrdersFeature.selectFreshIds)),
      filter(([, ids]) => ids.length > 0),
      mergeMap(([, ids]) =>
        timer(ORDER_FRESH_MS).pipe(map(() => adminOrdersActions.freshEnded({ ids })))
      )
    )
  );
}
