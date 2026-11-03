import { inject, Injectable } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Router } from '@angular/router';

import { filter, map, pairwise, startWith, switchMap, take, tap } from 'rxjs';

import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';

import {
  DialogRef,
  formatMoney,
  LayoutService,
  NotificationService,
  SheetService
} from '@shared/ui';
import { CartPanelComponent } from '@menu/components/blocks/cart-panel/cart-panel.component';
import { CART_CHANGED_ACTION, CART_CHANGED_NOTICE } from '@menu/config/cart.config';
import { lineIssueKeys } from '@menu/helpers/cart';

import { cartActions } from './cart.actions';
import { cartFeature } from './cart.reducer';

// The desktop cart is always on the menu page (it focuses itself); on mobile it opens as a sheet.
@Injectable()
export class CartUiEffects {
  private readonly actions$ = inject(Actions);
  private readonly router = inject(Router);
  private readonly sheets = inject(SheetService);
  private readonly layout = inject(LayoutService);
  private readonly store = inject(Store);
  private readonly notifications = inject(NotificationService);
  private readonly announcer = inject(LiveAnnouncer);
  private sheet: DialogRef | null = null;

  openCart$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(cartActions.openRequested),
        concatLatestFrom(() => this.layout.isMobile$),
        tap(([, isMobile]) => {
          if (this.router.url !== '/') {
            void this.router.navigateByUrl('/');
          }
          if (isMobile) {
            this.openSheet();
          }
        })
      ),
    { dispatch: false }
  );

  // Menu changes that reach a cart line (live or after the connection comes back) are announced
  // once; View cart opens the cart where the lines show what changed.
  notifyCartChanges$ = createEffect(() =>
    this.store.select(cartFeature.selectLineViews).pipe(
      map(lineIssueKeys),
      startWith<string[]>([]),
      pairwise(),
      filter(([previous, current]) => current.some((key) => !previous.includes(key))),
      switchMap(() =>
        this.notifications.show(CART_CHANGED_NOTICE, { action: CART_CHANGED_ACTION }).pipe(take(1))
      ),
      map(() => cartActions.openRequested())
    )
  );

  announceItemAdded$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(cartActions.itemAdded),
        tap(({ item }) => this.announce(`${item.name} added to cart`))
      ),
    { dispatch: false }
  );

  announceOpenPriceItemAdded$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(cartActions.openPriceItemAdded),
        tap(({ item, price }) =>
          this.announce(`${item.name} added to cart at ${formatMoney(price)}`)
        )
      ),
    { dispatch: false }
  );

  announceDiscountApplied$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(cartActions.discountApplied),
        tap(({ discount }) => this.announce(`Discount of ${formatMoney(discount)} applied`))
      ),
    { dispatch: false }
  );

  announceDiscountRemoved$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(cartActions.discountRemoved),
        tap(() => this.announce('Discount removed'))
      ),
    { dispatch: false }
  );

  private announce(message: string): void {
    void this.announcer.announce(message);
  }

  private openSheet(): void {
    if (this.sheet) {
      return;
    }
    const sheet = this.sheets.open(CartPanelComponent);
    this.sheet = sheet;
    sheet.closed$.pipe(take(1)).subscribe(() => {
      this.sheet = null;
    });
  }
}
