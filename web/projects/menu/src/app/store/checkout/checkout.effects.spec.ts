import { TestBed } from '@angular/core/testing';

import { of, ReplaySubject, Subject, throwError, type Observable } from 'rxjs';

import { provideMockActions } from '@ngrx/effects/testing';
import type { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import {
  ApiErrorCode,
  CartChangeKind,
  type Order,
  type PlaceOrderRequest
} from '@restaurant/contracts';
import { menuActions, OrdersApiService, RequestError, StorageService } from '@shared/data-access';
import { makeOrder } from '@shared/data-access/testing/orders';
import { CHECKOUT_STORAGE_KEY } from '@menu/config/checkout.config';
import type { CartState } from '@menu/models/cart.model';
import { CheckoutErrorKind, type CheckoutAttempt } from '@menu/models/checkout.model';
import { cartFeature } from '@menu/store/cart/cart.reducer';

import { checkoutActions } from './checkout.actions';
import { CheckoutEffects } from './checkout.effects';
import { checkoutFeature } from './checkout.reducer';

const request: PlaceOrderRequest = {
  lines: [{ itemId: 'miso', quantity: 2, unitPrice: 450, isOpenPrice: false, itemVersion: 1 }],
  discount: 0
};
const cart: CartState = {
  lines: [
    { key: 'miso', itemId: 'miso', name: 'Miso', quantity: 2, customPrice: null, seenPrice: 450 }
  ],
  discount: 0
};

describe('CheckoutEffects', () => {
  let actions$: ReplaySubject<Action>;
  let placeOrder: ReturnType<typeof vi.fn>;
  let get: ReturnType<typeof vi.fn>;
  let set: ReturnType<typeof vi.fn>;
  let remove: ReturnType<typeof vi.fn>;

  function create(
    state: { request?: PlaceOrderRequest | null; attempt?: CheckoutAttempt | null } = {}
  ): CheckoutEffects {
    TestBed.configureTestingModule({
      providers: [
        CheckoutEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [
            {
              selector: checkoutFeature.selectOrderRequest,
              value: state.request === undefined ? request : state.request
            },
            { selector: checkoutFeature.selectAttempt, value: state.attempt ?? null },
            { selector: cartFeature.selectCartState, value: cart }
          ]
        }),
        { provide: OrdersApiService, useValue: { placeOrder } },
        { provide: StorageService, useValue: { get, set, remove } }
      ]
    });
    return TestBed.inject(CheckoutEffects);
  }

  function collect(effect$: Observable<Action>): Action[] {
    const received: Action[] = [];
    effect$.subscribe((action) => received.push(action));
    return received;
  }

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>();
    placeOrder = vi.fn(() => of(makeOrder()));
    get = vi.fn(() => null);
    set = vi.fn();
    remove = vi.fn();
  });

  afterEach(() => {
    TestBed.inject(MockStore).resetSelectors();
  });

  it('places the order with a fresh key', () => {
    const received = collect(create().placeOrder$);

    actions$.next(checkoutActions.placeOrder());

    const [request_, key] = placeOrder.mock.calls[0] ?? [];
    expect(request_).toEqual(request);
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(received).toEqual([
      checkoutActions.attemptStarted({ attempt: { key, request } }),
      checkoutActions.orderPlaced({ order: makeOrder() })
    ]);
  });

  it('reuses the key of an unanswered attempt for the same order', () => {
    const attempt = {
      key: 'kept',
      request: { ...request, lines: [{ ...request.lines[0]!, itemVersion: 9 }] }
    };
    collect(create({ attempt }).placeOrder$);

    actions$.next(checkoutActions.placeOrder());

    expect(placeOrder).toHaveBeenCalledWith(request, 'kept');
  });

  it('takes a new key when the order changed', () => {
    collect(
      create({ attempt: { key: 'old', request: { ...request, discount: 100 } } }).placeOrder$
    );

    actions$.next(checkoutActions.placeOrder());

    expect(placeOrder.mock.calls[0]?.[1]).not.toBe('old');
  });

  it('sends one request however often it is asked while running', () => {
    const response$ = new Subject<Order>();
    placeOrder = vi.fn(() => response$);
    const received = collect(create().placeOrder$);

    actions$.next(checkoutActions.placeOrder());
    actions$.next(checkoutActions.placeOrder());
    response$.next(makeOrder());
    response$.complete();

    expect(placeOrder).toHaveBeenCalledOnce();
    expect(received).toHaveLength(2);
  });

  it('does nothing when there is nothing to order', () => {
    const received = collect(create({ request: null }).placeOrder$);

    actions$.next(checkoutActions.placeOrder());

    expect(placeOrder).not.toHaveBeenCalled();
    expect(received).toEqual([]);
  });

  it('reports menu changes with names, a lost connection and a server error', () => {
    const changes = [{ kind: CartChangeKind.Unavailable as const, itemId: 'miso' }];
    placeOrder = vi.fn(() =>
      throwError(
        () =>
          new RequestError(
            409,
            { code: ApiErrorCode.MenuChanged, message: 'Changed', changes },
            'Changed'
          )
      )
    );
    const received = collect(create().placeOrder$);
    actions$.next(checkoutActions.placeOrder());

    placeOrder.mockReturnValue(throwError(() => new RequestError(0, null, 'Offline')));
    actions$.next(checkoutActions.placeOrder());
    placeOrder.mockReturnValue(throwError(() => new RequestError(500, null, 'Oops')));
    actions$.next(checkoutActions.placeOrder());

    expect(
      received.filter((action) => action.type !== checkoutActions.attemptStarted.type)
    ).toEqual([
      checkoutActions.menuChanged({
        changes,
        described: [
          { kind: CartChangeKind.Unavailable, name: 'Miso', oldAmount: null, newAmount: null }
        ]
      }),
      checkoutActions.failed({ kind: CheckoutErrorKind.Connection }),
      checkoutActions.failed({ kind: CheckoutErrorKind.Server })
    ]);
  });

  it('reloads the menu after a conflict', () => {
    const received = collect(create().reloadMenuAfterConflict$);

    actions$.next(checkoutActions.failed({ kind: CheckoutErrorKind.Server }));
    expect(received).toEqual([]);

    actions$.next(checkoutActions.menuChanged({ changes: [], described: [] }));
    expect(received).toEqual([menuActions.load()]);
  });

  it('restores the saved attempt', () => {
    const attempt = { key: 'k', request };
    get.mockReturnValue(attempt);

    expect(create().ngrxOnInitEffects()).toEqual(checkoutActions.restored({ attempt }));
  });

  it('saves the attempt whenever it may change', () => {
    const attempt = { key: 'k', request };
    create({ attempt }).saveAttempt$.subscribe();

    actions$.next(checkoutActions.attemptStarted({ attempt }));
    actions$.next(checkoutActions.failed({ kind: CheckoutErrorKind.Connection }));
    actions$.next(checkoutActions.opened());

    expect(set).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenCalledWith(CHECKOUT_STORAGE_KEY, attempt);
  });

  it('removes the saved attempt once it is cleared', () => {
    create({ attempt: null }).saveAttempt$.subscribe();

    actions$.next(checkoutActions.orderPlaced({ order: makeOrder() }));

    expect(remove).toHaveBeenCalledExactlyOnceWith(CHECKOUT_STORAGE_KEY);
    expect(set).not.toHaveBeenCalled();
  });
});
