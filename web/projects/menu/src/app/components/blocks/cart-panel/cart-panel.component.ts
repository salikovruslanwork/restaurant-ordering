import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { filter, from, switchMap, take } from 'rxjs';

import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';

import type { Cents } from '@restaurant/contracts';
import {
  ButtonComponent,
  ButtonVariant,
  DialogRef,
  DialogService,
  DialogSize,
  EmptyStateComponent,
  IconComponent,
  MoneyPipe,
  PluralizePipe
} from '@shared/ui';
import { CartDiscountComponent } from '@menu/components/blocks/cart-discount/cart-discount.component';
import { CartLineComponent } from '@menu/components/blocks/cart-line/cart-line.component';
import { CartSummaryComponent } from '@menu/components/blocks/cart-summary/cart-summary.component';
import { CHECKOUT_BLOCK_HINTS } from '@menu/config/checkout.config';
import { cartActions } from '@menu/store/cart/cart.actions';
import { cartFeature } from '@menu/store/cart/cart.reducer';
import { checkoutActions } from '@menu/store/checkout/checkout.actions';
import { checkoutFeature } from '@menu/store/checkout/checkout.reducer';

@Component({
  selector: 'app-cart-panel',
  imports: [
    ButtonComponent,
    CartDiscountComponent,
    CartLineComponent,
    CartSummaryComponent,
    EmptyStateComponent,
    IconComponent,
    MoneyPipe,
    PluralizePipe
  ],
  templateUrl: './cart-panel.component.html',
  styleUrl: './cart-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartPanelComponent {
  private readonly store = inject(Store);
  // Opened through SheetService on mobile, the panel itself is the sheet.
  private readonly sheetRef = inject(DialogRef, { optional: true });
  private readonly title = viewChild.required<ElementRef<HTMLElement>>('title');

  protected readonly ButtonVariant = ButtonVariant;
  protected readonly isSheet = this.sheetRef !== null;
  protected readonly lines = this.store.selectSignal(cartFeature.selectLineViews);
  protected readonly summary = this.store.selectSignal(cartFeature.selectSummary);
  protected readonly discount = this.store.selectSignal(cartFeature.selectDiscount);
  protected readonly block = this.store.selectSignal(checkoutFeature.selectBlock);
  protected readonly blockHints = CHECKOUT_BLOCK_HINTS;
  private readonly dialog = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    inject(Actions)
      .pipe(ofType(cartActions.openRequested), takeUntilDestroyed())
      .subscribe(() => this.focusTitle());
  }

  protected close(): void {
    this.sheetRef?.close();
  }

  protected checkout(): void {
    this.store.dispatch(checkoutActions.opened());
    from(import('@menu/components/dialogs/checkout-dialog/checkout-dialog.component'))
      .pipe(
        switchMap(
          ({ CheckoutDialogComponent }) =>
            this.dialog.open<boolean>(CheckoutDialogComponent, {
              size: DialogSize.Medium,
              disableClose: true
            }).closed$
        ),
        take(1),
        filter(Boolean),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.sheetRef?.close());
  }

  protected changeQuantity(key: string, quantity: number): void {
    this.store.dispatch(cartActions.quantityChanged({ key, quantity }));
  }

  protected remove(key: string): void {
    this.store.dispatch(cartActions.lineRemoved({ key }));
    this.focusTitle();
  }

  protected applyDiscount(discount: Cents): void {
    this.store.dispatch(cartActions.discountApplied({ discount }));
  }

  protected removeDiscount(): void {
    this.store.dispatch(cartActions.discountRemoved());
  }

  private focusTitle(): void {
    this.title().nativeElement.focus();
  }
}
