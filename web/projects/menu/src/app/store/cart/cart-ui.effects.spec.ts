import { TestBed } from '@angular/core/testing';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Router } from '@angular/router';

import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';

import { provideMockActions } from '@ngrx/effects/testing';
import type { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { CartChangeKind } from '@restaurant/contracts';
import { LayoutService, NotificationService, SheetService } from '@shared/ui';
import { CartPanelComponent } from '@menu/components/blocks/cart-panel/cart-panel.component';
import { makeLineView } from '@menu/testing/cart';
import { makeItem } from '@menu/testing/menu';

import { CartUiEffects } from './cart-ui.effects';
import { cartActions } from './cart.actions';
import { cartFeature } from './cart.reducer';

describe('CartUiEffects', () => {
  let actions$: ReplaySubject<Action>;
  let isMobile$: BehaviorSubject<boolean>;
  let closed$: Subject<void>;
  let open: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.fn>;
  let url: string;
  let show: ReturnType<typeof vi.fn>;
  let viewed$: Subject<void>;
  let announce: ReturnType<typeof vi.fn>;

  function create(): CartUiEffects {
    TestBed.configureTestingModule({
      providers: [
        CartUiEffects,
        provideMockActions(() => actions$),
        provideMockStore({ selectors: [{ selector: cartFeature.selectLineViews, value: [] }] }),
        { provide: NotificationService, useValue: { show } },
        { provide: LiveAnnouncer, useValue: { announce } },
        { provide: LayoutService, useValue: { isMobile$ } },
        { provide: SheetService, useValue: { open } },
        {
          provide: Router,
          useValue: {
            get url() {
              return url;
            },
            navigateByUrl
          }
        }
      ]
    });
    return TestBed.inject(CartUiEffects);
  }

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>();
    isMobile$ = new BehaviorSubject(true);
    closed$ = new Subject<void>();
    open = vi.fn(() => ({ closed$ }));
    navigateByUrl = vi.fn(() => Promise.resolve(true));
    url = '/';
    viewed$ = new Subject<void>();
    show = vi.fn(() => viewed$);
    announce = vi.fn(() => Promise.resolve());
  });

  it('says the cart changed when a line gets a new flag, and View cart opens it', () => {
    const effects = create();
    const store = TestBed.inject(MockStore);
    const received: Action[] = [];
    effects.notifyCartChanges$.subscribe((action) => received.push(action));
    const flagged = makeLineView({ issue: CartChangeKind.PriceChanged });

    store.overrideSelector(cartFeature.selectLineViews, [flagged]);
    store.refreshState();
    store.overrideSelector(cartFeature.selectLineViews, [flagged, makeLineView({ key: 'b' })]);
    store.refreshState();

    expect(show).toHaveBeenCalledExactlyOnceWith(
      'Some items in your cart changed — please check your cart',
      { action: 'View cart' }
    );
    viewed$.next();
    expect(received).toEqual([cartActions.openRequested()]);
    store.resetSelectors();
  });

  it('opens one cart sheet on mobile until it is closed', () => {
    create().openCart$.subscribe();

    actions$.next(cartActions.openRequested());
    actions$.next(cartActions.openRequested());
    expect(open).toHaveBeenCalledExactlyOnceWith(CartPanelComponent);

    closed$.next();
    actions$.next(cartActions.openRequested());
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('leaves desktop to the panel on the menu page', () => {
    isMobile$.next(false);
    create().openCart$.subscribe();

    actions$.next(cartActions.openRequested());

    expect(open).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('goes back to the menu first from another page', () => {
    isMobile$.next(false);
    url = '/orders';
    create().openCart$.subscribe();

    actions$.next(cartActions.openRequested());

    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('announces additions and discounts', () => {
    const effects = create();
    effects.announceItemAdded$.subscribe();
    effects.announceOpenPriceItemAdded$.subscribe();
    effects.announceDiscountApplied$.subscribe();
    effects.announceDiscountRemoved$.subscribe();

    actions$.next(cartActions.itemAdded({ item: makeItem() }));
    actions$.next(
      cartActions.openPriceItemAdded({ item: makeItem({ name: 'Cake' }), price: 1250, quantity: 1 })
    );
    actions$.next(cartActions.discountApplied({ discount: 500 }));
    actions$.next(cartActions.discountRemoved());

    expect(announce.mock.calls.map(([message]) => message)).toEqual([
      'Miso added to cart',
      'Cake added to cart at $12.50',
      'Discount of $5.00 applied',
      'Discount removed'
    ]);
  });
});
