import { inject, Injectable } from '@angular/core';

import { catchError, map, mergeMap, of, type Observable } from 'rxjs';

import { Actions, createEffect, ofType } from '@ngrx/effects';
import type { Action } from '@ngrx/store';

import { ApiErrorCode, type Order, type OrderStatus } from '@restaurant/contracts';
import { OrdersApiService, RequestError, requestErrorMessage } from '@shared/data-access';

import { adminOrdersActions } from './admin-orders.actions';

const CONFLICT_CODES = [ApiErrorCode.VersionConflict, ApiErrorCode.InvalidTransition];

@Injectable()
export class OrderStatusEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(OrdersApiService);

  changeStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(adminOrdersActions.changeStatus),
      mergeMap(({ order, target }) =>
        this.api.changeStatus(order.id, { status: target, expectedVersion: order.version }).pipe(
          map((saved) => adminOrdersActions.statusChanged({ order: saved })),
          catchError((error: unknown) => this.handleFailure(order, target, error))
        )
      )
    )
  );

  private handleFailure(order: Order, target: OrderStatus, error: unknown): Observable<Action> {
    return this.isConflict(error)
      ? this.refetchAfterConflict(order, target)
      : of(this.toFailed(order, target, error));
  }

  // A 409 carries no order (§7), so the latest state comes from a fresh list.
  private refetchAfterConflict(order: Order, target: OrderStatus): Observable<Action> {
    return this.api.listAll().pipe(
      mergeMap((snapshot): Action[] => {
        const latest = snapshot.orders.find(({ id }) => id === order.id) ?? null;
        return [
          adminOrdersActions.loadSucceeded({ snapshot }),
          latest?.status === target
            ? adminOrdersActions.statusChanged({ order: latest })
            : adminOrdersActions.statusConflict({ order, latest })
        ];
      }),
      catchError((error: unknown) => of(this.toFailed(order, target, error)))
    );
  }

  private toFailed(order: Order, target: OrderStatus, error: unknown): Action {
    return adminOrdersActions.statusChangeFailed({
      order,
      target,
      error: requestErrorMessage(error)
    });
  }

  private isConflict(error: unknown): boolean {
    return (
      error instanceof RequestError &&
      error.apiError !== null &&
      CONFLICT_CODES.includes(error.apiError.code)
    );
  }
}
