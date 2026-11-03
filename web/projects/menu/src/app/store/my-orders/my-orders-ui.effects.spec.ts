import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ReplaySubject, Subject } from 'rxjs';

import { provideMockActions } from '@ngrx/effects/testing';
import type { Action } from '@ngrx/store';

import { OrderStatus } from '@restaurant/contracts';
import { makeOrder } from '@shared/data-access/testing/orders';
import { NotificationService } from '@shared/ui';

import { MyOrdersUiEffects } from './my-orders-ui.effects';
import { myOrdersActions } from './my-orders.actions';

describe('MyOrdersUiEffects', () => {
  let actions$: ReplaySubject<Action>;
  let action$: Subject<void>;
  let show: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.fn>;

  function create(url: string): MyOrdersUiEffects {
    TestBed.configureTestingModule({
      providers: [
        MyOrdersUiEffects,
        provideMockActions(() => actions$),
        { provide: NotificationService, useValue: { show } },
        { provide: Router, useValue: { url, navigateByUrl } }
      ]
    });
    return TestBed.inject(MyOrdersUiEffects);
  }

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>();
    action$ = new Subject();
    show = vi.fn(() => action$);
    navigateByUrl = vi.fn();
  });

  it('tells about a status change with View, which opens My orders', () => {
    create('/').notify$.subscribe();

    actions$.next(
      myOrdersActions.statusesChanged({ orders: [makeOrder({ status: OrderStatus.Ready })] })
    );

    expect(show).toHaveBeenCalledWith('Order #1001 is now Ready', { action: 'View' });
    expect(navigateByUrl).not.toHaveBeenCalled();

    action$.next();
    expect(navigateByUrl).toHaveBeenCalledWith('/orders');
  });

  it('offers no View action on the My orders page', () => {
    create('/orders').notify$.subscribe();

    actions$.next(myOrdersActions.statusesChanged({ orders: [makeOrder()] }));

    expect(show).toHaveBeenCalledWith('Order #1001 is now Placed', {});
  });
});
