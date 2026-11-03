import { TestBed } from '@angular/core/testing';

import { of, ReplaySubject, throwError, type Observable } from 'rxjs';

import { provideMockActions } from '@ngrx/effects/testing';
import type { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { ServerEventType } from '@restaurant/contracts';
import {
  connectionActions,
  LoadStatus,
  menuActions,
  OrdersApiService,
  realtimeActions,
  RequestError
} from '@shared/data-access';
import { makeOrder } from '@shared/data-access/testing/orders';
import { ORDER_FRESH_MS } from '@admin/config/orders.config';

import { adminOrdersActions } from './admin-orders.actions';
import { AdminOrdersEffects } from './admin-orders.effects';
import { adminOrdersFeature } from './admin-orders.reducer';

const snapshot = { orders: [makeOrder()], seq: 7 };

describe('AdminOrdersEffects', () => {
  let actions$: ReplaySubject<Action>;
  let listAll: ReturnType<typeof vi.fn>;

  function create(loadStatus = LoadStatus.Loaded, freshIds: string[] = []): AdminOrdersEffects {
    TestBed.configureTestingModule({
      providers: [
        AdminOrdersEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [
            { selector: adminOrdersFeature.selectLoadStatus, value: loadStatus },
            { selector: adminOrdersFeature.selectFreshIds, value: freshIds }
          ]
        }),
        { provide: OrdersApiService, useValue: { listAll } }
      ]
    });
    return TestBed.inject(AdminOrdersEffects);
  }

  function collect(effect$: Observable<Action>): Action[] {
    const received: Action[] = [];
    effect$.subscribe((action) => received.push(action));
    return received;
  }

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>();
    listAll = vi.fn(() => of(snapshot));
  });

  afterEach(() => {
    TestBed.inject(MockStore).resetSelectors();
    vi.useRealTimers();
  });

  it('loads orders after every menu snapshot', () => {
    const received = collect(create().loadAfterMenu$);

    actions$.next(menuActions.loadSucceeded({ snapshot: { categories: [], items: [], seq: 3 } }));

    expect(received).toEqual([adminOrdersActions.load()]);
  });

  it('loads the snapshot and reports failures with a safe message', () => {
    const effects = create();
    const received = collect(effects.load$);
    actions$.next(adminOrdersActions.load());

    listAll.mockReturnValue(throwError(() => new RequestError(0, null, 'Offline')));
    actions$.next(adminOrdersActions.load());

    expect(received).toEqual([
      adminOrdersActions.loadSucceeded({ snapshot }),
      adminOrdersActions.loadFailed({ message: 'Offline' })
    ]);
  });

  it('retries a failed load when the browser is back online', () => {
    const received = collect(create(LoadStatus.Failed).retryWhenOnline$);

    actions$.next(connectionActions.browserOnline());

    expect(received).toEqual([adminOrdersActions.load()]);
  });

  it('doesn’t reload when the last load worked', () => {
    const received = collect(create(LoadStatus.Loaded).retryWhenOnline$);

    actions$.next(connectionActions.browserOnline());

    expect(received).toEqual([]);
  });

  it('ends a highlight after a while', () => {
    vi.useFakeTimers();
    const received = collect(create(LoadStatus.Loaded, ['o2']).endFresh$);

    actions$.next(
      realtimeActions.eventReceived({
        envelope: {
          seq: 8,
          at: '2026-11-02T12:00:00.000Z',
          event: { type: ServerEventType.OrderCreated, order: makeOrder({ id: 'o2' }) }
        }
      })
    );
    actions$.next(
      realtimeActions.eventReceived({
        envelope: {
          seq: 9,
          at: '2026-11-02T12:00:00.000Z',
          event: { type: ServerEventType.CategoryDeleted, id: 'x' }
        }
      })
    );
    expect(received).toEqual([]);

    vi.advanceTimersByTime(ORDER_FRESH_MS);
    expect(received).toEqual([adminOrdersActions.freshEnded({ ids: ['o2'] })]);
  });
});
