import { TestBed } from '@angular/core/testing';

import { of, ReplaySubject, throwError, type Observable } from 'rxjs';

import { provideMockActions } from '@ngrx/effects/testing';
import type { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { OrderStatus } from '@restaurant/contracts';
import {
  connectionActions,
  LoadStatus,
  menuActions,
  menuFeature,
  OrdersApiService,
  RequestError
} from '@shared/data-access';
import { makeOrder } from '@shared/data-access/testing/orders';
import { ORDER_FRESH_MS } from '@menu/config/my-orders.config';

import { myOrdersActions } from './my-orders.actions';
import { MyOrdersEffects } from './my-orders.effects';
import { myOrdersFeature } from './my-orders.reducer';

const snapshot = { orders: [makeOrder()], seq: 7 };

describe('MyOrdersEffects', () => {
  let actions$: ReplaySubject<Action>;
  let listMine: ReturnType<typeof vi.fn>;
  let store: MockStore;

  function create(orders = LoadStatus.Loaded, menu = LoadStatus.Loaded): MyOrdersEffects {
    TestBed.configureTestingModule({
      providers: [
        MyOrdersEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [
            { selector: myOrdersFeature.selectLoadStatus, value: orders },
            { selector: myOrdersFeature.selectOrderEntities, value: {} },
            { selector: menuFeature.selectLoadStatus, value: menu }
          ]
        }),
        { provide: OrdersApiService, useValue: { listMine } }
      ]
    });
    store = TestBed.inject(MockStore);
    return TestBed.inject(MyOrdersEffects);
  }

  function collect(effect$: Observable<Action>): Action[] {
    const received: Action[] = [];
    effect$.subscribe((action) => received.push(action));
    return received;
  }

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>();
    listMine = vi.fn(() => of(snapshot));
  });

  afterEach(() => {
    store.resetSelectors();
    vi.useRealTimers();
  });

  it('loads my orders after every menu snapshot', () => {
    const received = collect(create().loadAfterMenu$);

    actions$.next(menuActions.loadSucceeded({ snapshot: { categories: [], items: [], seq: 3 } }));

    expect(received).toEqual([myOrdersActions.load()]);
  });

  it('loads the snapshot and reports failures with a safe message', () => {
    const received = collect(create().load$);
    actions$.next(myOrdersActions.load());

    listMine.mockReturnValue(throwError(() => new RequestError(0, null, 'Offline')));
    actions$.next(myOrdersActions.load());

    expect(received).toEqual([
      myOrdersActions.loadSucceeded({ snapshot }),
      myOrdersActions.loadFailed({ message: 'Offline' })
    ]);
  });

  it('fails with the menu unless the orders are already loaded', () => {
    const failed = menuActions.loadFailed({ message: 'Offline' });
    const loading = collect(create(LoadStatus.Loading).failWithMenu$);
    actions$.next(failed);
    store.overrideSelector(myOrdersFeature.selectLoadStatus, LoadStatus.Loaded);
    store.refreshState();
    actions$.next(failed);

    expect(loading).toEqual([myOrdersActions.loadFailed({ message: 'Offline' })]);
  });

  it.each([
    [LoadStatus.Failed, LoadStatus.Loaded, 1],
    [LoadStatus.Failed, LoadStatus.Failed, 0],
    [LoadStatus.Loaded, LoadStatus.Loaded, 0]
  ])('when back online with orders %s and menu %s, reloads %i times', (orders, menu, count) => {
    const received = collect(create(orders, menu).retryWhenOnline$);

    actions$.next(connectionActions.browserOnline());

    expect(received).toHaveLength(count);
  });

  it('reports orders whose status changed in the store', () => {
    const received = collect(create().detectStatusChanges$);
    const placed = makeOrder();
    const ready = makeOrder({ status: OrderStatus.Ready, version: 4 });

    store.overrideSelector(myOrdersFeature.selectOrderEntities, { o1: placed });
    store.refreshState();
    store.overrideSelector(myOrdersFeature.selectOrderEntities, { o1: ready });
    store.refreshState();

    expect(received).toEqual([myOrdersActions.statusesChanged({ orders: [ready] })]);
  });

  it('ends the highlight after the pulse', () => {
    vi.useFakeTimers();
    const received = collect(create().endFresh$);

    actions$.next(myOrdersActions.statusesChanged({ orders: [makeOrder()] }));
    vi.advanceTimersByTime(ORDER_FRESH_MS - 1);
    expect(received).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(received).toEqual([myOrdersActions.freshEnded({ ids: ['o1'] })]);
  });
});
