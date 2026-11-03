import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { switchMap, take, tap } from 'rxjs';

import { Actions, createEffect, ofType } from '@ngrx/effects';

import { NotificationService, STATUS_CHIP } from '@shared/ui';
import { MY_ORDERS_URL } from '@menu/config/my-orders.config';
import { statusNotice } from '@menu/helpers/my-orders';

import { myOrdersActions } from './my-orders.actions';

// Lives with the lazy routes, so the snackbar (Material) stays out of the initial bundle.
@Injectable()
export class MyOrdersUiEffects {
  private readonly actions$ = inject(Actions);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  notify$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(myOrdersActions.statusesChanged),
        switchMap(({ orders }) => {
          const options = this.router.url === MY_ORDERS_URL ? {} : { action: 'View' };
          return this.notifications.show(statusNotice(orders, STATUS_CHIP), options).pipe(take(1));
        }),
        tap(() => void this.router.navigateByUrl(MY_ORDERS_URL))
      ),
    { dispatch: false }
  );
}
