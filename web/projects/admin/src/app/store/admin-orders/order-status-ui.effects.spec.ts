import { TestBed } from '@angular/core/testing';
import { LiveAnnouncer } from '@angular/cdk/a11y';

import { ReplaySubject, Subject, type Observable } from 'rxjs';

import { provideMockActions } from '@ngrx/effects/testing';
import type { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { OrderStatus } from '@restaurant/contracts';
import { makeOrder } from '@shared/data-access/testing/orders';
import { NotificationKind, NotificationService } from '@shared/ui';

import { adminOrdersActions } from './admin-orders.actions';
import { adminOrdersFeature } from './admin-orders.reducer';
import { OrderStatusUiEffects } from './order-status-ui.effects';

const order = makeOrder();
const preparing = { ...order, status: OrderStatus.Preparing, version: 2 };

describe('OrderStatusUiEffects', () => {
  let actions$: ReplaySubject<Action>;
  let show: ReturnType<typeof vi.fn>;
  let retry$: Subject<void>;
  let announce: ReturnType<typeof vi.fn>;

  function create(): OrderStatusUiEffects {
    TestBed.configureTestingModule({
      providers: [
        OrderStatusUiEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [
            {
              selector: adminOrdersFeature.selectOrders,
              value: { ids: [order.id], entities: { [order.id]: order } }
            }
          ]
        }),
        { provide: NotificationService, useValue: { show } },
        { provide: LiveAnnouncer, useValue: { announce } }
      ]
    });
    return TestBed.inject(OrderStatusUiEffects);
  }

  function collect(effect$: Observable<Action>): Action[] {
    const received: Action[] = [];
    effect$.subscribe((action) => received.push(action));
    return received;
  }

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>();
    retry$ = new Subject<void>();
    show = vi.fn(() => retry$);
    announce = vi.fn(() => Promise.resolve());
  });

  afterEach(() => {
    TestBed.inject(MockStore).resetSelectors();
  });

  it('announces a saved status', () => {
    create().announceChanged$.subscribe();

    actions$.next(adminOrdersActions.statusChanged({ order: preparing }));

    expect(announce).toHaveBeenCalledWith('Order #1001: Preparing');
  });

  it('explains a conflict', () => {
    create().reportConflict$.subscribe();

    actions$.next(adminOrdersActions.statusConflict({ order, latest: null }));

    expect(show).toHaveBeenCalledWith('Order #1001 was updated by someone else — showing latest');
  });

  it('offers a retry that sends the order as it is now', () => {
    const received = collect(create().offerRetry$);

    actions$.next(
      adminOrdersActions.statusChangeFailed({
        order: { ...order, version: 0 },
        target: OrderStatus.Preparing,
        error: 'Offline'
      })
    );
    expect(show).toHaveBeenCalledWith('Couldn’t update order #1001. Offline', {
      action: 'Retry',
      kind: NotificationKind.Error
    });
    expect(received).toEqual([]);

    retry$.next();
    retry$.next();

    expect(received).toEqual([
      adminOrdersActions.changeStatus({ order, target: OrderStatus.Preparing })
    ]);
  });
});
