import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';

import { take } from 'rxjs';

import { Store } from '@ngrx/store';

import { CartChangeKind } from '@restaurant/contracts';
import {
  ButtonComponent,
  ButtonVariant,
  DIALOG,
  DialogRef,
  DialogSize,
  IconComponent,
  MoneyPipe,
  PluralizePipe
} from '@shared/ui';
import { CartSummaryComponent } from '@menu/components/blocks/cart-summary/cart-summary.component';
import { CHECKOUT_CONNECTION_ICON, CHECKOUT_HEROES } from '@menu/config/checkout-hero.config';
import {
  CHECKOUT_BLOCK_HINTS,
  CHECKOUT_CONFLICT_TEXT,
  CHECKOUT_EMPTY_AFTER_CONFLICT,
  CHECKOUT_ERRORS,
  CHECKOUT_SUCCESS_TEXT
} from '@menu/config/checkout.config';
import { MY_ORDERS_URL } from '@menu/config/my-orders.config';
import {
  CheckoutBlock,
  CheckoutErrorKind,
  CheckoutStep,
  type CheckoutHero
} from '@menu/models/checkout.model';
import { cartFeature } from '@menu/store/cart/cart.reducer';
import { checkoutActions } from '@menu/store/checkout/checkout.actions';
import { checkoutFeature } from '@menu/store/checkout/checkout.reducer';

@Component({
  selector: 'app-checkout-dialog',
  imports: [
    ...DIALOG,
    ButtonComponent,
    CartSummaryComponent,
    IconComponent,
    MoneyPipe,
    NgTemplateOutlet,
    PluralizePipe
  ],
  templateUrl: './checkout-dialog.component.html',
  styleUrl: './checkout-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Opened with disableClose so it can't close mid-submit, so Escape is handled here.
  host: { '(keydown.escape)': 'close()' }
})
export class CheckoutDialogComponent {
  private readonly store = inject(Store);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly router = inject(Router);

  protected readonly CheckoutStep = CheckoutStep;
  protected readonly CartChangeKind = CartChangeKind;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly DialogSize = DialogSize;
  protected readonly conflictText = CHECKOUT_CONFLICT_TEXT;
  protected readonly emptyText = CHECKOUT_EMPTY_AFTER_CONFLICT;
  protected readonly successText = CHECKOUT_SUCCESS_TEXT;

  protected readonly step = this.store.selectSignal(checkoutFeature.selectStep);
  protected readonly changes = this.store.selectSignal(checkoutFeature.selectChanges);
  protected readonly order = this.store.selectSignal(checkoutFeature.selectOrder);
  private readonly errorKind = this.store.selectSignal(checkoutFeature.selectErrorKind);
  protected readonly lines = this.store.selectSignal(cartFeature.selectLineViews);
  protected readonly summary = this.store.selectSignal(cartFeature.selectSummary);
  private readonly block = this.store.selectSignal(checkoutFeature.selectBlock);

  protected readonly isSubmitting = computed(() => this.step() === CheckoutStep.Submitting);
  protected readonly canPlace = computed(() => this.block() === null);
  protected readonly blockHint = computed(() => this.getBlockHint(this.block()));
  protected readonly receiptCount = computed(() =>
    (this.order()?.lines ?? []).reduce((sum, { quantity }) => sum + quantity, 0)
  );
  private readonly hero = computed(() => CHECKOUT_HEROES[this.step()]);
  protected readonly heroTone = computed(() => this.hero().tone);
  protected readonly errorText = computed(
    () => CHECKOUT_ERRORS[this.errorKind() ?? CheckoutErrorKind.Server]
  );
  protected readonly heroIcon = computed(() => this.getHeroIcon(this.hero(), this.errorKind()));
  protected readonly title = computed(() => this.getTitle(this.step(), this.order()?.number));

  constructor() {
    this.ref.closed$.pipe(take(1)).subscribe(() => this.store.dispatch(checkoutActions.closed()));
  }

  protected place(): void {
    this.store.dispatch(checkoutActions.placeOrder());
  }

  protected close(): void {
    if (!this.isSubmitting()) {
      this.ref.close(this.step() === CheckoutStep.Success);
    }
  }

  protected trackOrder(): void {
    this.ref.close(true);
    void this.router.navigateByUrl(MY_ORDERS_URL);
  }

  private getTitle(step: CheckoutStep, orderNumber: number | undefined): string {
    return step === CheckoutStep.Success && orderNumber !== undefined
      ? `Order #${orderNumber} placed`
      : CHECKOUT_HEROES[step].title;
  }

  private getHeroIcon(hero: CheckoutHero, errorKind: CheckoutErrorKind | null): string {
    return errorKind === CheckoutErrorKind.Connection ? CHECKOUT_CONNECTION_ICON : hero.icon;
  }

  private getBlockHint(block: CheckoutBlock | null): string | null {
    return block ? CHECKOUT_BLOCK_HINTS[block] : null;
  }
}
