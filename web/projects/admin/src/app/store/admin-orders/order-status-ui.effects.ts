import { inject, Injectable } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';

import { map, mergeMap, take, tap } from 'rxjs';

import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';

import { NotificationKind, NotificationService, STATUS_CHIP } from '@shared/ui';

import { adminOrdersActions } from './admin-orders.actions';
import { adminOrdersFeature } from './admin-orders.reducer';

@Injectable()
export class OrderStatusUiEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly notifications = inject(NotificationService);
  private readonly announcer = inject(LiveAnnouncer);

  announceChanged$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(adminOrdersActions.statusChanged),
        tap(({ order }) => {
          void this.announcer.announce(
            `Order #${order.number}: ${STATUS_CHIP[order.status].label}`
          );
        })
      ),
    { dispatch: false }
  );

  reportConflict$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(adminOrdersActions.statusConflict),
        tap(({ order }) =>
          this.notifications.show(
            `Order #${order.number} was updated by someone else — showing latest`
          )
        )
      ),
    { dispatch: false }
  );

  // Retry sends the order as it is now; if the first request did get through, the 409 that
  // follows is recognised as success in OrderStatusEffects.
  offerRetry$ = createEffect(() =>
    this.actions$.pipe(
      ofType(adminOrdersActions.statusChangeFailed),
      mergeMap(({ order, target, error }) =>
        this.notifications
          .show(`Couldn’t update order #${order.number}. ${error}`, {
            action: 'Retry',
            kind: NotificationKind.Error
          })
          .pipe(
            take(1),
            concatLatestFrom(() => this.store.select(adminOrdersFeature.selectOrders)),
            map(([, orders]) =>
              adminOrdersActions.changeStatus({ order: orders.entities[order.id] ?? order, target })
            )
          )
      )
    )
  );
}
