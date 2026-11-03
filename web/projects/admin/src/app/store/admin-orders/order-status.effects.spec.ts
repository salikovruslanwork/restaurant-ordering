import { TestBed } from '@angular/core/testing';

import { of, ReplaySubject, throwError, type Observable } from 'rxjs';

import { provideMockActions } from '@ngrx/effects/testing';
import type { Action } from '@ngrx/store';

import { ApiErrorCode, OrderStatus } from '@restaurant/contracts';
import { OrdersApiService, RequestError } from '@shared/data-access';
import { makeOrder } from '@shared/data-access/testing/orders';

import { adminOrdersActions } from './admin-orders.actions';
import { OrderStatusEffects } from './order-status.effects';

const order = makeOrder();
const preparing = { ...order, status: OrderStatus.Preparing, version: 2 };
const conflict = new RequestError(
  409,
  { code: ApiErrorCode.VersionConflict, message: 'This order was changed by someone else.' },
  'This order was changed by someone else.'
);

describe('OrderStatusEffects', () => {
  let actions$: ReplaySubject<Action>;
  let changeStatus: ReturnType<typeof vi.fn>;
  let listAll: ReturnType<typeof vi.fn>;

  function create(): OrderStatusEffects {
    TestBed.configureTestingModule({
      providers: [
        OrderStatusEffects,
        provideMockActions(() => actions$),
        { provide: OrdersApiService, useValue: { changeStatus, listAll } }
      ]
    });
    return TestBed.inject(OrderStatusEffects);
  }

  function collect(effect$: Observable<Action>): Action[] {
    const received: Action[] = [];
    effect$.subscribe((action) => received.push(action));
    return received;
  }

  const change = () =>
    actions$.next(adminOrdersActions.changeStatus({ order, target: OrderStatus.Preparing }));

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>();
    changeStatus = vi.fn(() => of(preparing));
    listAll = vi.fn(() => of({ orders: [preparing], seq: 9 }));
  });

  it('sends the target with the version it was based on', () => {
    const received = collect(create().changeStatus$);

    change();

    expect(changeStatus).toHaveBeenCalledWith(order.id, {
      status: OrderStatus.Preparing,
      expectedVersion: 1
    });
    expect(received).toEqual([adminOrdersActions.statusChanged({ order: preparing })]);
  });

  it('rolls back without a refetch when the connection fails', () => {
    changeStatus = vi.fn(() => throwError(() => new RequestError(0, null, 'Offline')));
    const received = collect(create().changeStatus$);

    change();

    expect(listAll).not.toHaveBeenCalled();
    expect(received).toEqual([
      adminOrdersActions.statusChangeFailed({
        order,
        target: OrderStatus.Preparing,
        error: 'Offline'
      })
    ]);
  });

  it('treats a 409 as success when the order already has the target status', () => {
    changeStatus = vi.fn(() => throwError(() => conflict));
    const received = collect(create().changeStatus$);

    change();

    expect(received).toEqual([
      adminOrdersActions.loadSucceeded({ snapshot: { orders: [preparing], seq: 9 } }),
      adminOrdersActions.statusChanged({ order: preparing })
    ]);
  });

  it('rolls back to the latest order after a real conflict or an invalid transition', () => {
    const cancelled = { ...order, status: OrderStatus.Cancelled, version: 2 };
    const invalid = new RequestError(
      422,
      { code: ApiErrorCode.InvalidTransition, message: 'Not allowed' },
      'Not allowed'
    );
    changeStatus = vi.fn(() => throwError(() => invalid));
    listAll = vi.fn(() => of({ orders: [cancelled], seq: 9 }));
    const received = collect(create().changeStatus$);

    change();

    expect(received[1]).toEqual(adminOrdersActions.statusConflict({ order, latest: cancelled }));
  });

  it('rolls back when the refetch after a conflict fails too', () => {
    changeStatus = vi.fn(() => throwError(() => conflict));
    listAll = vi.fn(() => throwError(() => new RequestError(0, null, 'Offline')));
    const received = collect(create().changeStatus$);

    change();

    expect(received).toEqual([
      adminOrdersActions.statusChangeFailed({
        order,
        target: OrderStatus.Preparing,
        error: 'Offline'
      })
    ]);
  });
});
