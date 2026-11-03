import { TestBed } from '@angular/core/testing';

import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { StorageService } from '@shared/data-access';
import { CART_STORAGE_KEY } from '@menu/config/cart.config';
import type { CartState } from '@menu/models/cart.model';

import { cartActions } from './cart.actions';
import { CartEffects } from './cart.effects';
import { cartFeature } from './cart.reducer';

const saved: CartState = { lines: [], discount: 200 };

describe('CartEffects', () => {
  let get: ReturnType<typeof vi.fn>;
  let set: ReturnType<typeof vi.fn>;

  function create(): CartEffects {
    TestBed.configureTestingModule({
      providers: [
        CartEffects,
        provideMockStore({ selectors: [{ selector: cartFeature.selectCartState, value: saved }] }),
        { provide: StorageService, useValue: { get, set } }
      ]
    });
    return TestBed.inject(CartEffects);
  }

  beforeEach(() => {
    get = vi.fn(() => saved);
    set = vi.fn();
  });

  afterEach(() => {
    TestBed.inject(MockStore).resetSelectors();
  });

  it('restores the saved cart', () => {
    expect(create().ngrxOnInitEffects()).toEqual(cartActions.restored({ state: saved }));
  });

  it('starts empty when nothing was saved', () => {
    get.mockReturnValue(null);

    expect(create().ngrxOnInitEffects()).toEqual(
      cartActions.restored({ state: { lines: [], discount: 0 } })
    );
  });

  it('saves the cart when it changes, but not on start', () => {
    create().persist$.subscribe();
    expect(set).not.toHaveBeenCalled();

    const store = TestBed.inject(MockStore);
    const changed: CartState = { lines: [], discount: 300 };
    store.overrideSelector(cartFeature.selectCartState, changed);
    store.refreshState();

    expect(set).toHaveBeenCalledExactlyOnceWith(CART_STORAGE_KEY, changed);
  });
});
