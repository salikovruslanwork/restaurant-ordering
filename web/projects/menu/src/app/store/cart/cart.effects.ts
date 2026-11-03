import { inject, Injectable } from '@angular/core';

import { skip, tap } from 'rxjs';

import { createEffect, type OnInitEffects } from '@ngrx/effects';
import { Store, type Action } from '@ngrx/store';

import { StorageService } from '@shared/data-access';
import { CART_STORAGE_KEY } from '@menu/config/cart.config';
import type { CartState } from '@menu/models/cart.model';

import { cartActions } from './cart.actions';
import { cartFeature } from './cart.reducer';

@Injectable()
export class CartEffects implements OnInitEffects {
  private readonly store = inject(Store);
  private readonly storage = inject(StorageService);

  persist$ = createEffect(
    () =>
      this.store.select(cartFeature.selectCartState).pipe(
        skip(1),
        tap((state) => this.storage.set(CART_STORAGE_KEY, state))
      ),
    { dispatch: false }
  );

  ngrxOnInitEffects(): Action {
    const state = this.storage.get<CartState>(CART_STORAGE_KEY);
    return cartActions.restored({ state: state ?? { lines: [], discount: 0 } });
  }
}
